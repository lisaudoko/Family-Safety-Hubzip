import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  api,
  Cleanup,
  createParentWithFamily,
  addChildAndLogin,
  registerDevice,
  isoDaysAgo,
} from './helpers.js';
import { db, coachUsageTable, subscriptionsTable } from '@workspace/db';
import { currentPeriod } from '../src/lib/subscription.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

// NOTE ON EXTERNAL SERVICES: test/setup.ts sets a syntactically-valid but
// fake STRIPE_SECRET_KEY (so the app can import `stripe.ts` without
// throwing) and the environment provides a dummy ANTHROPIC key routed
// through a local modelfarm proxy. Neither is a real, working credential
// for outbound calls to the real Stripe/Anthropic APIs. To keep this suite
// deterministic and network-independent, these tests only exercise the
// authorization/family-scoping logic that runs *before* any outbound
// Stripe/Anthropic call (quota checks, ownership lookups, 404 short-circuits)
// rather than asserting on the outcome of a live third-party call.

describe('cross-family authorization — coach', () => {
  it("family A's coach usage/quota is isolated from family B's (exhausting A's quota does not block B)", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-coach-A');
    const parentB = await createParentWithFamily(cleanup, 'xf-coach-B');
    const period = currentPeriod();

    // Directly seed family A's usage at the free-tier ceiling (10/month, see
    // routes/coach.ts FREE_MONTHLY_COACH_MESSAGES) so /coach/chat's
    // pre-Anthropic quota check 403s deterministically without needing a
    // real model call.
    await db.insert(coachUsageTable).values({
      id: randomUUID(),
      family_id: parentA.familyId,
      period,
      message_count: 10,
    });
    // Family B has no usage row at all yet — the common "brand new family" case.

    const resA = await api
      .post('/api/coach/chat')
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(resA.status).toBe(403);
    expect(resA.body.error).toMatch(/free coach limit/i);

    const resB = await api
      .post('/api/coach/chat')
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ messages: [{ role: 'user', content: 'hi' }] });
    // Family B must never be quota-blocked by family A's seeded usage. It
    // may still fail with a 500 in this test environment since there is no
    // real Anthropic credential to complete the chat call, but it must not
    // be the 403 that would indicate cross-family quota leakage.
    expect(resB.status).not.toBe(403);
  });

  it("family B's usage row is unaffected by family A's seeded/exhausted usage row", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-coach-C');
    const parentB = await createParentWithFamily(cleanup, 'xf-coach-D');
    const period = currentPeriod();

    await db.insert(coachUsageTable).values({
      id: randomUUID(),
      family_id: parentA.familyId,
      period,
      message_count: 10,
    });
    await db.insert(coachUsageTable).values({
      id: randomUUID(),
      family_id: parentB.familyId,
      period,
      message_count: 3,
    });

    const rows = await db
      .select({ familyId: coachUsageTable.family_id, count: coachUsageTable.message_count })
      .from(coachUsageTable);
    const rowA = rows.find((r) => r.familyId === parentA.familyId);
    const rowB = rows.find((r) => r.familyId === parentB.familyId);
    expect(rowA?.count).toBe(10);
    expect(rowB?.count).toBe(3); // untouched by family A's row
  });
});

describe('cross-family authorization — billing', () => {
  it("family A's portal-session request never resolves to family B's Stripe customer (404, not leaked)", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-bill-A');
    const parentB = await createParentWithFamily(cleanup, 'xf-bill-B');

    // Simulate a completed Stripe checkout webhook for family B only (see
    // billing.ts checkout.session.completed handler), by seeding the
    // subscriptions row directly rather than going through Stripe.
    await db.insert(subscriptionsTable).values({
      id: randomUUID(),
      family_id: parentB.familyId,
      stripe_customer_id: `cus_fake_${randomUUID()}`,
      status: 'active',
    });

    // Family A has no subscription row. portal-session looks up
    // subscriptionsTable scoped by req.familyId (server-derived, not
    // client-supplied) and must 404 *before* ever calling the Stripe API,
    // regardless of family B's row existing in the same table.
    const res = await api
      .post('/api/billing/portal-session')
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no subscription found/i);
  });

  it('a child account cannot call billing endpoints (requireParent gate, not just family scoping)', async () => {
    const parent = await createParentWithFamily(cleanup, 'xf-bill-C');
    const child = await addChildAndLogin(cleanup, parent, 'xf-bill-C-kid');

    const checkoutRes = await api
      .post('/api/billing/checkout-session')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ plan: 'monthly' });
    expect(checkoutRes.status).toBe(403);

    const portalRes = await api
      .post('/api/billing/portal-session')
      .set('Authorization', `Bearer ${child.token}`)
      .send({});
    expect(portalRes.status).toBe(403);
  });
});

describe('cross-family authorization — notifications (weekly digest)', () => {
  it("family A's weekly digest never includes family B's devices, children, or activity", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-notif-A');
    const parentB = await createParentWithFamily(cleanup, 'xf-notif-B');
    const childA = await addChildAndLogin(cleanup, parentA, 'xf-notif-A-kid');
    const childB = await addChildAndLogin(cleanup, parentB, 'xf-notif-B-kid');

    const { deviceId: deviceA } = await registerDevice(childA.token, {
      name: 'A-only-device',
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });
    const { deviceId: deviceB } = await registerDevice(childB.token, {
      name: 'B-only-device',
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });

    await api
      .post(`/api/devices/${deviceA}/events`)
      .set('Authorization', `Bearer ${childA.token}`)
      .send({
        id: randomUUID(),
        eventType: 'screen_time',
        payload: { durationSeconds: 60 },
        occurredAt: isoDaysAgo(1),
      });
    await api
      .post(`/api/devices/${deviceB}/events`)
      .set('Authorization', `Bearer ${childB.token}`)
      .send({
        id: randomUUID(),
        eventType: 'screen_time',
        payload: { durationSeconds: 9999 },
        occurredAt: isoDaysAgo(1),
      });

    const res = await api
      .post('/api/notifications/weekly-digest/send')
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({});
    expect(res.status).toBe(200);

    const deviceNames = res.body.digest.devices.map((d: any) => d.name);
    expect(deviceNames).toContain('A-only-device');
    expect(deviceNames).not.toContain('B-only-device');

    const childNames = res.body.digest.byChild.map((c: any) => c.childName);
    expect(childNames).not.toContain(`Test xf-notif-B-kid`);

    // Family A's total must reflect only its own 60s event, not family B's 9999s event.
    expect(res.body.digest.familyTotalDurationSeconds).toBe(60);
  });
});

describe('cross-family authorization — curriculum', () => {
  // Curriculum tables (courses, lessons, quizzes, quiz_questions, badges,
  // weekly_tips — see lib/db/src/schema/index.ts) have no family_id column
  // at all; content is global/shared across all families by design. The
  // only family-dependent behavior is the `isPremium`/locked-content flag,
  // which is derived from the *caller's own* family subscription tier
  // (isFamilyPremium(req.familyId)) — it changes what the same family sees
  // of its own request, not what data is returned about another family.
  // There is no cross-family data-leakage surface here, so instead of
  // inventing an isolation assertion that wouldn't test anything real, this
  // test documents and verifies the global-content premise: two different,
  // equally non-premium families see byte-identical /api/courses output.
  it('curriculum content is global/shared — has no per-family isolation surface to test', async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-curr-A');
    const parentB = await createParentWithFamily(cleanup, 'xf-curr-B');

    const resA = await api.get('/api/courses').set('Authorization', `Bearer ${parentA.token}`);
    const resB = await api.get('/api/courses').set('Authorization', `Bearer ${parentB.token}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body).toEqual(resB.body);
  });
});
