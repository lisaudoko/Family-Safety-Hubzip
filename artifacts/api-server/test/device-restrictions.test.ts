import { describe, it, expect, afterAll } from 'vitest';
import { api, Cleanup, createParentWithFamily, registerDevice } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('device restrictions', () => {
  it('GET returns null restrictions before any are set, then PATCH creates and updates them', async () => {
    const parent = await createParentWithFamily(cleanup, 'dr-1');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const getRes = await api
      .get(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.restrictions).toBeNull();

    const patchRes = await api
      .patch(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 120, blockSafari: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.restrictions).toMatchObject({
      deviceId,
      screenTimeLimitMinutes: 120,
      blockSafari: true,
      requireParentApproval: false,
    });

    const patchRes2 = await api
      .patch(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bedtimeStart: '21:00', bedtimeEnd: '07:00' });
    expect(patchRes2.status).toBe(200);
    expect(patchRes2.body.restrictions).toMatchObject({
      screenTimeLimitMinutes: 120,
      blockSafari: true,
      bedtimeStart: '21:00',
      bedtimeEnd: '07:00',
    });
  });

  it('rejects a malformed PATCH body (400)', async () => {
    const parent = await createParentWithFamily(cleanup, 'dr-2');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const res = await api
      .patch(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ blockSafari: 'yes' });
    expect(res.status).toBe(400);
  });

  it("family A's parent gets 404 on GET/PATCH of family B's device restrictions", async () => {
    const parentA = await createParentWithFamily(cleanup, 'dr-A');
    const parentB = await createParentWithFamily(cleanup, 'dr-B');
    const { deviceId } = await registerDevice(parentB.token, { capabilities: [] });

    const getRes = await api
      .get(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(getRes.status).toBe(404);

    const patchRes = await api
      .patch(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ blockSafari: true });
    expect(patchRes.status).toBe(404);
  });
});
