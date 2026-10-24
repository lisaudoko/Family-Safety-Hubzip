import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '@workspace/db';
import { profilesTable, subscriptionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { stripe, STRIPE_PRICE_IDS, type BillingPlan } from '../lib/stripe.js';

const router = Router();

async function setFamilyTier(familyId: string, tier: 'free' | 'premium') {
  await db
    .update(profilesTable)
    .set({ subscription_tier: tier, updated_at: new Date() })
    .where(eq(profilesTable.family_id, familyId));
}

async function getOrCreateStripeCustomer(familyId: string, email: string | null): Promise<string> {
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
router.post('/billing/checkout-session', requireAuth as any, requireParent, async (req: AuthRequest, res, next) => {
  try {
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

    const scheme = process.env.MOBILE_APP_SCHEME ?? 'mobile';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${scheme}://subscription/success`,
      cancel_url: `${scheme}://subscription`,
      metadata: { familyId: req.familyId, plan },
      subscription_data: { metadata: { familyId: req.familyId, plan } },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal-session
router.post('/billing/portal-session', requireAuth as any, requireParent, async (req: AuthRequest, res, next) => {
  try {
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

    const scheme = process.env.MOBILE_APP_SCHEME ?? 'mobile';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${scheme}://profile`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook — mounted with a raw body parser in app.ts, ahead of express.json().
export async function billingWebhookHandler(req: AuthRequest, res: any, next: any) {
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const familyId = session.metadata?.familyId;
        const plan = session.metadata?.plan as BillingPlan | undefined;
        if (!familyId || typeof session.subscription !== 'string') break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const item = subscription.items.data[0];

        await db
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
          })
          .onConflictDoUpdate({
            target: subscriptionsTable.family_id,
            set: {
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
          });

        await setFamilyTier(familyId, 'premium');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const familyId = subscription.metadata?.familyId;
        if (!familyId) break;
        const item = subscription.items.data[0];

        await db
          .update(subscriptionsTable)
          .set({
            stripe_subscription_id: subscription.id,
            stripe_price_id: item?.price.id ?? null,
            status: subscription.status,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date(),
          })
          .where(eq(subscriptionsTable.family_id, familyId));

        const stillActive = subscription.status === 'active' || subscription.status === 'trialing';
        await setFamilyTier(familyId, stillActive ? 'premium' : 'free');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const familyId = subscription.metadata?.familyId;
        if (!familyId) break;

        await db
          .update(subscriptionsTable)
          .set({ status: 'canceled', updated_at: new Date() })
          .where(eq(subscriptionsTable.family_id, familyId));

        await setFamilyTier(familyId, 'free');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await db
          .update(subscriptionsTable)
          .set({ status: 'past_due', updated_at: new Date() })
          .where(eq(subscriptionsTable.stripe_customer_id, customerId));
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export default router;
