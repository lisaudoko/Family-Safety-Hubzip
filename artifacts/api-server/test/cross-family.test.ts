import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { api, Cleanup, createParentWithFamily, addChildAndLogin, registerDevice } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('cross-family authorization', () => {
  it("family A's parent cannot fetch family B's device by id (404, not leaked via 403)", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A1');
    const parentB = await createParentWithFamily(cleanup, 'xf-B1');
    const { deviceId } = await registerDevice(parentB.token, { capabilities: [] });

    const res = await api
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    // 404 rather than 403 so callers can't distinguish "belongs to another
    // family" from "doesn't exist" by probing device ids.
    expect(res.status).toBe(404);
  });

  it("family A's parent gets 404 posting events to family B's device", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A2');
    const parentB = await createParentWithFamily(cleanup, 'xf-B2');
    const { deviceId } = await registerDevice(parentB.token, {
      capabilities: ['screen_time_reporting'],
    });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { durationSeconds: 30 } });
    expect(res.status).toBe(404);
  });

  it("family A's parent gets 404 on family B's child dashboard detail", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A3');
    const parentB = await createParentWithFamily(cleanup, 'xf-B3');
    const childB = await addChildAndLogin(cleanup, parentB, 'xf-B3-kid');

    const res = await api
      .get(`/api/dashboard/children/${childB.childId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(404);
  });

  it("family A's device-events listing never includes family B's events", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A4');
    const parentB = await createParentWithFamily(cleanup, 'xf-B4');
    const { deviceId: deviceA } = await registerDevice(parentA.token, {
      capabilities: ['screen_time_reporting'],
    });
    const { deviceId: deviceB } = await registerDevice(parentB.token, {
      capabilities: ['screen_time_reporting'],
    });

    const eventAId = randomUUID();
    const eventBId = randomUUID();
    await api
      .post(`/api/devices/${deviceA}/events`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ id: eventAId, eventType: 'screen_time', payload: { durationSeconds: 10 } });
    await api
      .post(`/api/devices/${deviceB}/events`)
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ id: eventBId, eventType: 'screen_time', payload: { durationSeconds: 20 } });

    const listA = await api
      .get('/api/devices/events')
      .set('Authorization', `Bearer ${parentA.token}`);
    const ids = listA.body.events.map((e: any) => e.id);
    expect(ids).toContain(eventAId);
    expect(ids).not.toContain(eventBId);
  });

  it("family A's parent cannot see family B's data in the overview dashboard", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A5');
    const parentB = await createParentWithFamily(cleanup, 'xf-B5');
    const childA = await addChildAndLogin(cleanup, parentA, 'xf-A5-kid');
    const childB = await addChildAndLogin(cleanup, parentB, 'xf-B5-kid');

    const res = await api
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(200);
    const ids = res.body.children.map((c: any) => c.id);
    expect(ids).toContain(childA.childId);
    expect(ids).not.toContain(childB.childId);
  });

  it("family A's parent gets 404 patching or deleting family B's device", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A6');
    const parentB = await createParentWithFamily(cleanup, 'xf-B6');
    const { deviceId } = await registerDevice(parentB.token, { capabilities: [] });

    const patchRes = await api
      .patch(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ name: 'Renamed' });
    expect(patchRes.status).toBe(404);

    const deleteRes = await api
      .delete(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(deleteRes.status).toBe(404);

    // Confirm it wasn't actually deleted.
    const check = await api
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${parentB.token}`);
    expect(check.status).toBe(200);
  });

  it("family A's parent never sees family B's data in analytics summary", async () => {
    const parentA = await createParentWithFamily(cleanup, 'xf-A7');
    const parentB = await createParentWithFamily(cleanup, 'xf-B7');
    const { deviceId: deviceA } = await registerDevice(parentA.token, {
      capabilities: ['screen_time_reporting'],
    });
    const { deviceId: deviceB } = await registerDevice(parentB.token, {
      capabilities: ['screen_time_reporting'],
    });

    await api
      .post(`/api/devices/${deviceA}/events`)
      .set('Authorization', `Bearer ${parentA.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { durationSeconds: 100 } });
    await api
      .post(`/api/devices/${deviceB}/events`)
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { durationSeconds: 9000 } });

    const res = await api
      .get('/api/analytics/screen-time')
      .set('Authorization', `Bearer ${parentA.token}`);
    expect(res.status).toBe(200);
    const deviceIds = res.body.byDevice.map((d: any) => d.deviceId);
    expect(deviceIds).toContain(deviceA);
    expect(deviceIds).not.toContain(deviceB);
  });

  it("a child account cannot access parent-only dashboard/analytics endpoints", async () => {
    const parent = await createParentWithFamily(cleanup, 'xf-A8');
    const child = await addChildAndLogin(cleanup, parent, 'xf-A8-kid');

    const overview = await api
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${child.token}`);
    expect(overview.status).toBe(403);

    const analytics = await api
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${child.token}`);
    expect(analytics.status).toBe(403);
  });
});
