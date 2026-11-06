import { Router } from 'express';
import { randomUUID, timingSafeEqual } from 'crypto';
import { db } from '@workspace/db';
import { profilesTable, subscriptionsTable, stripeWebhookEventsTable } from '@workspace/db';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import type Stripe from 'stripe';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { stripe, STRIPE_PRICE_IDS, type BillingPlan } from '../lib/stripe.js';
import { logAuditEvent } from '../lib/audit.js';
import { fetchPremiumEntitlement, isRevenueCatConfigured } from '../lib/revenuecat.js';

const router = Router();

async function setFamilyTier(familyId: string, tier: 'free' | 'premium') {
  await db
    .update(profilesTable)
    .set({ subscription_tier: tier, updated_at: new Date() })
    .where(eq(profilesTable.family_id, familyId));
}

// Premium if EITHER billing source is active: an App Store/Play subscription
// (RevenueCat) or a Stripe subscription. RevenueCat is asked directly, so the
// client can never assert its own entitlement. If RevenueCat can't be reached
// the tier is left unchanged.
async function syncFamilyTierFromBilling(familyId: string): Promise<boolean | null> {
  const rcPremium = await fetchPremiumEntitlement(familyId);
  if (rcPremium === null) return null;

  const [stripeSub] = await db
    .select({ status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.family_id, familyId))
    .limit(1);
  const stripeActive = stripeSub?.status === 'active' || stripeSub?.status === 'trialing';

  const premium = rcPremium || stripeActive;
  await setFamilyTier(familyId, premium ? 'premium' : 'free');
  return premium;
}

// A Stripe subscription ended/lapsed. Only drop to free if there is no active
// App Store/Play entitlement either. If RevenueCat is configured but unreachable
// we throw so Stripe retries the event instead of wrongly downgrading.
async function downgradeAfterStripeEnds(familyId: string): Promise<void> {
  if (isRevenueCatConfigured()) {
    const result = await syncFamilyTierFromBilling(familyId);
    if (result === null) throw new Error('RevenueCat unavailable; retry webhook');
    return;
  }
  await setFamilyTier(familyId, 'free');
}

async function getOrCreateStripeCustomer(familyId: string, email: string | null): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');
  const [existing] = await db
    .select({ stripe_customer_id: subscriptionsTable.stripe_customer_id })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.family_id, familyId))
    .limit(1);

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { familyId },
  });

  await db
    .insert(subscriptionsTable)
    .values({ id: randomUUID(), family_id: familyId, stripe_customer_id: customer.id })
    .onConflictDoUpdate({
      target: subscriptionsTable.family_id,
      set: { stripe_customer_id: customer.id, updated_at: new Date() },
    });

  return customer.id;
}

// POST /api/billing/checkout-session
// POST /api/billing/sync-purchases
// Called by the app right after an in-app purchase or restore. The server
// re-verifies with RevenueCat and updates the family's tier.
router.post('/billing/sync-purchases', requireAuth as any, requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!isRevenueCatConfigured()) {
      res.status(503).json({ error: 'In-app purchases are not configured' });
      return;
    }
    const premium = await syncFamilyTierFromBilling(req.familyId!);
    if (premium === null) {
      res.status(502).json({ error: 'Could not verify purchases right now. Please try again.' });
      return;
    }
    res.json({ isPremium: premium });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/revenuecat-webhook
// Configure in RevenueCat with the Authorization header set to
// REVENUECAT_WEBHOOK_AUTH. Events are only a nudge: the payload is not trusted
// for entitlement state, we re-read it from RevenueCat (also makes ordering and
// redelivery harmless).
router.post('/billing/revenuecat-webhook', async (req, res, next) => {
  try {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
    const provided = req.headers.authorization ?? '';
    const ok =
      Boolean(expected) &&
      provided.length === expected!.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected!));
    if (!ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const appUserId = (req.body as { event?: { app_user_id?: string } })?.event?.app_user_id;
    if (!appUserId || appUserId.startsWith('$RCAnonymousID')) {
      res.json({ received: true, ignored: true });
      return;
    }

    const [family] = await db
      .select({ id: profilesTable.family_id })
      .from(profilesTable)
      .where(eq(profilesTable.family_id, appUserId))
      .limit(1);
    if (!family) {
      res.json({ received: true, ignored: true });
      return;
    }

    const premium = await syncFamilyTierFromBilling(appUserId);
    if (premium === null) {
      // Let RevenueCat retry.
      res.status(502).json({ error: 'RevenueCat lookup failed' });
      return;
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.post('/billing/checkout-session', requireAuth as any, requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) {
      res.status(503).json({ error: 'Billing is not configured' });
      return;
    }
    const { plan } = req.body as { plan?: BillingPlan };
    if (plan !== 'monthly' && plan !== 'annual') {
      res.status(400).json({ error: 'plan must be "monthly" or "annual"' });
      return;
    }
    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      res.status(500).json({ error: 'Billing is not configured' });
      return;
    }
    if (!req.familyId) {
      res.status(400).json({ error: 'Create a family before subscribing' });
      return;
    }

    const [profile] = await db
      .select({ email: profilesTable.email })
      .from(profilesTable)
      .where(eq(profilesTable.id, req.userId!))
      .limit(1);

    const customerId = await getOrCreateStripeCustomer(req.familyId, profile?.email ?? null);

    const scheme = process.env.MOBILE_APP_SCHEME ?? 'digitalvillage';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${scheme}://subscription/success`,
      cancel_url: `${scheme}://subscription`,
      metadata: { familyId: req.familyId, plan },
      subscription_data: { metadata: { familyId: req.familyId, plan } },
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'billing_checkout_started',
      metadata: { plan },
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal-session
router.post('/billing/portal-session', requireAuth as any, requireParent, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) {
      res.status(503).json({ error: 'Billing is not configured' });
      return;
    }
    if (!req.familyId) {
      res.status(404).json({ error: 'No subscription found' });
      return;
    }
    const [sub] = await db
      .select({ stripe_customer_id: subscriptionsTable.stripe_customer_id })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.family_id, req.familyId))
      .limit(1);

    if (!sub?.stripe_customer_id) {
      res.status(404).json({ error: 'No subscription found' });
      return;
    }

    const scheme = process.env.MOBILE_APP_SCHEME ?? 'digitalvillage';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${scheme}://profile`,
    });

    void logAuditEvent({
      actorId: req.userId!,
      actorRole: req.actorRole!,
      familyId: req.familyId,
      action: 'billing_portal_opened',
      ip: req.ip,
      isSupportSession: req.isSupportSession,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — mounted with a raw body parser in app.ts, ahead of express.json().
export async function billingWebhookHandler(req: AuthRequest, res: any, next: any) {
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not configured' });
    return;
  }
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    res.status(400).json({ error: 'Missing signature or webhook secret' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    req.log?.error({ err }, 'Stripe webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Idempotency: Stripe retries deliveries. Claim the event id first; a conflict
  // means it was already handled. If processing fails the claim is released so
  // Stripe's retry can run again.
  const claimed = await db
    .insert(stripeWebhookEventsTable)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEventsTable.id });
  if (claimed.length === 0) {
    res.json({ received: true, duplicate: true });
    return;
  }

  // Stripe does not guarantee delivery order. Every subscription write below is
  // conditional on this event being at least as new as the last one applied.
  const eventAt = new Date(event.created * 1000);
  const notStale = or(
    isNull(subscriptionsTable.last_stripe_event_at),
    lte(subscriptionsTable.last_stripe_event_at, eventAt),
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const familyId = session.metadata?.familyId;
        const plan = session.metadata?.plan as BillingPlan | undefined;
        if (!familyId || typeof session.subscription !== 'string') break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const item = subscription.items.data[0];

        const applied = await db
          .insert(subscriptionsTable)
          .values({
            id: randomUUID(),
            family_id: familyId,
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: subscription.id,
            stripe_price_id: item?.price.id ?? null,
            status: subscription.status,
            plan: plan ?? null,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            last_stripe_event_at: eventAt,
          })
          .onConflictDoUpdate({
            target: subscriptionsTable.family_id,
            setWhere: notStale,
            set: {
              last_stripe_event_at: eventAt,
              stripe_customer_id: String(session.customer),
              stripe_subscription_id: subscription.id,
              stripe_price_id: item?.price.id ?? null,
              status: subscription.status,
              plan: plan ?? null,
              current_period_end: item?.current_period_end
                ? new Date(item.current_period_end * 1000)
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date(),
            },
          })
          .returning({ id: subscriptionsTable.id });

        // (the upsert above is skipped when a newer event already ran)
        if (applied.length > 0) await setFamilyTier(familyId, 'premium');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const familyId = subscription.metadata?.familyId;
        if (!familyId) break;
        const item = subscription.items.data[0];

        const applied = await db
          .update(subscriptionsTable)
          .set({
            last_stripe_event_at: eventAt,
            stripe_subscription_id: subscription.id,
            stripe_price_id: item?.price.id ?? null,
            status: subscription.status,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date(),
          })
          .where(and(eq(subscriptionsTable.family_id, familyId), notStale))
          .returning({ id: subscriptionsTable.id });
        if (applied.length === 0) break; // stale or unknown family

        const stillActive = subscription.status === 'active' || subscription.status === 'trialing';
        if (stillActive) await setFamilyTier(familyId, 'premium');
        else await downgradeAfterStripeEnds(familyId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const familyId = subscription.metadata?.familyId;
        if (!familyId) break;

        const applied = await db
          .update(subscriptionsTable)
          .set({ status: 'canceled', last_stripe_event_at: eventAt, updated_at: new Date() })
          .where(and(eq(subscriptionsTable.family_id, familyId), notStale))
          .returning({ id: subscriptionsTable.id });
        if (applied.length === 0) break; // stale or unknown family

        await downgradeAfterStripeEnds(familyId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await db
          .update(subscriptionsTable)
          .set({ status: 'past_due', last_stripe_event_at: eventAt, updated_at: new Date() })
          .where(and(eq(subscriptionsTable.stripe_customer_id, customerId), notStale));
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    await db
      .delete(stripeWebhookEventsTable)
      .where(eq(stripeWebhookEventsTable.id, event.id))
      .catch(() => undefined);
    next(err);
  }
}

export default router;
