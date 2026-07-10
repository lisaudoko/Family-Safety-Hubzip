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

describe('GET /api/analytics/screen-time', () => {
  it('computes exact aggregates matching hand-computed expectations', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-screen');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting'],
    });

    // All within the default trailing-7-day window.
    await postEvent(parent.token, deviceId, 'screen_time', {
      durationSeconds: 100,
      category: 'games',
    }, isoDaysAgo(1));
    await postEvent(parent.token, deviceId, 'screen_time', {
      durationSeconds: 200,
      category: 'games',
    }, isoDaysAgo(2));
    await postEvent(parent.token, deviceId, 'screen_time', {
      durationSeconds: 50,
      category: 'social',
    }, isoDaysAgo(3));

    const res = await api
      .get('/api/analytics/screen-time')
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.familyTotalDurationSeconds).toBe(350);
    expect(res.body.familyEventCount).toBe(3);

    const byDevice = res.body.byDevice.find((d: any) => d.deviceId === deviceId);
    expect(byDevice).toMatchObject({ deviceId, totalDurationSeconds: 350, eventCount: 3 });

    const gamesRow = res.body.byCategory.find((c: any) => c.category === 'games');
    const socialRow = res.body.byCategory.find((c: any) => c.category === 'social');
    expect(gamesRow).toMatchObject({ totalDurationSeconds: 300, eventCount: 2 });
    expect(socialRow).toMatchObject({ totalDurationSeconds: 50, eventCount: 1 });

    expect(res.body.byDay.length).toBe(3);
    const totalFromDays = res.body.byDay.reduce((sum: number, d: any) => sum + d.totalDurationSeconds, 0);
    expect(totalFromDays).toBe(350);
  });

  it('filters by date range, excluding events outside it', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-range');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting'],
    });

    await postEvent(parent.token, deviceId, 'screen_time', { durationSeconds: 500 }, isoDaysAgo(20));
    await postEvent(parent.token, deviceId, 'screen_time', { durationSeconds: 30 }, isoDaysAgo(1));

    const recentOnly = await api
      .get('/api/analytics/screen-time')
      .query({ from: isoDaysAgo(7) })
      .set('Authorization', `Bearer ${parent.token}`);
    expect(recentOnly.body.familyTotalDurationSeconds).toBe(30);
    expect(recentOnly.body.familyEventCount).toBe(1);

    const wideRange = await api
      .get('/api/analytics/screen-time')
      .query({ from: isoDaysAgo(25) })
      .set('Authorization', `Bearer ${parent.token}`);
    expect(wideRange.body.familyTotalDurationSeconds).toBe(530);
    expect(wideRange.body.familyEventCount).toBe(2);
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-child');
    const child = await addChildAndLogin(cleanup, parent, 'an-child-kid');

    const res = await api
      .get('/api/analytics/screen-time')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/activity', () => {
  it('computes exact activity aggregates', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-activity');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['activity_summary'],
    });

    await postEvent(parent.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(1));
    await postEvent(parent.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(2));
    await postEvent(parent.token, deviceId, 'activity', { activityType: 'exercise' }, isoDaysAgo(1));

    const res = await api
      .get('/api/analytics/activity')
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.familyEventCount).toBe(3);
    const reading = res.body.byActivityType.find((a: any) => a.activityType === 'reading');
    const exercise = res.body.byActivityType.find((a: any) => a.activityType === 'exercise');
    expect(reading).toMatchObject({ activityType: 'reading', eventCount: 2 });
    expect(exercise).toMatchObject({ activityType: 'exercise', eventCount: 1 });

    const byDevice = res.body.byDevice.find((d: any) => d.deviceId === deviceId);
    expect(byDevice).toMatchObject({ deviceId, eventCount: 3 });
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-activity-child');
    const child = await addChildAndLogin(cleanup, parent, 'an-activity-kid');

    const res = await api
      .get('/api/analytics/activity')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/education', () => {
  it('computes education activity aggregates separately from general activity', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-edu');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['lesson_participation', 'activity_summary'],
    });

    await postEvent(parent.token, deviceId, 'education_activity', { activityType: 'lesson_completed' }, isoDaysAgo(1));
    await postEvent(parent.token, deviceId, 'education_activity', { activityType: 'lesson_completed' }, isoDaysAgo(2));
    await postEvent(parent.token, deviceId, 'education_activity', { activityType: 'quiz_completed' }, isoDaysAgo(1));
    // A general (non-education) activity event on the same device must not leak into education totals.
    await postEvent(parent.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(1));

    const res = await api
      .get('/api/analytics/education')
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.familyEventCount).toBe(3);
    const lessons = res.body.byActivityType.find((a: any) => a.activityType === 'lesson_completed');
    const quizzes = res.body.byActivityType.find((a: any) => a.activityType === 'quiz_completed');
    expect(lessons).toMatchObject({ activityType: 'lesson_completed', eventCount: 2 });
    expect(quizzes).toMatchObject({ activityType: 'quiz_completed', eventCount: 1 });
  });

  it('returns 403 for a child role', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-edu-child');
    const child = await addChildAndLogin(cleanup, parent, 'an-edu-kid');

    const res = await api
      .get('/api/analytics/education')
      .set('Authorization', `Bearer ${child.token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/summary', () => {
  it('includes screenTime, activity, and education in one response', async () => {
    const parent = await createParentWithFamily(cleanup, 'an-summary');
    const { deviceId } = await registerDevice(parent.token, {
      capabilities: ['screen_time_reporting', 'activity_summary', 'lesson_participation'],
    });

    await postEvent(parent.token, deviceId, 'screen_time', { durationSeconds: 10 }, isoDaysAgo(1));
    await postEvent(parent.token, deviceId, 'activity', { activityType: 'reading' }, isoDaysAgo(1));
    await postEvent(parent.token, deviceId, 'education_activity', { activityType: 'lesson_completed' }, isoDaysAgo(1));

    const res = await api
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${parent.token}`);

    expect(res.status).toBe(200);
    expect(res.body.screenTime.familyEventCount).toBe(1);
    expect(res.body.activity.familyEventCount).toBe(1);
    expect(res.body.education.familyEventCount).toBe(1);
  });
});
