import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { db, stripeWebhookEventsTable } from '@workspace/db';
import { api } from './helpers.js';

const SECRET = 'whsec_test_secret_for_idempotency';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const eventId = `evt_test_${randomUUID()}`;
afterAll(async () => {
  await db.delete(stripeWebhookEventsTable).where(eq(stripeWebhookEventsTable.id, eventId));
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
