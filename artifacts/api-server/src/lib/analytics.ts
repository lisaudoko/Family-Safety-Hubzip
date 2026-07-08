// On-demand aggregation of raw `deviceEventsTable` rows into summaries.
// No cron/background job infra exists in this app, so these functions
// compute aggregates at request time (same pattern as device staleness in
// devices.ts). They take plain params and return structured JSON so they can
// be reused by both an API route and, in a future phase, digest emails.

import { db } from '@workspace/db';
import { deviceEventsTable } from '@workspace/db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateRangeParseResult =
  | { range: DateRange; error?: never }
  | { range?: never; error: string };

function baseConditions(familyId: string, range: DateRange, deviceId?: string) {
  const conditions = [
    eq(deviceEventsTable.family_id, familyId),
    eq(deviceEventsTable.event_type, 'screen_time'),
    gte(deviceEventsTable.occurred_at, range.from),
    lte(deviceEventsTable.occurred_at, range.to),
  ];
  if (deviceId) conditions.push(eq(deviceEventsTable.device_id, deviceId));
  return conditions;
}

export interface ScreenTimeByDeviceRow {
  deviceId: string;
  totalDurationSeconds: number;
  eventCount: number;
}

export interface ScreenTimeByDayRow {
  day: string; // YYYY-MM-DD (UTC)
  totalDurationSeconds: number;
  eventCount: number;
}

export interface ScreenTimeByCategoryRow {
  category: string;
  totalDurationSeconds: number;
  eventCount: number;
}

export interface ScreenTimeSummary {
  from: string;
  to: string;
  familyTotalDurationSeconds: number;
  familyEventCount: number;
  byDevice: ScreenTimeByDeviceRow[];
  byDay: ScreenTimeByDayRow[];
  byCategory: ScreenTimeByCategoryRow[];
}

// durationSeconds lives in jsonb payload, so we cast it to numeric in SQL to
// let Postgres do the SUM instead of pulling every row into memory.
const durationSecondsExpr = sql<number>`sum((${deviceEventsTable.payload}->>'durationSeconds')::numeric)`;
const eventCountExpr = sql<number>`count(*)`;

export async function getScreenTimeSummary(
  familyId: string,
  range: DateRange,
  deviceId?: string,
): Promise<ScreenTimeSummary> {
  const conditions = baseConditions(familyId, range, deviceId);
  const where = and(...conditions);

  const [familyTotals] = await db
    .select({
      totalDurationSeconds: durationSecondsExpr,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where);

  const byDeviceRows = await db
    .select({
      deviceId: deviceEventsTable.device_id,
      totalDurationSeconds: durationSecondsExpr,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where)
    .groupBy(deviceEventsTable.device_id);

  const dayExpr = sql<string>`to_char(${deviceEventsTable.occurred_at} at time zone 'UTC', 'YYYY-MM-DD')`;
  const byDayRows = await db
    .select({
      day: dayExpr,
      totalDurationSeconds: durationSecondsExpr,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where)
    .groupBy(dayExpr)
    .orderBy(dayExpr);

  const categoryExpr = sql<string>`coalesce(${deviceEventsTable.payload}->>'category', 'uncategorized')`;
  const byCategoryRows = await db
    .select({
      category: categoryExpr,
      totalDurationSeconds: durationSecondsExpr,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where)
    .groupBy(categoryExpr);

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    familyTotalDurationSeconds: Number(familyTotals?.totalDurationSeconds ?? 0),
    familyEventCount: Number(familyTotals?.eventCount ?? 0),
    byDevice: byDeviceRows.map((r) => ({
      deviceId: r.deviceId,
      totalDurationSeconds: Number(r.totalDurationSeconds ?? 0),
      eventCount: Number(r.eventCount ?? 0),
    })),
    byDay: byDayRows.map((r) => ({
      day: r.day,
      totalDurationSeconds: Number(r.totalDurationSeconds ?? 0),
      eventCount: Number(r.eventCount ?? 0),
    })),
    byCategory: byCategoryRows.map((r) => ({
      category: r.category,
      totalDurationSeconds: Number(r.totalDurationSeconds ?? 0),
      eventCount: Number(r.eventCount ?? 0),
    })),
  };
}

export interface ActivityByTypeRow {
  activityType: string;
  eventCount: number;
}

export interface ActivityByDeviceRow {
  deviceId: string;
  eventCount: number;
}

export interface ActivitySummary {
  from: string;
  to: string;
  familyEventCount: number;
  byActivityType: ActivityByTypeRow[];
  byDevice: ActivityByDeviceRow[];
}

export async function getActivitySummary(
  familyId: string,
  range: DateRange,
  deviceId?: string,
): Promise<ActivitySummary> {
  const conditions = [
    eq(deviceEventsTable.family_id, familyId),
    eq(deviceEventsTable.event_type, 'activity'),
    gte(deviceEventsTable.occurred_at, range.from),
    lte(deviceEventsTable.occurred_at, range.to),
  ];
  if (deviceId) conditions.push(eq(deviceEventsTable.device_id, deviceId));
  const where = and(...conditions);

  const [familyTotals] = await db
    .select({ eventCount: eventCountExpr })
    .from(deviceEventsTable)
    .where(where);

  const activityTypeExpr = sql<string>`coalesce(${deviceEventsTable.payload}->>'activityType', 'unknown')`;
  const byActivityTypeRows = await db
    .select({
      activityType: activityTypeExpr,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where)
    .groupBy(activityTypeExpr);

  const byDeviceRows = await db
    .select({
      deviceId: deviceEventsTable.device_id,
      eventCount: eventCountExpr,
    })
    .from(deviceEventsTable)
    .where(where)
    .groupBy(deviceEventsTable.device_id);

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    familyEventCount: Number(familyTotals?.eventCount ?? 0),
    byActivityType: byActivityTypeRows.map((r) => ({
      activityType: r.activityType,
      eventCount: Number(r.eventCount ?? 0),
    })),
    byDevice: byDeviceRows.map((r) => ({
      deviceId: r.deviceId,
      eventCount: Number(r.eventCount ?? 0),
    })),
  };
}
