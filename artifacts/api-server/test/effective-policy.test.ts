import { describe, it, expect, afterAll } from 'vitest';
import { api, Cleanup, createParentWithFamily, addChildAndLogin, registerDevice } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('effective policy', () => {
  it('defaults to all-null/false when no policy layer has anything set', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-1');
    const child = await addChildAndLogin(cleanup, parent, 'ep-1-child');

    const res = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.policy).toMatchObject({
      screenTimeLimitMinutes: { value: null, source: 'default' },
      bedtimeStart: { value: null, source: 'default' },
      bedtimeEnd: { value: null, source: 'default' },
      blockNewAppInstalls: { value: false, sources: [] },
      blockSafari: { value: false, sources: [] },
      blockExplicitContent: { value: false, sources: [] },
      requireParentApproval: { value: false, sources: [] },
    });
  });

  it('a family policy value is inherited by a child with no policy of their own', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-2');
    const child = await addChildAndLogin(cleanup, parent, 'ep-2-child');

    await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 90, blockSafari: true });

    const res = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.policy.screenTimeLimitMinutes).toEqual({ value: 90, source: 'family' });
    expect(res.body.policy.blockSafari).toEqual({ value: true, sources: ['family'] });
  });

  it('a child-level nullable field overrides the family default; an unset child field falls back to family', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-3');
    const child = await addChildAndLogin(cleanup, parent, 'ep-3-child');

    await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 90, bedtimeStart: '21:00' });

    await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 45 });

    const res = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    // Child explicitly overrides the limit...
    expect(res.body.policy.screenTimeLimitMinutes).toEqual({ value: 45, source: 'child' });
    // ...but never touched bedtime, so it falls through to the family value.
    expect(res.body.policy.bedtimeStart).toEqual({ value: '21:00', source: 'family' });
  });

  it('boolean flags are OR-combined across layers, not overridden by an untouched default-false row', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-4');
    const child = await addChildAndLogin(cleanup, parent, 'ep-4-child');

    await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ blockSafari: true });

    // Child row now exists (created by this PATCH) but never explicitly
    // touches blockSafari - its column defaults to false. That must not
    // suppress the family-level true.
    await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ requireParentApproval: true });

    const res = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.policy.blockSafari).toEqual({ value: true, sources: ['family'] });
    expect(res.body.policy.requireParentApproval).toEqual({ value: true, sources: ['child'] });
  });

  it('device layer only applies when ?deviceId= is passed, and wins over child/family for nullable fields', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-5');
    const child = await addChildAndLogin(cleanup, parent, 'ep-5-child');
    const { deviceId } = await registerDevice(child.token, { capabilities: [] });

    await api
      .patch('/api/family/policy')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 90 });
    await api
      .patch(`/api/family/children/${child.childId}/policy`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 60 });
    await api
      .patch(`/api/devices/${deviceId}/restrictions`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ screenTimeLimitMinutes: 30 });

    const withoutDevice = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(withoutDevice.body.policy.screenTimeLimitMinutes).toEqual({ value: 60, source: 'child' });

    const withDevice = await api
      .get(`/api/family/children/${child.childId}/effective-policy?deviceId=${deviceId}`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(withDevice.body.policy.screenTimeLimitMinutes).toEqual({ value: 30, source: 'device' });
  });

  it("family A's parent gets 404 for family B's child", async () => {
    const parentA = await createParentWithFamily(cleanup, 'ep-A');
    const parentB = await createParentWithFamily(cleanup, 'ep-B');
    const childB = await addChildAndLogin(cleanup, parentB, 'ep-B-child');

    const res = await api
      .get(`/api/family/children/${childB.childId}/effective-policy`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(404);
  });

  it('404s when ?deviceId= belongs to a different child', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-6');
    const childA = await addChildAndLogin(cleanup, parent, 'ep-6-child-a');
    const childB = await addChildAndLogin(cleanup, parent, 'ep-6-child-b');
    const { deviceId } = await registerDevice(childB.token, { capabilities: [] });

    const res = await api
      .get(`/api/family/children/${childA.childId}/effective-policy?deviceId=${deviceId}`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(404);
  });

  it('a child session gets 403 (parent-only)', async () => {
    const parent = await createParentWithFamily(cleanup, 'ep-7');
    const child = await addChildAndLogin(cleanup, parent, 'ep-7-child');

    const res = await api
      .get(`/api/family/children/${child.childId}/effective-policy`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});
