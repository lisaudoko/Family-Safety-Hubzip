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

// NOTE ON EMAIL: src/lib/email.ts only opens an SMTP transport if
// process.env.SMTP_HOST is set. The repo's .env.example ships SMTP_HOST
// unset, and this test run does not set it either, so sendWeeklyDigestEmail
// takes its no-op "log to console" branch and never makes a real network
// call. No mocking of the email module is needed under that condition.
describe('POST /api/notifications/weekly-digest/send', () => {
  it('does not send a real email in this test environment (SMTP_HOST unset)', () => {
    expect(process.env.SMTP_HOST).toBeFalsy();
  });

  it('returns success with correctly aggregated digest numbers', async () => {
    const parent = await createParentWithFamily(cleanup, 'notif-digest');
    const child = await addChildAndLogin(cleanup, parent, 'notif-digest-kid');
    const { deviceId } = await registerDevice(child.token, {
      capabilities: ['screen_time_reporting', 'activity_summary'],
    });

    await postEvent(child.token, deviceId, 'screen_time', { durationSeconds: 400 }, isoDaysAgo(1));
    await postEvent(child.token, deviceId, 'screen_time', { durationSeconds: 100 }, isoDaysAgo(2));
    await postEvent(child.token, deviceId, 'activity', { activityType: 'homework' }, isoDaysAgo(1));

    const res = await api
      .post('/api/notifications/weekly-digest/send')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(true);
    expect(res.body.to).toBe(parent.email);
    expect(res.body.digest.familyTotalDurationSeconds).toBe(500);
    expect(res.body.digest.familyEventCount).toBe(2);

    const childBreakdown = res.body.digest.byChild.find(
      (c: any) => c.childName === `Test notif-digest-kid`,
    );
    expect(childBreakdown).toMatchObject({ totalDurationSeconds: 500, eventCount: 2 });

    const homework = res.body.digest.activityHighlights.find(
      (a: any) => a.activityType === 'homework',
    );
    expect(homework).toMatchObject({ activityType: 'homework', eventCount: 1 });

    const deviceHealth = res.body.digest.devices.find((d: any) => d.name === 'Test Device');
    expect(deviceHealth).toBeDefined();
    expect(deviceHealth.stale).toBe(true); // device never sent a heartbeat
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'notif-child');
    const child = await addChildAndLogin(cleanup, parent, 'notif-child-kid');

    const res = await api
      .post('/api/notifications/weekly-digest/send')
      .set('Authorization', `Bearer ${child.token}`)
      .send({});
    expect(res.status).toBe(403);
  });
});
