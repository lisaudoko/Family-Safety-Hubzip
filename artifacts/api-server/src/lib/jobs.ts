import { runScheduledAlerts } from './alerts.js';
import { scheduleRetentionCleanup } from './retention.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * In-process timers: retention once a day, time-based alerts every hour.
 * Every job is idempotent and claims its work, so several instances are safe.
 * NOTE: an autoscale deployment that scales to zero runs no timers while
 * asleep; point an external scheduler at POST /api/internal/run-jobs too.
 */
export function scheduleBackgroundJobs(): void {
  scheduleRetentionCleanup();
  void runScheduledAlerts();
  setInterval(() => void runScheduledAlerts(), HOUR_MS).unref();
}
