import { Router } from 'express';
import { db } from '@workspace/db';
import { childrenTable, devicesTable, deviceEventsTable, userProgressTable, badgesTable, coursesTable } from '@workspace/db';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import { getScreenTimeSummary, getActivitySummary, getEducationActivitySummary } from '../lib/analytics.js';
import { isDeviceStale, deviceStatusLabel } from '../lib/deviceStatus.js';

const router = Router();
router.use(requireAuth as any);
router.use(requireParent as any);

function safeDeviceSummary(d: typeof devicesTable.$inferSelect) {
  return {
    id: d.id,
    name: d.name,
    platform: d.platform,
    isStale: isDeviceStale(d.last_synced_at),
    syncStatus: deviceStatusLabel(d.last_synced_at),
    lastSyncedAt: d.last_synced_at?.toISOString() ?? null,
  };
}

const ROLLUP_DAYS = 7;

// Reuses Phase 4's family-wide, per-device aggregation (lib/analytics.ts)
// rather than re-summing raw events ourselves, then re-buckets the
// per-device rows by owner (child) using the device->owner map the caller
// already has. analytics.ts only groups by deviceId/day/category, not by
// owner, so this mapping step is the minimal glue needed on top of it.
async function loadRecentActivityByOwner(
  familyId: string,
  ownerIds: string[],
  deviceOwnerById: Map<string, string>,
): Promise<Map<string, { screenTimeSeconds: number; activityCount: number; educationCount: number }>> {
  const result = new Map<
    string,
    { screenTimeSeconds: number; activityCount: number; educationCount: number }
  >();
  for (const id of ownerIds) result.set(id, { screenTimeSeconds: 0, activityCount: 0, educationCount: 0 });
  if (ownerIds.length === 0) return result;

  const range = {
    from: new Date(Date.now() - ROLLUP_DAYS * 24 * 60 * 60 * 1000),
    to: new Date(),
  };

  const [screenTime, activity, education] = await Promise.all([
    getScreenTimeSummary(familyId, range),
    getActivitySummary(familyId, range),
    getEducationActivitySummary(familyId, range),
  ]);

  for (const row of screenTime.byDevice) {
    const ownerId = deviceOwnerById.get(row.deviceId);
    const bucket = ownerId ? result.get(ownerId) : undefined;
    if (bucket) bucket.screenTimeSeconds += row.totalDurationSeconds;
  }
  for (const row of activity.byDevice) {
    const ownerId = deviceOwnerById.get(row.deviceId);
    const bucket = ownerId ? result.get(ownerId) : undefined;
    if (bucket) bucket.activityCount += row.eventCount;
  }
  for (const row of education.byDevice) {
    const ownerId = deviceOwnerById.get(row.deviceId);
    const bucket = ownerId ? result.get(ownerId) : undefined;
    if (bucket) bucket.educationCount += row.eventCount;
  }

  return result;
}

// GET /api/dashboard/overview
router.get('/dashboard/overview', async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ children: [] });
      return;
    }

    const kids = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.family_id, req.familyId));

    const childIds = kids.map((k) => k.id);
    const devices =
      childIds.length > 0
        ? await db
            .select()
            .from(devicesTable)
            .where(
              and(
                eq(devicesTable.family_id, req.familyId),
                inArray(devicesTable.owner_id, childIds),
              ),
            )
        : [];

    const devicesByOwner = new Map<string, typeof devices>();
    const deviceOwnerById = new Map<string, string>();
    for (const d of devices) {
      const list = devicesByOwner.get(d.owner_id) ?? [];
      list.push(d);
      devicesByOwner.set(d.owner_id, list);
      deviceOwnerById.set(d.id, d.owner_id);
    }

    const activityByOwner = await loadRecentActivityByOwner(
      req.familyId,
      childIds,
      deviceOwnerById,
    );

    res.json({
      children: kids.map((k) => ({
        id: k.id,
        name: k.name,
        ageBand: k.age_band,
        devices: (devicesByOwner.get(k.id) ?? []).map(safeDeviceSummary),
        recentActivity: {
          windowDays: ROLLUP_DAYS,
          screenTimeSeconds: activityByOwner.get(k.id)?.screenTimeSeconds ?? 0,
          activityCount: activityByOwner.get(k.id)?.activityCount ?? 0,
          educationCount: activityByOwner.get(k.id)?.educationCount ?? 0,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/children/:childId
router.get('/dashboard/children/:childId', async (req: AuthRequest, res, next) => {
  try {
    const childId = String(req.params.childId);

    if (!req.familyId) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const [child] = await db
      .select()
      .from(childrenTable)
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.family_id, req.familyId)))
      .limit(1);

    if (!child) {
      // 404 rather than 403 so callers can't distinguish "belongs to another
      // family" from "doesn't exist" - consistent with how devices.ts hides
      // unauthorized rows behind a 404 on lookup failure.
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const devices = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.owner_id, childId), eq(devicesTable.family_id, req.familyId)));

    const since = new Date(Date.now() - ROLLUP_DAYS * 24 * 60 * 60 * 1000);
    const events = await db
      .select({
        eventType: deviceEventsTable.event_type,
        payload: deviceEventsTable.payload,
        occurredAt: deviceEventsTable.occurred_at,
      })
      .from(deviceEventsTable)
      .where(
        and(
          eq(deviceEventsTable.owner_id, childId),
          eq(deviceEventsTable.family_id, req.familyId),
          gte(deviceEventsTable.occurred_at, since),
        ),
      );

    const screenTimeByDay = new Map<string, number>();
    const activityByType = new Map<string, number>();
    const educationByType = new Map<string, number>();

    for (const e of events) {
      if (e.eventType === 'screen_time') {
        const duration = (e.payload as Record<string, unknown>)?.durationSeconds;
        if (typeof duration === 'number' && Number.isFinite(duration)) {
          const day = e.occurredAt.toISOString().slice(0, 10);
          screenTimeByDay.set(day, (screenTimeByDay.get(day) ?? 0) + duration);
        }
      } else if (e.eventType === 'activity' || e.eventType === 'education_activity') {
        const activityType = (e.payload as Record<string, unknown>)?.activityType;
        const key = typeof activityType === 'string' && activityType ? activityType : 'unknown';
        const bucket = e.eventType === 'activity' ? activityByType : educationByType;
        bucket.set(key, (bucket.get(key) ?? 0) + 1);
      }
    }

    res.json({
      child: { id: child.id, name: child.name, ageBand: child.age_band },
      devices: devices.map(safeDeviceSummary),
      screenTime: {
        windowDays: ROLLUP_DAYS,
        byDay: Array.from(screenTimeByDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, seconds]) => ({ date, seconds })),
      },
      activity: {
        windowDays: ROLLUP_DAYS,
        byType: Array.from(activityByType.entries()).map(([type, count]) => ({ type, count })),
      },
      education: {
        windowDays: ROLLUP_DAYS,
        byType: Array.from(educationByType.entries()).map(([type, count]) => ({ type, count })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/children/:childId/progress
// Surfaces the child's curriculum progress (course completion %, earned
// badges, assessment score) to the parent. `user_progress` is keyed by
// user_id with no family scoping of its own, so ownership is enforced here
// the same way as the other child-scoped dashboard route: look the child up
// in the caller's family first, 404 if it's not there or doesn't exist.
router.get('/dashboard/children/:childId/progress', async (req: AuthRequest, res, next) => {
  try {
    const childId = String(req.params.childId);

    if (!req.familyId) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const [child] = await db
      .select()
      .from(childrenTable)
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.family_id, req.familyId)))
      .limit(1);

    if (!child) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    const [progress] = await db
      .select()
      .from(userProgressTable)
      .where(eq(userProgressTable.user_id, childId))
      .limit(1);

    if (!progress) {
      res.json({
        child: { id: child.id, name: child.name, ageBand: child.age_band },
        progress: null,
      });
      return;
    }

    const courseIds = Object.keys(progress.course_progress);
    const badgeIds = progress.earned_badges;

    const [courseRows, badgeRows] = await Promise.all([
      courseIds.length > 0
        ? db.select().from(coursesTable).where(inArray(coursesTable.id, courseIds))
        : Promise.resolve([]),
      badgeIds.length > 0
        ? db.select().from(badgesTable).where(inArray(badgesTable.id, badgeIds))
        : Promise.resolve([]),
    ]);

    const courseTitleById = new Map(courseRows.map((c) => [c.id, c.title]));

    res.json({
      child: { id: child.id, name: child.name, ageBand: child.age_band },
      progress: {
        completedLessonsCount: progress.completed_lessons.length,
        completedQuizzesCount: progress.completed_quizzes.length,
        courseProgress: courseIds.map((id) => ({
          courseId: id,
          title: courseTitleById.get(id) ?? 'Unknown course',
          percent: progress.course_progress[id],
        })),
        earnedBadges: badgeRows.map((b) => ({
          id: b.id,
          title: b.title,
          iconName: b.icon_name,
          color: b.color,
        })),
        assessmentScore: progress.assessment_score,
        assessmentCompletedAt: progress.assessment_completed_at,
        updatedAt: progress.updated_at.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
