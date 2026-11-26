import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, screenShareRequestsTable } from '@workspace/db';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => {
  vi.unstubAllGlobals();
  return cleanup.run();
});

const LIVEKIT = {
  LIVEKIT_URL: 'wss://digital-village-test.livekit.cloud',
  LIVEKIT_API_KEY: 'APItestkey',
  LIVEKIT_API_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing-000000',
};

beforeEach(() => {
  Object.assign(process.env, LIVEKIT);
  // Expo push + LiveKit room cleanup both go through fetch; never hit the network.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }), text: async () => '{}' })),
  );
});

function videoGrant(jwt: string): Record<string, unknown> {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString('utf8'));
  return payload.video;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function family(label: string) {
  const parent = await createParentWithFamily(cleanup, label);
  const child = await addChildAndLogin(cleanup, parent, `${label}-kid`);
  return { parent, child };
}

describe('screen share: request -> accept -> view -> end', () => {
  it('runs the full consent flow with publish-only and watch-only tokens', async () => {
    const { parent, child } = await family('ss-flow');

    const created = await api.post('/api/screen-share/requests').set(auth(parent.token)).send({ childId: child.childId });
    expect(created.status).toBe(201);
    const id = created.body.request.id as string;
    expect(created.body.request.status).toBe('requested');

    // The child can see the pending request.
    const active = await api.get('/api/screen-share/active').set(auth(child.token));
    expect(active.body.requests.map((r: { id: string }) => r.id)).toContain(id);

    // Nothing to watch until the child accepts.
    const early = await api.post(`/api/screen-share/requests/${id}/viewer-token`).set(auth(parent.token));
    expect(early.status).toBe(409);

    const accepted = await api.post(`/api/screen-share/requests/${id}/accept`).set(auth(child.token));
    expect(accepted.status).toBe(200);
    expect(accepted.body.livekit.url).toBe(LIVEKIT.LIVEKIT_URL);
    const childGrant = videoGrant(accepted.body.livekit.token);
    expect(childGrant.room).toBe(`screen_${id}`);
    expect(childGrant.canPublish).toBe(true);
    expect(childGrant.canSubscribe).toBe(false);
    expect(childGrant.canPublishSources).toEqual(['screen_share']);

    const viewer = await api.post(`/api/screen-share/requests/${id}/viewer-token`).set(auth(parent.token));
    expect(viewer.status).toBe(200);
    const parentGrant = videoGrant(viewer.body.livekit.token);
    expect(parentGrant.room).toBe(`screen_${id}`);
    expect(parentGrant.canPublish).toBe(false);
    expect(parentGrant.canSubscribe).toBe(true);

    // The child can stop at any time; afterwards no new viewer token.
    const ended = await api.post(`/api/screen-share/requests/${id}/end`).set(auth(child.token));
    expect(ended.body.request.status).toBe('ended');
    const late = await api.post(`/api/screen-share/requests/${id}/viewer-token`).set(auth(parent.token));
    expect(late.status).toBe(410);
  });

  it('lets the child decline, and a declined request cannot be accepted', async () => {
    const { parent, child } = await family('ss-decline');
    const { body } = await api.post('/api/screen-share/requests').set(auth(parent.token)).send({ childId: child.childId });
    const id = body.request.id as string;

    const declined = await api.post(`/api/screen-share/requests/${id}/decline`).set(auth(child.token));
    expect(declined.body.request.status).toBe('declined');
    expect((await api.post(`/api/screen-share/requests/${id}/accept`).set(auth(child.token))).status).toBe(410);
  });

  it('expires a request the child does not answer in time', async () => {
    const { parent, child } = await family('ss-expire');
    const { body } = await api.post('/api/screen-share/requests').set(auth(parent.token)).send({ childId: child.childId });
    const id = body.request.id as string;
    await db
      .update(screenShareRequestsTable)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(screenShareRequestsTable.id, id));

    expect((await api.post(`/api/screen-share/requests/${id}/accept`).set(auth(child.token))).status).toBe(410);
    const status = await api.get(`/api/screen-share/requests/${id}`).set(auth(parent.token));
    expect(status.body.request.status).toBe('expired');
  });
});

describe('screen share: who can do what', () => {
  it('only a parent can request, only for their own child', async () => {
    const a = await family('ss-auth-a');
    const b = await family('ss-auth-b');

    const childRequests = await api.post('/api/screen-share/requests').set(auth(a.child.token)).send({ childId: a.child.childId });
    expect(childRequests.status).toBe(403);

    const otherFamily = await api.post('/api/screen-share/requests').set(auth(a.parent.token)).send({ childId: b.child.childId });
    expect(otherFamily.status).toBe(404);
  });

  it("another family can't see, accept, watch or end a request", async () => {
    const a = await family('ss-iso-a');
    const b = await family('ss-iso-b');
    const { body } = await api.post('/api/screen-share/requests').set(auth(a.parent.token)).send({ childId: a.child.childId });
    const id = body.request.id as string;

    expect((await api.get(`/api/screen-share/requests/${id}`).set(auth(b.parent.token))).status).toBe(404);
    expect((await api.post(`/api/screen-share/requests/${id}/accept`).set(auth(b.child.token))).status).toBe(404);
    await api.post(`/api/screen-share/requests/${id}/accept`).set(auth(a.child.token));
    expect((await api.post(`/api/screen-share/requests/${id}/viewer-token`).set(auth(b.parent.token))).status).toBe(404);
    expect((await api.post(`/api/screen-share/requests/${id}/end`).set(auth(b.child.token))).status).toBe(404);
  });

  it('allows one open request per child and at most 5 per hour', async () => {
    const { parent, child } = await family('ss-limits');
    const request = () => api.post('/api/screen-share/requests').set(auth(parent.token)).send({ childId: child.childId });

    const first = await request();
    expect((await request()).status).toBe(409); // already open

    await api.post(`/api/screen-share/requests/${first.body.request.id}/decline`).set(auth(child.token));
    for (let i = 0; i < 4; i++) {
      const r = await request();
      expect(r.status).toBe(201);
      await api.post(`/api/screen-share/requests/${r.body.request.id}/decline`).set(auth(child.token));
    }
    expect((await request()).status).toBe(429); // 6th within the hour
  });

  it('503s when LiveKit is not configured', async () => {
    delete process.env.LIVEKIT_URL;
    const { parent, child } = await family('ss-unconfigured');
    const res = await api.post('/api/screen-share/requests').set(auth(parent.token)).send({ childId: child.childId });
    expect(res.status).toBe(503);
  });
});
