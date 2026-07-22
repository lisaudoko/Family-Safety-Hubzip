import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { db } from '@workspace/db';
import { profilesTable, devicesTable, childrenTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { getScreenTimeSummary, getActivitySummary, type DateRange } from '../lib/analytics.js';
import { sendWeeklyDigestEmail, type WeeklyDigestData } from '../lib/email.js';

const router = Router();
router.use(requireAuth as any);

// Each call sends a real outbound email, so this needs a tighter cap than
// the global API limiter to prevent inbox spam / SMTP quota exhaustion.
const digestSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthRequest) => req.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
});

const DIGEST_RANGE_DAYS = 7;

// Same "no background job infra" pattern as devices.ts staleness and
// analytics.ts summaries: there is no scheduler in this app, so the weekly
// digest is computed and sent on demand rather than on a recurring timer.
// A real "weekly" cadence would need either a job scheduler (e.g. node-cron)
// running inside the process, or an external trigger (cron-like Replit
// scheduled deployment / GitHub Action / third-party cron service) calling
// this endpoint once a week - out of scope for this phase, flagged as a
// followup recommendation.
const STALE_AFTER_MS = 15 * 60 * 1000 * 3;

function isDeviceStale(d: typeof devicesTable.$inferSelect): boolean {
  if (!d.last_synced_at) return true;
  return Date.now() - d.last_synced_at.getTime() > STALE_AFTER_MS;
}

async function buildWeeklyDigestData(
  familyId: string,
  range: DateRange,
): Promise<WeeklyDigestData> {
  const [screenTime, activity, devices, children] = await Promise.all([
    getScreenTimeSummary(familyId, range),
    getActivitySummary(familyId, range),
    db.select().from(devicesTable).where(eq(devicesTable.family_id, familyId)),
    db.select().from(childrenTable).where(eq(childrenTable.family_id, familyId)),
  ]);

  // Per-child breakdown: device_events don't carry a child id directly, but
  // devices belong to an owner_id, and child accounts share their profiles
  // row id with their children row id, so we join screen-time-by-device back
  // to the device's owner and match against children ids.
  const deviceOwnerRows = devices.map((d) => ({ deviceId: d.id, ownerId: d.owner_id }));
  const childIds = new Set(children.map((c) => c.id));
  const byChildTotals = new Map<string, { totalDurationSeconds: number; eventCount: number }>();
  for (const row of screenTime.byDevice) {
    const owner = deviceOwnerRows.find((d) => d.deviceId === row.deviceId)?.ownerId;
    if (!owner || !childIds.has(owner)) continue;
    const existing = byChildTotals.get(owner) ?? { totalDurationSeconds: 0, eventCount: 0 };
    existing.totalDurationSeconds += row.totalDurationSeconds;
    existing.eventCount += row.eventCount;
    byChildTotals.set(owner, existing);
  }
  const byChild = children
    .filter((c) => byChildTotals.has(c.id))
    .map((c) => ({
      childName: c.name,
      totalDurationSeconds: byChildTotals.get(c.id)!.totalDurationSeconds,
      eventCount: byChildTotals.get(c.id)!.eventCount,
    }));

  return {
    from: screenTime.from,
    to: screenTime.to,
    familyTotalDurationSeconds: screenTime.familyTotalDurationSeconds,
    familyEventCount: screenTime.familyEventCount,
    byChild,
    activityHighlights: activity.byActivityType.map((a) => ({
      activityType: a.activityType,
      eventCount: a.eventCount,
    })),
    devices: devices.map((d) => ({
      name: d.name,
      platform: d.platform,
      stale: isDeviceStale(d),
      lastSyncedAt: d.last_synced_at?.toISOString() ?? null,
    })),
  };
}

// POST /api/notifications/weekly-digest/send
// Sends the calling parent an on-demand weekly digest email for their
// family (screen time, activity highlights, per-child breakdown, device
// sync health) covering the trailing 7 days. There is no automatic weekly
// schedule - see comment above.
router.post(
  '/notifications/weekly-digest/send',
  requireParent as any,
  digestSendLimiter,
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.familyId) {
        res.status(400).json({ error: 'join or create a family first' });
        return;
      }
      const [parent] = await db
        .select({ email: profilesTable.email })
        .from(profilesTable)
        .where(eq(profilesTable.id, req.userId!))
        .limit(1);
      if (!parent?.email) {
        res.status(400).json({ error: 'no email on file for this account' });
        return;
      }

      const to = new Date();
      const from = new Date(to.getTime() - DIGEST_RANGE_DAYS * 24 * 60 * 60 * 1000);
      const data = await buildWeeklyDigestData(req.familyId, { from, to });

      await sendWeeklyDigestEmail(parent.email, data);

      res.json({ sent: true, to: parent.email, digest: data });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
