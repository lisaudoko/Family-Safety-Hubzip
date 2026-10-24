import { describe, it, expect, afterAll } from 'vitest';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('family policy', () => {
  it('GET returns null policy before any is set, then PATCH creates and updates it', async () => {
    const parent = await createParentWithFamily(cleanup, 'fp-1');

    const getRes = await api
      .get('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.policy).toBeNull();

    const patchRes = await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 90, blockSafari: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.policy).toMatchObject({
      familyId: parent.familyId,
      screenTimeLimitMinutes: 90,
      blockSafari: true,
      requireParentApproval: false,
    });

    const patchRes2 = await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bedtimeStart: '20:30', bedtimeEnd: '06:30' });
    expect(patchRes2.status).toBe(200);
    expect(patchRes2.body.policy).toMatchObject({
      screenTimeLimitMinutes: 90,
      blockSafari: true,
      bedtimeStart: '20:30',
      bedtimeEnd: '06:30',
    });
  });

  it('rejects a malformed PATCH body (400)', async () => {
    const parent = await createParentWithFamily(cleanup, 'fp-2');

    const res = await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ blockSafari: 'yes' });
    expect(res.status).toBe(400);
  });

  it('a child session gets 403 on GET/PATCH of the family policy (parent-only)', async () => {
    const parent = await createParentWithFamily(cleanup, 'fp-3');
    const child = await addChildAndLogin(cleanup, parent, 'fp-3-child');

    const getRes = await api
      .get('/api/family/policy')
      .set('Authorization', `Bearer ${child.token}`);
    expect(getRes.status).toBe(403);

    const patchRes = await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${child.token}`)
      .send({ blockSafari: true });
    expect(patchRes.status).toBe(403);
  });
});
