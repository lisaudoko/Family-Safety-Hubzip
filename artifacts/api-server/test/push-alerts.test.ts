import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, devicesTable } from '@workspace/db';
import { alertInactiveDevices, sendWeeklySummaries } from '../src/lib/alerts.js';
import { api, Cleanup, createParentWithFamily, addChildAndLogin, registerDevice } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => {
  vi.unstubAllGlobals();
  return cleanup.run();
});

// Captures what would be sent to Expo's push service.
let pushes: { to: string; title: string; body: string; data: { url?: string } }[] = [];
beforeEach(() => {
  pushes = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const msgs = JSON.parse(init.body) as typeof pushes;
      pushes.push(...msgs);
      return { ok: true, status: 200, json: async () => ({ data: msgs.map(() => ({ status: 'ok' })) }) };
    }),
  );
});

const tokenFor = () => `ExponentPushToken[${randomUUID().replace(/-/g, '').slice(0, 22)}]`;

async function familyWithPushEnabledParent(label: string) {
  const parent = await createParentWithFamily(cleanup, label);
  const { deviceId: parentDevice } = await registerDevice(parent.token, { name: 'Parent phone' });
  const pushToken = tokenFor();
  const res = await api
    .patch(`/api/devices/${parentDevice}`)
    .set('Authorization', `Bearer ${parent.token}`)
    .send({ pushToken });
  expect(res.status).toBe(200);
  expect(res.body.device.notificationsEnabled).toBe(true);
  expect(JSON.stringify(res.body)).not.toContain(pushToken); // token never echoed back
  const child = await addChildAndLogin(cleanup, parent, `${label}-kid`);
  const { deviceId: childDevice } = await registerDevice(child.token, {
    name: 'iPad',
    capabilities: ['lesson_participation', 'device_sync'],
  });
  return { parent, child, parentDevice, childDevice, pushToken };
}

const sentTo = (token: string) => pushes.filter((p) => p.to === token);

describe('push token registration', () => {
  it('only the device owner can set its token, and it must be an Expo token', async () => {
    const { parent, child, childDevice, parentDevice } = await familyWithPushEnabledParent('push-reg');

    // A child may register their own device (for screen-view requests)...
    const childOwn = await api
      .patch(`/api/devices/${childDevice}`)
      .set('Authorization', `Bearer ${child.token}`)
      .send({ pushToken: tokenFor() });
    expect(childOwn.status).toBe(200);

    // ...but never a parent's device.
    const childOnParentDevice = await api
      .patch(`/api/devices/${parentDevice}`)
      .set('Authorization', `Bearer ${child.token}`)
      .send({ pushToken: tokenFor() });
    expect([403, 404]).toContain(childOnParentDevice.status);

    const parentOnChildDevice = await api
      .patch(`/api/devices/${childDevice}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ pushToken: tokenFor() });
    expect(parentOnChildDevice.status).toBe(403);

    const bad = await api
      .patch(`/api/devices/${parentDevice}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ pushToken: 'not-a-token' });
    expect(bad.status).toBe(400);

    const off = await api
      .patch(`/api/devices/${parentDevice}`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ pushToken: null });
    expect(off.status).toBe(200);
    expect(off.body.device.notificationsEnabled).toBe(false);
  });
});

describe('parent alerts', () => {
  it('alerts when a child finishes a course, not for a single lesson', async () => {
    const { child, childDevice, pushToken } = await familyWithPushEnabledParent('push-milestone');

    const send = (activityType: string, details: Record<string, unknown>) =>
      api
        .post(`/api/devices/${childDevice}/events`)
        .set('Authorization', `Bearer ${child.token}`)
        .send({ id: randomUUID(), eventType: 'education_activity', payload: { activityType, details } });

    expect((await send('lesson_completed', { lessonId: 'l1' })).status).toBe(201);
    expect((await send('course_completed', { courseId: 'c1', title: 'Online Safety Basics' })).status).toBe(201);

    await vi.waitFor(() => expect(sentTo(pushToken)).toHaveLength(1));
    expect(sentTo(pushToken)[0]!.body).toContain('Online Safety Basics');
  });

  it('alerts when Screen Time permission is turned off on a child device', async () => {
    const { child, childDevice, pushToken } = await familyWithPushEnabledParent('push-st');
    const beat = (screen_time: string) =>
      api
        .post(`/api/devices/${childDevice}/heartbeat`)
        .set('Authorization', `Bearer ${child.token}`)
        .send({ permissionStatus: { screen_time } });

    expect((await beat('approved')).status).toBe(200);
    expect((await beat('approved')).status).toBe(200);
    expect((await beat('denied')).status).toBe(200);

    await vi.waitFor(() => expect(sentTo(pushToken)).toHaveLength(1));
    expect(sentTo(pushToken)[0]!.title).toBe('Screen Time turned off');
  });

  it('alerts once for a child device inactive 3+ days, and re-arms after it syncs', async () => {
    const { child, childDevice, pushToken } = await familyWithPushEnabledParent('push-inactive');
    const old = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await db.update(devicesTable).set({ last_synced_at: old }).where(eq(devicesTable.id, childDevice));

    await alertInactiveDevices();
    await alertInactiveDevices();
    expect(sentTo(pushToken)).toHaveLength(1);

    await api.post(`/api/devices/${childDevice}/heartbeat`).set('Authorization', `Bearer ${child.token}`).send({});
    const [row] = await db.select().from(devicesTable).where(eq(devicesTable.id, childDevice));
    expect(row!.inactive_alert_sent_at).toBeNull();
  });

  it('sends the weekly summary once per family on Sunday only', async () => {
    const { pushToken } = await familyWithPushEnabledParent('push-weekly');
    // Use the most recent past Sunday: a future date would mark every family in
    // the shared dev database as "sent" and block real weekly pushes until then.
    const sunday = new Date();
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay() - (sunday.getUTCDay() === 0 ? 7 : 0));
    sunday.setUTCHours(0, 0, 0, 0);
    const monday = new Date(sunday.getTime() + 24 * 60 * 60 * 1000);

    await sendWeeklySummaries(monday);
    expect(sentTo(pushToken)).toHaveLength(0);

    await sendWeeklySummaries(sunday);
    await sendWeeklySummaries(sunday);
    expect(sentTo(pushToken)).toHaveLength(1);
  });
});
