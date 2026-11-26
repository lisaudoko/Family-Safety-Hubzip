import { Router, type IRouter } from 'express';
import { timingSafeEqual } from 'crypto';
import { runScheduledAlerts } from '../lib/alerts.js';
import { runRetentionCleanup } from '../lib/retention.js';

const router: IRouter = Router();

// POST /api/internal/run-jobs
// For an external scheduler (e.g. hourly), since scaled-to-zero instances run
// no timers. Authorization: "Bearer <JOBS_SECRET>". Disabled when unset.
router.post('/internal/run-jobs', async (req, res, next) => {
  try {
    const secret = process.env.JOBS_SECRET;
    const expected = secret ? `Bearer ${secret}` : '';
    const provided = req.headers.authorization ?? '';
    const ok =
      Boolean(secret) &&
      provided.length === expected.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const deleted = await runRetentionCleanup();
    await runScheduledAlerts();
    res.json({ ok: true, deleted });
  } catch (err) {
    next(err);
  }
});

export default router;
