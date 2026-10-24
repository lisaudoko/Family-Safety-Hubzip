import { Router } from 'express';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import {
  getScreenTimeSummary,
  getActivitySummary,
  getEducationActivitySummary,
  type DateRangeParseResult,
} from '../lib/analytics.js';

const router = Router();
router.use(requireAuth as any);

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

function parseDateRange(query: Record<string, unknown>): DateRangeParseResult {
  const { from, to } = query as { from?: unknown; to?: unknown };

  if (to !== undefined && typeof to !== 'string') {
    return { error: 'to must be a valid ISO date string' };
  }
  if (from !== undefined && typeof from !== 'string') {
    return { error: 'from must be a valid ISO date string' };
  }

  const now = new Date();
  let toDate = now;
  if (to !== undefined) {
    toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      return { error: 'to must be a valid ISO date string' };
    }
  }

  let fromDate = new Date(toDate.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  if (from !== undefined) {
    fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      return { error: 'from must be a valid ISO date string' };
    }
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return { error: 'from must be before to' };
  }

  if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_MS) {
    return { error: 'date range must not exceed 366 days' };
  }

  return { range: { from: fromDate, to: toDate } };
}

// GET /api/analytics/screen-time?from=&to=&deviceId=
router.get('/analytics/screen-time', requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const parsed = parseDateRange(req.query as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    const summary = await getScreenTimeSummary(req.familyId, parsed.range, deviceId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/activity?from=&to=&deviceId=
router.get('/analytics/activity', requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const parsed = parseDateRange(req.query as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    const summary = await getActivitySummary(req.familyId, parsed.range, deviceId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/education?from=&to=&deviceId= - lesson/quiz/challenge/
// assessment completions, kept separate from /activity (general app usage).
router.get('/analytics/education', requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const parsed = parseDateRange(req.query as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    const summary = await getEducationActivitySummary(req.familyId, parsed.range, deviceId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/summary?from=&to=&deviceId= - combined screen-time,
// activity, and education summaries in a single response, for convenience.
router.get('/analytics/summary', requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family first' });
      return;
    }

    const parsed = parseDateRange(req.query as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    const [screenTime, activity, education] = await Promise.all([
      getScreenTimeSummary(req.familyId, parsed.range, deviceId),
      getActivitySummary(req.familyId, parsed.range, deviceId),
      getEducationActivitySummary(req.familyId, parsed.range, deviceId),
    ]);
    res.json({ screenTime, activity, education });
  } catch (err) {
    next(err);
  }
});

export default router;
