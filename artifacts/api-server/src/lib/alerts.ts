import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { db, devicesTable, familiesTable, profilesTable } from '@workspace/db';
import { cleanText, notifyParents } from './push.js';
import { logger } from './logger.js';

// Parent alerts (product decision 2026-11-26): Screen Time turned off, child
// device inactive for 3 days, learning milestones, weekly summary.

export const INACTIVE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

async function childName(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ name: profilesTable.full_name, role: profilesTable.role })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId))
    .limit(1);
  return p?.role === 'child' ? p.name : null;
}

/**
 * Screen Time permission went from approved to anything else on a child's
 * device. `before`/`after` are the device's permission_status maps.
 */
export async function maybeAlertScreenTimeOff(
  device: { owner_id: string; family_id: string; name: string },
  before: Record<string, string> | null | undefined,
  after: Record<string, string> | undefined,
): Promise<void> {
  if (!after || before?.screen_time !== 'approved' || after.screen_time === 'approved') return;
  const name = await childName(device.owner_id);
  if (!name) return;
  await notifyParents(device.family_id, {
    title: 'Screen Time turned off',
    body: `Screen Time permission was turned off on ${name}'s ${device.name}. Bedtime and filters won't apply until it's turned back on.`,
    url: `/child/${device.owner_id}`,
  });
}

/** A child finished a course or a family challenge. */
export async function maybeAlertMilestone(
  ownerId: string,
  familyId: string,
  payload: Record<string, unknown> | undefined,
): Promise<void> {
  const type = payload?.activityType;
  if (type !== 'course_completed' && type !== 'challenge_completed') return;
  const name = await childName(ownerId);
  if (!name) return;
  const details = (payload?.details ?? {}) as Record<string, unknown>;
  const title = cleanText(details.title);
  const what = type === 'course_completed' ? 'course' : 'family challenge';
  await notifyParents(familyId, {
    title: type === 'course_completed' ? 'Course completed' : 'Challenge completed',
    body: title ? `${name} finished the ${what} "${title}".` : `${name} finished a ${what}.`,
    url: `/child/${ownerId}`,
  });
}

/**
 * Child devices that haven't synced for INACTIVE_DAYS. Each device is claimed
 * with a conditional update so concurrent instances alert once; the marker is
 * cleared on the device's next heartbeat.
 */
export async function alertInactiveDevices(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  const stale = await db
    .select({
      id: devicesTable.id,
      name: devicesTable.name,
      ownerId: devicesTable.owner_id,
      familyId: devicesTable.family_id,
      childName: profilesTable.full_name,
    })
    .from(devicesTable)
    .innerJoin(profilesTable, eq(profilesTable.id, devicesTable.owner_id))
    .where(
      and(
        eq(profilesTable.role, 'child'),
        lt(devicesTable.last_synced_at, cutoff),
        isNull(devicesTable.inactive_alert_sent_at),
      ),
    );

  let alerted = 0;
  for (const d of stale) {
    const claimed = await db
      .update(devicesTable)
      .set({ inactive_alert_sent_at: now })
      .where(and(eq(devicesTable.id, d.id), isNull(devicesTable.inactive_alert_sent_at)))
      .returning({ id: devicesTable.id });
    if (claimed.length === 0) continue;
    alerted++;
    await notifyParents(d.familyId, {
      title: 'Device not checking in',
      body: `${d.childName}'s ${d.name} hasn't opened Digital Village in ${INACTIVE_DAYS} days.`,
      url: `/child/${d.ownerId}`,
    });
  }
  return alerted;
}

/**
 * Sunday (UTC) weekly-summary push. Each family is claimed once per week via
 * families.last_weekly_push_at.
 */
export async function sendWeeklySummaries(now: Date = new Date()): Promise<number> {
  if (now.getUTCDay() !== 0) return 0;
  const notSentThisWeek = or(
    isNull(familiesTable.last_weekly_push_at),
    lt(familiesTable.last_weekly_push_at, new Date(now.getTime() - 6 * DAY_MS)),
  );
  const families = await db.select({ id: familiesTable.id }).from(familiesTable).where(notSentThisWeek);

  let sent = 0;
  for (const f of families) {
    const claimed = await db
      .update(familiesTable)
      .set({ last_weekly_push_at: now })
      .where(and(eq(familiesTable.id, f.id), notSentThisWeek))
      .returning({ id: familiesTable.id });
    if (claimed.length === 0) continue;
    const accepted = await notifyParents(f.id, {
      title: 'Your weekly family summary',
      body: "See this week's screen time and learning progress for your family.",
      url: '/(tabs)/family',
    });
    if (accepted > 0) sent++;
  }
  return sent;
}

/** Time-based alerts; safe to run often (every send is claimed first). */
export async function runScheduledAlerts(now: Date = new Date()): Promise<void> {
  try {
    const inactive = await alertInactiveDevices(now);
    const weekly = await sendWeeklySummaries(now);
    if (inactive || weekly) logger.info({ inactive, weekly }, 'scheduled alerts sent');
  } catch (err) {
    logger.error({ err }, 'scheduled alerts failed');
  }
}
