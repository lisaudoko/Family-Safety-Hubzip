import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { db, stripeWebhookEventsTable, subscriptionsTable } from '@workspace/db';
import { api, Cleanup, createParentWithFamily } from './helpers.js';

const cleanup = new Cleanup();

const SECRET = 'whsec_test_secret_for_idempotency';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const eventId = `evt_test_${randomUUID()}`;
const extraEventIds: string[] = [];
afterAll(async () => {
  await db.delete(stripeWebhookEventsTable).where(eq(stripeWebhookEventsTable.id, eventId));
  for (const id of extraEventIds) {
    await db.delete(stripeWebhookEventsTable).where(eq(stripeWebhookEventsTable.id, id));
  }
  await cleanup.run();
});

function signed(payload: string) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
}

describe('POST /api/billing/webhook idempotency', () => {
  it('processes an event once and reports redelivery as a duplicate', async () => {
    // invoice.payment_failed for an unknown customer is a handled no-op, so the
    // test needs no Stripe API access.
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_test', object: 'invoice', customer: `cus_${randomUUID()}` } },
    });

    const first = await api
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signed(payload))
      .send(payload);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeUndefined();

    const second = await api
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signed(payload))
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
  });

  it('rejects a bad signature', async () => {
    const res = await api
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=bad')
      .send('{}');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/billing/webhook ordering', () => {
  it('ignores a subscription event older than one already applied', async () => {
    const parent = await createParentWithFamily(cleanup, 'stripe-order');
    await db.insert(subscriptionsTable).values({
      id: randomUUID(),
      family_id: parent.familyId,
      stripe_customer_id: `cus_${randomUUID()}`,
      status: 'active',
    });

    const send = async (created: number, status: string) => {
      const id = `evt_test_${randomUUID()}`;
      extraEventIds.push(id);
      const payload = JSON.stringify({
        id,
        object: 'event',
        type: 'customer.subscription.updated',
        created,
        data: {
          object: {
            id: 'sub_test',
            object: 'subscription',
            status,
            cancel_at_period_end: false,
            metadata: { familyId: parent.familyId },
            items: { data: [] },
          },
        },
      });
      return api
        .post('/api/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signed(payload))
        .send(payload);
    };

    const now = Math.floor(Date.now() / 1000);
    expect((await send(now, 'past_due')).status).toBe(200); // newer event arrives first
    expect((await send(now - 100, 'active')).status).toBe(200); // older one arrives late

    const [row] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.family_id, parent.familyId));
    expect(row.status).toBe('past_due');
  });
});
