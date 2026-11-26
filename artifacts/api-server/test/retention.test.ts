import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, deviceEventsTable, devicesTable } from '@workspace/db';
import { runRetentionCleanup } from '../src/lib/retention.js';
import { Cleanup, createParentWithFamily } from './helpers.js';

const cleanup = new Cleanup();
afterAll(() => cleanup.run());

const DAY = 24 * 60 * 60 * 1000;

describe('runRetentionCleanup', () => {
  it('drops heartbeats after 30 days and other device activity after 12 months', async () => {
    const parent = await createParentWithFamily(cleanup, 'retention');
    const deviceId = randomUUID();
    await db.insert(devicesTable).values({
      id: deviceId,
      owner_id: parent.userId,
      family_id: parent.familyId,
      name: 'Retention test device',
      platform: 'ios',
    });

    const now = new Date();
    const event = (type: string, ageDays: number) => ({
      id: randomUUID(),
      device_id: deviceId,
      owner_id: parent.userId,
      family_id: parent.familyId,
      event_type: type,
      occurred_at: new Date(now.getTime() - ageDays * DAY),
    });
    const rows = {
      freshHeartbeat: event('heartbeat', 5),
      oldHeartbeat: event('heartbeat', 40),
      recentScreenTime: event('screen_time', 200),
      ancientScreenTime: event('screen_time', 400),
    };
    await db.insert(deviceEventsTable).values(Object.values(rows));

    await runRetentionCleanup(now);

    const left = await db
      .select({ id: deviceEventsTable.id })
      .from(deviceEventsTable)
      .where(eq(deviceEventsTable.device_id, deviceId));
    const ids = new Set(left.map((r) => r.id));
    expect(ids.has(rows.freshHeartbeat.id)).toBe(true);
    expect(ids.has(rows.recentScreenTime.id)).toBe(true);
    expect(ids.has(rows.oldHeartbeat.id)).toBe(false);
    expect(ids.has(rows.ancientScreenTime.id)).toBe(false);
  });
});
