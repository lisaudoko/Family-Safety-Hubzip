import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.REVENUECAT_SECRET_API_KEY;
  delete process.env.REVENUECAT_WEBHOOK_AUTH;
});

function stubRevenueCat(entitlement: { expires_date: string | null } | null, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ subscriber: { entitlements: entitlement ? { premium: entitlement } : {} } }),
    })),
  );
}

const isPremium = async (token: string) =>
  (await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).body.user.isPremium;

describe('POST /api/billing/sync-purchases', () => {
  it('503s when RevenueCat is not configured and rejects child sessions', async () => {
    const parent = await createParentWithFamily(cleanup, 'rc-unconf');
    const child = await addChildAndLogin(cleanup, parent);

    const unconfigured = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(unconfigured.status).toBe(503);

    const asChild = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${child.token}`);
    expect(asChild.status).toBe(403);
    expect((await api.post('/api/billing/sync-purchases')).status).toBe(401);
  });

  it('unlocks premium only when RevenueCat reports an active entitlement', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test_rc';
    const parent = await createParentWithFamily(cleanup, 'rc-sync');
    expect(await isPremium(parent.token)).toBe(false);

    stubRevenueCat(null);
    const none = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(none.body.isPremium).toBe(false);

    stubRevenueCat({ expires_date: new Date(Date.now() + 86_400_000).toISOString() });
    const active = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(active.status).toBe(200);
    expect(active.body.isPremium).toBe(true);
    expect(await isPremium(parent.token)).toBe(true);

    stubRevenueCat({ expires_date: new Date(Date.now() - 1000).toISOString() });
    const expired = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(expired.body.isPremium).toBe(false);
    expect(await isPremium(parent.token)).toBe(false);
  });

  it('502s and leaves the tier unchanged when RevenueCat errors', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test_rc';
    const parent = await createParentWithFamily(cleanup, 'rc-outage');
    stubRevenueCat({ expires_date: null });
    await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(await isPremium(parent.token)).toBe(true);

    stubRevenueCat(null, 500);
    const res = await api.post('/api/billing/sync-purchases').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(502);
    expect(await isPremium(parent.token)).toBe(true);
  });
});

describe('POST /api/billing/revenuecat-webhook', () => {
  it('rejects requests without the shared secret', async () => {
    process.env.REVENUECAT_WEBHOOK_AUTH = 'Bearer rc_hook_secret';
    const body = { event: { app_user_id: 'x', type: 'INITIAL_PURCHASE' } };
    expect((await api.post('/api/billing/revenuecat-webhook').send(body)).status).toBe(401);
    expect(
      (await api.post('/api/billing/revenuecat-webhook').set('Authorization', 'Bearer wrong').send(body)).status,
    ).toBe(401);
  });

  it('401s everything when no secret is configured', async () => {
    const res = await api.post('/api/billing/revenuecat-webhook').set('Authorization', '').send({});
    expect(res.status).toBe(401);
  });

  it('re-syncs the family named by app_user_id and ignores unknown users', async () => {
    process.env.REVENUECAT_WEBHOOK_AUTH = 'Bearer rc_hook_secret';
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test_rc';
    const parent = await createParentWithFamily(cleanup, 'rc-hook');
    stubRevenueCat({ expires_date: null });

    const ok = await api
      .post('/api/billing/revenuecat-webhook')
      .set('Authorization', 'Bearer rc_hook_secret')
      .send({ event: { app_user_id: parent.familyId, type: 'INITIAL_PURCHASE' } });
    expect(ok.status).toBe(200);
    expect(await isPremium(parent.token)).toBe(true);

    const unknown = await api
      .post('/api/billing/revenuecat-webhook')
      .set('Authorization', 'Bearer rc_hook_secret')
      .send({ event: { app_user_id: 'no-such-family', type: 'INITIAL_PURCHASE' } });
    expect(unknown.body.ignored).toBe(true);
  });
});
