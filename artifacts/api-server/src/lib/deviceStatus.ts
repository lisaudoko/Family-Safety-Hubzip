// Shared device sync-freshness logic, used by devices.ts, dashboard.ts, and
// notifications.ts so "is this device stale" means exactly the same thing
// everywhere a parent sees it.

// How often a device is expected to check in. Devices that haven't synced
// within this window are reported as stale to the parent, even though we
// don't run a background job to flip their stored `status` - staleness is
// computed on read instead.
export const SYNC_INTERVAL_SECONDS = 15 * 60;
export const STALE_AFTER_MS = SYNC_INTERVAL_SECONDS * 1000 * 3;

export function isDeviceStale(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - lastSyncedAt.getTime() > STALE_AFTER_MS;
}

export type DeviceStatus = 'online' | 'recent' | 'stale';

// "online" = synced within the expected check-in interval, "recent" = past
// that interval but within the stale window (running a bit behind), "stale"
// = hasn't checked in within 3x the expected interval, or never has.
export function deviceStatusLabel(lastSyncedAt: Date | null): DeviceStatus {
  if (!lastSyncedAt) return 'stale';
  const elapsedMs = Date.now() - lastSyncedAt.getTime();
  if (elapsedMs <= SYNC_INTERVAL_SECONDS * 1000) return 'online';
  if (elapsedMs <= STALE_AFTER_MS) return 'recent';
  return 'stale';
}
