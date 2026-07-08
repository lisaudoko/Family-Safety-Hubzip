import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { api, Cleanup, createParentWithFamily, addChildAndLogin, registerDevice, isoDaysAgo } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

async function postEvent(
  token: string,
  deviceId: string,
  eventType: string,
  payload: Record<string, unknown>,
  occurredAt?: string,
) {
  const res = await api
    .post(`/api/devices/${deviceId}/events`)
    .set('Authorization', `Bearer ${token}`)
    .send({ id: randomUUID(), eventType, payload, occurredAt });
  if (res.status !== 201) {
    throw new Error(`postEvent failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

describe('GET /api/dashboard/overview', () => {
  it('returns correct shape and numbers for the family', async () => {
    const parent = await createParentWithFamily(cleanup, 'dash-overview');
    const child = await addChildAndLogin(cleanup, parent, 'dash-overview-kid');
    const { deviceId } = await registerDevice(child.token, {
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });

    await postEvent(child.token, deviceId, 'screen_time', { durationSeconds: 300 }, isoDaysAgo(1));
    await postEvent(child.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(1));
    await postEvent(child.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(2));

    const res = await api
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.children.length).toBe(1);
    const c = res.body.children[0];
    expect(c.id).toBe(child.childId);
    expect(c.devices.length).toBe(1);
    expect(c.devices[0].id).toBe(deviceId);
    expect(c.recentActivity).toMatchObject({
      windowDays: 7,
      screenTimeSeconds: 300,
      activityCount: 2,
    });
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'dash-overview-child');
    const child = await addChildAndLogin(cleanup, parent, 'dash-overview-child-kid');

    const res = await api
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/dashboard/children/:childId', () => {
  it('returns per-child detail with correct byDay/byType breakdowns', async () => {
    const parent = await createParentWithFamily(cleanup, 'dash-detail');
    const child = await addChildAndLogin(cleanup, parent, 'dash-detail-kid');
    const { deviceId } = await registerDevice(child.token, {
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });

    await postEvent(child.token, deviceId, 'screen_time', { durationSeconds: 100 }, isoDaysAgo(1));
    await postEvent(child.token, deviceId, 'screen_time', { durationSeconds: 50 }, isoDaysAgo(1));
    await postEvent(child.token, deviceId, 'activity', { activityType: 'chores' }, isoDaysAgo(1));

    const res = await api
      .get(`/api/dashboard/children/${child.childId}`)
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.child).toMatchObject({ id: child.childId });
    expect(res.body.devices.length).toBe(1);

    const totalSeconds = res.body.screenTime.byDay.reduce((s: number, d: any) => s + d.seconds, 0);
    expect(totalSeconds).toBe(150);

    const chores = res.body.activity.byType.find((a: any) => a.type === 'chores');
    expect(chores).toMatchObject({ type: 'chores', count: 1 });
  });

  it('returns 404 for a child id belonging to another family', async () => {
    const parentA = await createParentWithFamily(cleanup, 'dash-crossA');
    const parentB = await createParentWithFamily(cleanup, 'dash-crossB');
    const childB = await addChildAndLogin(cleanup, parentB, 'dash-crossB-kid');

    const res = await api
      .get(`/api/dashboard/children/${childB.childId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'dash-detail-child');
    const child = await addChildAndLogin(cleanup, parent, 'dash-detail-child-kid');

    const res = await api
      .get(`/api/dashboard/children/${child.childId}`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});
