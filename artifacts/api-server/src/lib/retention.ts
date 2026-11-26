import { and, eq, isNull, lt, ne } from 'drizzle-orm';
import {
  auditLogTable,
  blockedAppEventsTable,
  db,
  deviceEventsTable,
  emailVerificationCodesTable,
  passwordResetCodesTable,
  sessionsTable,
  supportCodesTable,
} from '@workspace/db';
import { logger } from './logger.js';

// Data retention policy (product decision 2026-11-26). Keep in sync with the
// published privacy policy and docs/DATA_INVENTORY.md.
export const RETENTION = {
  heartbeatDays: 30,
  deviceActivityMonths: 12,
  auditLogMonths: 12,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number, now: Date): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function monthsAgo(months: number, now: Date): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Deletes data past its retention period, plus expired sessions and one-time
 * codes. Idempotent and safe to run concurrently on several instances.
 * Accounts, progress, policies and agreements are kept until the parent
 * deletes the account.
 */
export async function runRetentionCleanup(now: Date = new Date()): Promise<Record<string, number>> {
  const activityCutoff = monthsAgo(RETENTION.deviceActivityMonths, now);
  const counts: Record<string, number> = {};
  const count = async (name: string, q: Promise<{ id?: string; token?: string }[]>) => {
    counts[name] = (await q).length;
  };

  await count(
    'heartbeats',
    db
      .delete(deviceEventsTable)
      .where(and(eq(deviceEventsTable.event_type, 'heartbeat'), lt(deviceEventsTable.occurred_at, daysAgo(RETENTION.heartbeatDays, now))))
      .returning({ id: deviceEventsTable.id }),
  );
  await count(
    'deviceEvents',
    db
      .delete(deviceEventsTable)
      .where(and(ne(deviceEventsTable.event_type, 'heartbeat'), lt(deviceEventsTable.occurred_at, activityCutoff)))
      .returning({ id: deviceEventsTable.id }),
  );
  await count(
    'blockedAppEvents',
    db.delete(blockedAppEventsTable).where(lt(blockedAppEventsTable.attempted_at, activityCutoff)).returning({ id: blockedAppEventsTable.id }),
  );
  await count(
    'auditLog',
    db
      .delete(auditLogTable)
      .where(lt(auditLogTable.created_at, monthsAgo(RETENTION.auditLogMonths, now)))
      .returning({ id: auditLogTable.id }),
  );
  await count('sessions', db.delete(sessionsTable).where(lt(sessionsTable.expires_at, now)).returning({ token: sessionsTable.token }));
  await count(
    'passwordResetCodes',
    db.delete(passwordResetCodesTable).where(lt(passwordResetCodesTable.expires_at, now)).returning({ id: passwordResetCodesTable.id }),
  );
  await count(
    'emailVerificationCodes',
    db.delete(emailVerificationCodesTable).where(lt(emailVerificationCodesTable.expires_at, now)).returning({ id: emailVerificationCodesTable.id }),
  );
  await count(
    'supportCodes',
    // Only never-redeemed codes: a used code anchors its support_sessions row
    // (ON DELETE CASCADE), which is the record of admin access to a family.
    db
      .delete(supportCodesTable)
      .where(and(lt(supportCodesTable.expires_at, now), isNull(supportCodesTable.used_at)))
      .returning({ id: supportCodesTable.id }),
  );

  return counts;
}

/** Runs the cleanup now and then once a day. Errors are logged, never thrown. */
export function scheduleRetentionCleanup(): void {
  const run = () =>
    runRetentionCleanup()
      .then((deleted) => logger.info({ deleted }, 'retention cleanup complete'))
      .catch((err) => logger.error({ err }, 'retention cleanup failed'));
  void run();
  setInterval(run, DAY_MS).unref();
}
