import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import {
  api,
  Cleanup,
  createParentWithFamily,
  addChildAndLogin,
  registerDevice,
} from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

describe('POST /api/devices (registration)', () => {
  it('registers a device successfully for a parent with a family', async () => {
    const parent = await createParentWithFamily(cleanup, 'dev-reg');
    const { status, body, deviceId } = await registerDevice(parent.token, {
      name: 'Kid iPad',
      platform: 'ios',
      osVersion: '17.1',
      appVersion: '1.0.0',
      capabilities: ['device_sync', 'screen_time_reporting'],
    });

    expect(status).toBe(201);
    expect(body.device).toMatchObject({
      id: deviceId,
      ownerId: parent.userId,
      familyId: parent.familyId,
      name: 'Kid iPad',
      platform: 'ios',
      osVersion: '17.1',
      appVersion: '1.0.0',
      status: 'active',
    });
    expect(body.device.capabilities.sort()).toEqual(['device_sync', 'screen_time_reporting'].sort());
    // Never synced yet -> stale.
    expect(body.device.isStale).toBe(true);
    expect(body.device.lastSyncedAt).toBeNull();
    expect(typeof body.syncIntervalSeconds).toBe('number');
  });

  it('returns 400 when required fields are missing', async () => {
    const parent = await createParentWithFamily(cleanup, 'dev-missing');
    const res = await api
      .post('/api/devices')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), platform: 'ios' }); // missing name

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id, name, and platform required/);
  });

  it('returns 400 for an invalid platform value', async () => {
    const parent = await createParentWithFamily(cleanup, 'dev-badplat');
    const res = await api
      .post('/api/devices')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), name: 'Weird Device', platform: 'windows' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/platform must be one of/);
  });

  it('returns 400 when the caller has no family yet', async () => {
    // Register a parent but deliberately skip family creation.
    const { registerParent } = await import('./helpers.js');
    const solo = await registerParent(cleanup, 'dev-nofam');
    const res = await api
      .post('/api/devices')
      .set('Authorization', `Bearer ${solo.token}`)
      .send({ id: randomUUID(), name: 'Orphan Device', platform: 'android' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/join or create a family/);
  });

  it('upserts on re-registration with the same id (duplicate registration)', async () => {
    const parent = await createParentWithFamily(cleanup, 'dev-upsert');
    const deviceId = randomUUID();

    const first = await registerDevice(parent.token, {
      id: deviceId,
      name: 'Original Name',
      platform: 'android',
      capabilities: ['device_sync'],
    });
    expect(first.status).toBe(201);

    const second = await registerDevice(parent.token, {
      id: deviceId,
      name: 'Renamed Device',
      platform: 'android', // platform isn't part of the update set but must still be sent/valid
      appVersion: '2.0.0',
      capabilities: ['device_sync', 'activity_summary'],
    });
    expect(second.status).toBe(201);
    expect(second.body.device.id).toBe(deviceId);
    expect(second.body.device.name).toBe('Renamed Device');
    expect(second.body.device.appVersion).toBe('2.0.0');
    expect(second.body.device.capabilities.sort()).toEqual(
      ['device_sync', 'activity_summary'].sort(),
    );

    // Exactly one row for this id should exist (verified via a plain GET).
    const listRes = await api.get('/api/devices').set('Authorization', `Bearer ${parent.token}`);
    const matching = listRes.body.devices.filter((d: any) => d.id === deviceId);
    expect(matching.length).toBe(1);
  });

  it('rejects an invalid capabilities value', async () => {
    const parent = await createParentWithFamily(cleanup, 'dev-badcap');
    const res = await api
      .post('/api/devices')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), name: 'Bad Cap Device', platform: 'ios', capabilities: ['not_a_real_capability'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/capabilities must be a subset of/);
  });
});

describe('POST /api/devices/:deviceId/heartbeat', () => {
  it('updates lastSyncedAt and clears isStale, and reconciles capabilities', async () => {
    const parent = await createParentWithFamily(cleanup, 'hb');
    const child = await addChildAndLogin(cleanup, parent, 'hb-child');
    const { deviceId } = await registerDevice(child.token, { capabilities: ['device_sync'] });

    const before = await api
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(before.body.device.isStale).toBe(true);

    const hbRes = await api
      .post(`/api/devices/${deviceId}/heartbeat`)
      .set('Authorization', `Bearer ${child.token}`)
      .send({ capabilities: ['device_sync', 'activity_summary'], permissionStatus: { activity_summary: 'granted' } });

    expect(hbRes.status).toBe(200);
    expect(hbRes.body.ok).toBe(true);
    expect(typeof hbRes.body.lastSyncedAt).toBe('string');

    const after = await api
      .get(`/api/devices/${deviceId}`)
      .set('Authorization', `Bearer ${child.token}`);
    expect(after.body.device.isStale).toBe(false);
    expect(after.body.device.lastSyncedAt).not.toBeNull();
    expect(after.body.device.capabilities.sort()).toEqual(['device_sync', 'activity_summary'].sort());
    expect(after.body.device.permissionStatus).toEqual({ activity_summary: 'granted' });
  });

  it('returns 404 for a device the caller does not own', async () => {
    const parent = await createParentWithFamily(cleanup, 'hb-other');
    const child = await addChildAndLogin(cleanup, parent, 'hb-other-child');
    const { deviceId } = await registerDevice(child.token, { capabilities: ['device_sync'] });

    // The parent is not the owner of the child's device.
    const res = await api
      .post(`/api/devices/${deviceId}/heartbeat`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('rejects invalid capabilities on heartbeat', async () => {
    const parent = await createParentWithFamily(cleanup, 'hb-badcap');
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const res = await api
      .post(`/api/devices/${deviceId}/heartbeat`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ capabilities: ['bogus'] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/devices/:deviceId/events (ingestion)', () => {
  it('accepts a valid screen_time event', async () => {
    const parent = await createParentWithFamily(cleanup, 'evt-ok');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting'],
    });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({
        id: randomUUID(),
        eventType: 'screen_time',
        payload: { durationSeconds: 120, appName: 'Games', category: 'entertainment' },
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it('rejects an invalid payload shape (missing durationSeconds)', async () => {
    const parent = await createParentWithFamily(cleanup, 'evt-badpayload');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting'],
    });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { appName: 'Games' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/durationSeconds/);
  });

  it('rejects an event type the device does not have the capability for', async () => {
    const parent = await createParentWithFamily(cleanup, 'evt-nocap');
    // Device registered with no capabilities at all.
    const { deviceId } = await registerDevice(parent.token, { capabilities: [] });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { durationSeconds: 60 } });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/screen_time_reporting/);
  });

  it('returns 400 for an unsupported eventType', async () => {
    const parent = await createParentWithFamily(cleanup, 'evt-unsupported');
    const { deviceId } = await registerDevice(parent.token, { capabilities: ['screen_time_reporting'] });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: randomUUID(), eventType: 'not_a_real_event', payload: {} });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsupported eventType/);
  });

  it('returns 404 for a device not owned by the caller', async () => {
    const parentA = await createParentWithFamily(cleanup, 'evt-ownerA');
    const parentB = await createParentWithFamily(cleanup, 'evt-ownerB');
    const { deviceId } = await registerDevice(parentA.token, {
      capabilities: ['screen_time_reporting'],
    });

    const res = await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parentB.token}`)
      .send({ id: randomUUID(), eventType: 'screen_time', payload: { durationSeconds: 60 } });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/devices/events (listing)', () => {
  it('lets a parent list and filter events for their family', async () => {
    const parent = await createParentWithFamily(cleanup, 'list-parent');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });

    const stId = randomUUID();
    const actId = randomUUID();
    await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: stId, eventType: 'screen_time', payload: { durationSeconds: 90 } });
    await api
      .post(`/api/devices/${deviceId}/events`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ id: actId, eventType: 'activity', payload: { activityType: 'reading' } });

    const all = await api
      .get('/api/devices/events')
      .set('Authorization', `Bearer ${parent.token}`);
    expect(all.status).toBe(200);
    const ids = all.body.events.map((e: any) => e.id);
    expect(ids).toEqual(expect.arrayContaining([stId, actId]));

    const filtered = await api
      .get('/api/devices/events')
      .query({ eventType: 'activity' })
      .set('Authorization', `Bearer ${parent.token}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.events.every((e: any) => e.eventType === 'activity')).toBe(true);
    expect(filtered.body.events.map((e: any) => e.id)).toContain(actId);
    expect(filtered.body.events.map((e: any) => e.id)).not.toContain(stId);
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'list-child');
    const child = await addChildAndLogin(cleanup, parent, 'list-child-kid');

    const res = await api
      .get('/api/devices/events')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});
