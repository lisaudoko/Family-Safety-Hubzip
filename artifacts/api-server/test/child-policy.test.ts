import { describe, it, expect, afterAll } from 'vitest';
import { api, Cleanup, createParentWithFamily, addChildAndLogin } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('child policy', () => {
  it('GET returns null policy before any is set, then PATCH creates and updates it', async () => {
    const parent = await createParentWithFamily(cleanup, 'cp-1');
    const child = await addChildAndLogin(cleanup, parent, 'cp-1-child');

    const getRes = await api
      .get(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.policy).toBeNull();

    const patchRes = await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 60, requireParentApproval: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.policy).toMatchObject({
      childId: child.childId,
      familyId: parent.familyId,
      screenTimeLimitMinutes: 60,
      requireParentApproval: true,
    });

    const patchRes2 = await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bedtimeStart: '19:00', bedtimeEnd: '07:00' });
    expect(patchRes2.status).toBe(200);
    expect(patchRes2.body.policy).toMatchObject({
      screenTimeLimitMinutes: 60,
      requireParentApproval: true,
      bedtimeStart: '19:00',
      bedtimeEnd: '07:00',
    });
  });

  it('rejects a malformed PATCH body (400)', async () => {
    const parent = await createParentWithFamily(cleanup, 'cp-2');
    const child = await addChildAndLogin(cleanup, parent, 'cp-2-child');

    const res = await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ requireParentApproval: 'yes' });
    expect(res.status).toBe(400);
  });

  it("family A's parent gets 404 on GET/PATCH of family B's child policy", async () => {
    const parentA = await createParentWithFamily(cleanup, 'cp-A');
    const parentB = await createParentWithFamily(cleanup, 'cp-B');
    const childB = await addChildAndLogin(cleanup, parentB, 'cp-B-child');

    const getRes = await api
      .get(`/api/family/children/${childB.childId}/policy`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(getRes.status).toBe(404);

    const patchRes = await api
      .patch(`/api/family/children/${childB.childId}/policy`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ requireParentApproval: true });
    expect(patchRes.status).toBe(404);
  });

  it('a child session gets 403 on GET/PATCH of its own child policy (parent-only)', async () => {
    const parent = await createParentWithFamily(cleanup, 'cp-3');
    const child = await addChildAndLogin(cleanup, parent, 'cp-3-child');

    const getRes = await api
      .get(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(getRes.status).toBe(403);

    const patchRes = await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${child.token}`)
      .send({ requireParentApproval: true });
    expect(patchRes.status).toBe(403);
  });
});
