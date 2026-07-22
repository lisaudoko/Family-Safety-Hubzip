import { Router } from 'express';
import { db } from '@workspace/db';
import { devicesTable, deviceEventsTable } from '@workspace/db';
import { and, eq, gte, lte, desc, type SQL } from 'drizzle-orm';
import { requireAuth, requireParent, type AuthRequest } from '../lib/auth-middleware.js';
import {
  CAPABILITIES,
  isValidCapability,
  EVENT_TYPE_CAPABILITY,
  EVENT_TYPES,
} from '../lib/capabilities.js';
import {
  getDeviceRestrictions,
  updateDeviceRestrictions,
  type DeviceRestrictionsInput,
} from "../services/deviceRestrictions.js";
import {
  listDeviceAppRules,
  createDeviceAppRule,
  updateDeviceAppRule,
  deleteDeviceAppRule,
} from "../services/deviceAppRules.js";
import { deviceRestrictionsTable, deviceAppRulesTable } from "@workspace/db";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimeOrNull(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && TIME_PATTERN.test(v));
}

function safeDeviceAppRule(r: typeof deviceAppRulesTable.$inferSelect) {
  return {
    id: r.id,
    restrictionId: r.restriction_id,
    appBundleId: r.app_bundle_id,
    appName: r.app_name,
    blocked: r.blocked,
    bedtimeLocked: r.bedtime_locked,
    dailyLimitMinutes: r.daily_limit_minutes,
    restrictedStart: r.restricted_start,
    restrictedEnd: r.restricted_end,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

const router = Router();
router.use(requireAuth as any);

const PLATFORMS = ['ios', 'android'];

const EVENTS_DEFAULT_LIMIT = 50;
const EVENTS_MAX_LIMIT = 100;

// Lightweight, dependency-free shape validation for event payloads. Only the
// event types with a well-known shape are checked; unrecognized event types
// are already rejected earlier via EVENT_TYPE_CAPABILITY.
function validateEventPayload(eventType: string, payload: unknown): string | null {
  if (payload !== undefined && payload !== null && typeof payload !== 'object') {
    return 'payload must be an object';
  }
  const p = (payload ?? {}) as Record<string, unknown>;

  if (eventType === 'screen_time') {
    if (
      typeof p.durationSeconds !== 'number' ||
      !Number.isFinite(p.durationSeconds) ||
      p.durationSeconds <= 0
    ) {
      return 'screen_time payload requires a positive numeric durationSeconds';
    }
    if (p.appName !== undefined && typeof p.appName !== 'string') {
      return 'screen_time payload appName must be a string';
    }
    if (p.category !== undefined && typeof p.category !== 'string') {
      return 'screen_time payload category must be a string';
    }
  } else if (eventType === 'activity' || eventType === 'education_activity') {
    if (typeof p.activityType !== 'string' || !p.activityType.trim()) {
      return `${eventType} payload requires a non-empty string activityType`;
    }
    if (
      p.details !== undefined &&
      (typeof p.details !== 'object' || p.details === null || Array.isArray(p.details))
    ) {
      return `${eventType} payload details must be an object`;
    }
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// permissionStatus is stored as a flat map of capability -> status string;
// reject anything else so malformed payloads fail cleanly instead of being
// persisted as-is or throwing deep inside a later .toString()/serialization.
function isValidPermissionStatus(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((v) => typeof v === 'string');
}

function safeDeviceEvent(e: typeof deviceEventsTable.$inferSelect) {
  return {
    id: e.id,
    deviceId: e.device_id,
    ownerId: e.owner_id,
    familyId: e.family_id,
    eventType: e.event_type,
    payload: e.payload,
    occurredAt: e.occurred_at.toISOString(),
    createdAt: e.created_at.toISOString(),
  };
}

// How often a device is expected to check in. Devices that haven't synced
// within this window are reported as stale to the parent, even though we
// don't run a background job to flip their stored `status` - staleness is
// computed on read instead.
const SYNC_INTERVAL_SECONDS = 15 * 60;
const STALE_AFTER_MS = SYNC_INTERVAL_SECONDS * 1000 * 3;

function isDeviceStale(d: typeof devicesTable.$inferSelect): boolean {
  if (!d.last_synced_at) return true;
  return Date.now() - d.last_synced_at.getTime() > STALE_AFTER_MS;
}

function safeDevice(d: typeof devicesTable.$inferSelect) {
  return {
    id: d.id,
    ownerId: d.owner_id,
    familyId: d.family_id,
    name: d.name,
    platform: d.platform,
    osVersion: d.os_version,
    appVersion: d.app_version,
    capabilities: d.capabilities,
    permissionStatus: d.permission_status,
    status: d.status,
    isStale: isDeviceStale(d),
    lastSyncedAt: d.last_synced_at?.toISOString() ?? null,
    createdAt: d.created_at.toISOString(),
    updatedAt: d.updated_at.toISOString(),
  };
}

async function loadDeviceForCaller(req: AuthRequest, deviceId: string) {
  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId))
    .limit(1);

  if (!device) return { device: null, authorized: false };

  const isOwner = device.owner_id === req.userId;
  const isFamilyParent = req.role === 'parent' && device.family_id === req.familyId;
  return { device, authorized: isOwner || isFamilyParent };
}

// POST /api/devices
router.post('/devices', async (req: AuthRequest, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'request body must be a JSON object' });
      return;
    }

    const { id, name, platform, osVersion, appVersion, capabilities } = req.body as {
      id?: string;
      name?: string;
      platform?: string;
      osVersion?: string;
      appVersion?: string;
      capabilities?: string[];
    };

    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof name !== 'string' ||
      !name.trim() ||
      typeof platform !== 'string'
    ) {
      res.status(400).json({ error: 'id, name, and platform required' });
      return;
    }

    if (!PLATFORMS.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` });
      return;
    }

    if (osVersion !== undefined && typeof osVersion !== 'string') {
      res.status(400).json({ error: 'osVersion must be a string' });
      return;
    }

    if (appVersion !== undefined && typeof appVersion !== 'string') {
      res.status(400).json({ error: 'appVersion must be a string' });
      return;
    }

    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family before registering a device' });
      return;
    }

    const caps = capabilities ?? [];
    if (!Array.isArray(caps) || !caps.every(isValidCapability)) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
      return;
    }

    const [existing] = await db
      .select({ owner_id: devicesTable.owner_id })
      .from(devicesTable)
      .where(eq(devicesTable.id, id))
      .limit(1);
    if (existing && existing.owner_id !== req.userId) {
      res.status(409).json({ error: 'device id already registered to another account' });
      return;
    }

    await db
      .insert(devicesTable)
      .values({
        id,
        owner_id: req.userId!,
        family_id: req.familyId,
        name: name.trim(),
        platform,
        os_version: osVersion ?? null,
        app_version: appVersion ?? null,
        capabilities: caps,
      })
      .onConflictDoUpdate({
        target: devicesTable.id,
        set: {
          name: name.trim(),
          os_version: osVersion ?? null,
          app_version: appVersion ?? null,
          capabilities: caps,
          updated_at: new Date(),
        },
      });

    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, id)).limit(1);
    res
      .status(201)
      .json({ device: safeDevice(device!), syncIntervalSeconds: SYNC_INTERVAL_SECONDS });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices
router.get('/devices', async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ devices: [] });
      return;
    }

    const where =
      req.role === 'parent'
        ? eq(devicesTable.family_id, req.familyId)
        : eq(devicesTable.owner_id, req.userId!);

    const devices = await db.select().from(devicesTable).where(where);
    res.json({ devices: devices.map(safeDevice) });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/events - parent-only listing of device events for their
// family, filterable by device, event type, and occurred_at date range.
router.get('/devices/events', requireParent as any, async (req: AuthRequest, res, next) => {
  try {
    if (!req.familyId) {
      res.json({ events: [], limit: EVENTS_DEFAULT_LIMIT, offset: 0 });
      return;
    }

    const { deviceId, eventType, from, to } = req.query as {
      deviceId?: unknown;
      eventType?: unknown;
      from?: unknown;
      to?: unknown;
    };

    if (deviceId !== undefined && typeof deviceId !== 'string') {
      res.status(400).json({ error: 'deviceId must be a single string value' });
      return;
    }

    if (eventType !== undefined && typeof eventType !== 'string') {
      res.status(400).json({ error: 'eventType must be a single string value' });
      return;
    }

    if (eventType !== undefined && !EVENT_TYPES.includes(eventType)) {
      res.status(400).json({ error: `eventType must be one of: ${EVENT_TYPES.join(', ')}` });
      return;
    }

    if (from !== undefined && typeof from !== 'string') {
      res.status(400).json({ error: 'from must be a valid ISO date string' });
      return;
    }
    if (to !== undefined && typeof to !== 'string') {
      res.status(400).json({ error: 'to must be a valid ISO date string' });
      return;
    }

    let fromDate: Date | undefined;
    if (from !== undefined) {
      fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) {
        res.status(400).json({ error: 'from must be a valid ISO date string' });
        return;
      }
    }

    let toDate: Date | undefined;
    if (to !== undefined) {
      toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) {
        res.status(400).json({ error: 'to must be a valid ISO date string' });
        return;
      }
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      res.status(400).json({ error: 'from must be before to' });
      return;
    }

    const MAX_EVENTS_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
    if (fromDate && toDate && toDate.getTime() - fromDate.getTime() > MAX_EVENTS_RANGE_MS) {
      res.status(400).json({ error: 'date range must not exceed 366 days' });
      return;
    }

    const rawLimit = Number(req.query.limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), EVENTS_MAX_LIMIT)
        : EVENTS_DEFAULT_LIMIT;

    const rawOffset = Number(req.query.offset);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;

    const conditions: SQL[] = [eq(deviceEventsTable.family_id, req.familyId)];
    if (deviceId) conditions.push(eq(deviceEventsTable.device_id, deviceId));
    if (eventType) conditions.push(eq(deviceEventsTable.event_type, eventType));
    if (fromDate) conditions.push(gte(deviceEventsTable.occurred_at, fromDate));
    if (toDate) conditions.push(lte(deviceEventsTable.occurred_at, toDate));

    const events = await db
      .select()
      .from(deviceEventsTable)
      .where(and(...conditions))
      .orderBy(desc(deviceEventsTable.occurred_at))
      .limit(limit)
      .offset(offset);

    res.json({ events: events.map(safeDeviceEvent), limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:deviceId
router.get('/devices/:deviceId', async (req: AuthRequest, res, next) => {
  try {
    const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authorized) {
      // 404 (not 403) so callers can't distinguish "belongs to another
      // family" from "doesn't exist" by probing device ids.
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    res.json({ device: safeDevice(device) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/devices/:deviceId
router.patch('/devices/:deviceId', async (req: AuthRequest, res, next) => {
  try {
    const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authorized) {
      // 404 (not 403) so callers can't distinguish "belongs to another
      // family" from "doesn't exist" by probing device ids.
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'request body must be a JSON object' });
      return;
    }

    const { name, capabilities, permissionStatus } = req.body as {
      name?: string;
      capabilities?: string[];
      permissionStatus?: Record<string, string>;
    };

    if (name !== undefined && typeof name !== 'string') {
      res.status(400).json({ error: 'name must be a string' });
      return;
    }

    if (
      capabilities !== undefined &&
      (!Array.isArray(capabilities) || !capabilities.every(isValidCapability))
    ) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
      return;
    }

    if (permissionStatus !== undefined && !isValidPermissionStatus(permissionStatus)) {
      res
        .status(400)
        .json({ error: 'permissionStatus must be an object mapping strings to strings' });
      return;
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (capabilities !== undefined) updates.capabilities = capabilities;
    if (permissionStatus !== undefined) updates.permission_status = permissionStatus;

    await db.update(devicesTable).set(updates).where(eq(devicesTable.id, device.id));

    const [updated] = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, device.id))
      .limit(1);
    res.json({ device: safeDevice(updated!) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/devices/:deviceId
// Parent-only: a child de-registering a monitored device would let them
// evade oversight, unlike POST (self-registration) which is legitimately
// something a child's own device does on first launch.
router.delete('/devices/:deviceId', requireParent, async (req: AuthRequest, res, next) => {
  try {
    const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authorized) {
      // 404 (not 403) so callers can't distinguish "belongs to another
      // family" from "doesn't exist" by probing device ids.
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    await db.delete(devicesTable).where(eq(devicesTable.id, device.id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/:deviceId/heartbeat
router.post('/devices/:deviceId/heartbeat', async (req: AuthRequest, res, next) => {
  try {
    const deviceId = String(req.params.deviceId);
    const [device] = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.owner_id, req.userId!)))
      .limit(1);

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'request body must be a JSON object' });
      return;
    }

    const { permissionStatus, capabilities } = req.body as {
      permissionStatus?: Record<string, string>;
      capabilities?: string[];
    };

    if (
      capabilities !== undefined &&
      (!Array.isArray(capabilities) || !capabilities.every(isValidCapability))
    ) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
      return;
    }

    if (permissionStatus !== undefined && !isValidPermissionStatus(permissionStatus)) {
      res
        .status(400)
        .json({ error: 'permissionStatus must be an object mapping strings to strings' });
      return;
    }

    const now = new Date();

    const updates: Record<string, unknown> = {
      last_synced_at: now,
      status: 'active',
      updated_at: now,
    };
    if (permissionStatus !== undefined) updates.permission_status = permissionStatus;
    // A device's real capabilities can change between heartbeats (e.g. the
    // user revoked a permission), so reconcile them here instead of only at
    // registration time.
    if (capabilities !== undefined) updates.capabilities = capabilities;

    await db.update(devicesTable).set(updates).where(eq(devicesTable.id, deviceId));

    await db.insert(deviceEventsTable).values({
      id: `${deviceId}_hb_${now.getTime()}`,
      device_id: deviceId,
      owner_id: req.userId!,
      family_id: device.family_id,
      event_type: 'heartbeat',
      payload: {},
      occurred_at: now,
    });

    res.json({
      ok: true,
      lastSyncedAt: now.toISOString(),
      syncIntervalSeconds: SYNC_INTERVAL_SECONDS,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/:deviceId/events
router.post('/devices/:deviceId/events', async (req: AuthRequest, res, next) => {
  try {
    const deviceId = String(req.params.deviceId);
    const [device] = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.owner_id, req.userId!)))
      .limit(1);

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'request body must be a JSON object' });
      return;
    }

    const { id, eventType, payload, occurredAt } = req.body as {
      id?: string;
      eventType?: string;
      payload?: Record<string, unknown>;
      occurredAt?: string;
    };

    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof eventType !== 'string' ||
      !eventType.trim()
    ) {
      res.status(400).json({ error: 'id and eventType required' });
      return;
    }

    if (occurredAt !== undefined && typeof occurredAt !== 'string') {
      res.status(400).json({ error: 'occurredAt must be a valid ISO date string' });
      return;
    }

    const requiredCapability = EVENT_TYPE_CAPABILITY[eventType];
    if (!requiredCapability) {
      res.status(400).json({ error: `unsupported eventType: ${eventType}` });
      return;
    }
    if (!device.capabilities.includes(requiredCapability)) {
      res
        .status(403)
        .json({ error: `device does not have the '${requiredCapability}' capability registered` });
      return;
    }

    const payloadError = validateEventPayload(eventType, payload);
    if (payloadError) {
      res.status(400).json({ error: payloadError });
      return;
    }

    let occurredAtDate = new Date();
    if (occurredAt !== undefined) {
      occurredAtDate = new Date(occurredAt);
      if (Number.isNaN(occurredAtDate.getTime())) {
        res.status(400).json({ error: 'occurredAt must be a valid ISO date string' });
        return;
      }
    }

    await db.insert(deviceEventsTable).values({
      id,
      device_id: deviceId,
      owner_id: req.userId!,
      family_id: device.family_id,
      event_type: eventType,
      payload: payload ?? {},
      occurred_at: occurredAtDate,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
function safeDeviceRestrictions(r: typeof deviceRestrictionsTable.$inferSelect) {
  return {
    id: r.id,
    deviceId: r.device_id,
    familyId: r.family_id,
    screenTimeLimitMinutes: r.screen_time_limit_minutes,
    bedtimeStart: r.bedtime_start,
    bedtimeEnd: r.bedtime_end,
    blockNewAppInstalls: r.block_new_app_installs,
    blockSafari: r.block_safari,
    blockExplicitContent: r.block_explicit_content,
    requireParentApproval: r.require_parent_approval,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function validateRestrictionsPatch(body: unknown): { data?: DeviceRestrictionsInput; error?: string } {
  if (!isPlainObject(body)) {
    return { error: "request body must be a JSON object" };
  }

  const data: DeviceRestrictionsInput = {};
  const b = body as Record<string, unknown>;

  if ("screenTimeLimitMinutes" in b) {
    if (b.screenTimeLimitMinutes !== null && typeof b.screenTimeLimitMinutes !== "number") {
      return { error: "screenTimeLimitMinutes must be a number or null" };
    }
    data.screen_time_limit_minutes = b.screenTimeLimitMinutes as number | null;
  }
  if ("bedtimeStart" in b) {
    if (b.bedtimeStart !== null && typeof b.bedtimeStart !== "string") {
      return { error: "bedtimeStart must be a string or null" };
    }
    data.bedtime_start = b.bedtimeStart as string | null;
  }
  if ("bedtimeEnd" in b) {
    if (b.bedtimeEnd !== null && typeof b.bedtimeEnd !== "string") {
      return { error: "bedtimeEnd must be a string or null" };
    }
    data.bedtime_end = b.bedtimeEnd as string | null;
  }
  if ("blockNewAppInstalls" in b) {
    if (typeof b.blockNewAppInstalls !== "boolean") {
      return { error: "blockNewAppInstalls must be a boolean" };
    }
    data.block_new_app_installs = b.blockNewAppInstalls;
  }
  if ("blockSafari" in b) {
    if (typeof b.blockSafari !== "boolean") {
      return { error: "blockSafari must be a boolean" };
    }
    data.block_safari = b.blockSafari;
  }
  if ("blockExplicitContent" in b) {
    if (typeof b.blockExplicitContent !== "boolean") {
      return { error: "blockExplicitContent must be a boolean" };
    }
    data.block_explicit_content = b.blockExplicitContent;
  }
  if ("requireParentApproval" in b) {
    if (typeof b.requireParentApproval !== "boolean") {
      return { error: "requireParentApproval must be a boolean" };
    }
    data.require_parent_approval = b.requireParentApproval;
  }

  return { data };
}

// GET /api/devices/:deviceId/restrictions
router.get(
  "/devices/:deviceId/restrictions",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      const restrictions = await getDeviceRestrictions(
        String(req.params.deviceId),
        req.familyId!
      );

      res.json({ restrictions: restrictions ? safeDeviceRestrictions(restrictions) : null });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/devices/:deviceId/restrictions
router.patch(
  "/devices/:deviceId/restrictions",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      const { data, error } = validateRestrictionsPatch(req.body);
      if (error || !data) {
        res.status(400).json({ error });
        return;
      }

      const restrictions = await updateDeviceRestrictions(
        String(req.params.deviceId),
        req.familyId!,
        data
      );

      if (!restrictions) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      res.json({ restrictions: safeDeviceRestrictions(restrictions) });
    } catch (err) {
      next(err);
    }
  }
);

// ── Device App Rules (per-installed-app accessible/inaccessible windows) ────
//
// Scope note: this is policy storage only ("General Apps" — parent sets
// per-app time windows and block/limit intent). There is no on-device
// enforcement agent; nothing here actually restricts app access on the
// device. See docs/POLICY_ENGINE.md.

// GET /api/devices/:deviceId/app-rules
router.get(
  "/devices/:deviceId/app-rules",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      const rules = await listDeviceAppRules(String(req.params.deviceId), req.familyId!);
      if (rules === null) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      res.json({ rules: rules.map(safeDeviceAppRule) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/devices/:deviceId/app-rules
router.post(
  "/devices/:deviceId/app-rules",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      if (!isPlainObject(req.body)) {
        res.status(400).json({ error: "request body must be a JSON object" });
        return;
      }
      const b = req.body;

      const appBundleId = typeof b.appBundleId === "string" ? b.appBundleId.trim() : "";
      const appName = typeof b.appName === "string" ? b.appName.trim() : "";
      if (!appBundleId || !appName) {
        res.status(400).json({ error: "appBundleId and appName are required" });
        return;
      }
      if (b.blocked !== undefined && typeof b.blocked !== "boolean") {
        res.status(400).json({ error: "blocked must be a boolean" });
        return;
      }
      if (b.bedtimeLocked !== undefined && typeof b.bedtimeLocked !== "boolean") {
        res.status(400).json({ error: "bedtimeLocked must be a boolean" });
        return;
      }
      if (
        b.dailyLimitMinutes !== undefined &&
        b.dailyLimitMinutes !== null &&
        (typeof b.dailyLimitMinutes !== "number" || b.dailyLimitMinutes <= 0)
      ) {
        res.status(400).json({ error: "dailyLimitMinutes must be a positive number or null" });
        return;
      }
      if (!isValidTimeOrNull(b.restrictedStart) || !isValidTimeOrNull(b.restrictedEnd)) {
        res.status(400).json({ error: "restrictedStart/restrictedEnd must be HH:MM or null" });
        return;
      }

      const rule = await createDeviceAppRule(String(req.params.deviceId), req.familyId!, {
        app_bundle_id: appBundleId,
        app_name: appName,
        blocked: b.blocked as boolean | undefined,
        bedtime_locked: b.bedtimeLocked as boolean | undefined,
        daily_limit_minutes: b.dailyLimitMinutes as number | null | undefined,
        restricted_start: b.restrictedStart as string | null | undefined,
        restricted_end: b.restrictedEnd as string | null | undefined,
      });

      if (!rule) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      res.status(201).json({ rule: safeDeviceAppRule(rule) });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/devices/:deviceId/app-rules/:ruleId
router.patch(
  "/devices/:deviceId/app-rules/:ruleId",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      if (!isPlainObject(req.body)) {
        res.status(400).json({ error: "request body must be a JSON object" });
        return;
      }
      const b = req.body;
      const patch: Parameters<typeof updateDeviceAppRule>[3] = {};

      if ("appName" in b) {
        if (typeof b.appName !== "string" || !b.appName.trim()) {
          res.status(400).json({ error: "appName must be a non-empty string" });
          return;
        }
        patch.app_name = b.appName.trim();
      }
      if ("blocked" in b) {
        if (typeof b.blocked !== "boolean") {
          res.status(400).json({ error: "blocked must be a boolean" });
          return;
        }
        patch.blocked = b.blocked;
      }
      if ("bedtimeLocked" in b) {
        if (typeof b.bedtimeLocked !== "boolean") {
          res.status(400).json({ error: "bedtimeLocked must be a boolean" });
          return;
        }
        patch.bedtime_locked = b.bedtimeLocked;
      }
      if ("dailyLimitMinutes" in b) {
        if (
          b.dailyLimitMinutes !== null &&
          (typeof b.dailyLimitMinutes !== "number" || b.dailyLimitMinutes <= 0)
        ) {
          res.status(400).json({ error: "dailyLimitMinutes must be a positive number or null" });
          return;
        }
        patch.daily_limit_minutes = b.dailyLimitMinutes as number | null;
      }
      if ("restrictedStart" in b) {
        if (!isValidTimeOrNull(b.restrictedStart)) {
          res.status(400).json({ error: "restrictedStart must be HH:MM or null" });
          return;
        }
        patch.restricted_start = b.restrictedStart as string | null;
      }
      if ("restrictedEnd" in b) {
        if (!isValidTimeOrNull(b.restrictedEnd)) {
          res.status(400).json({ error: "restrictedEnd must be HH:MM or null" });
          return;
        }
        patch.restricted_end = b.restrictedEnd as string | null;
      }

      const rule = await updateDeviceAppRule(
        String(req.params.deviceId),
        req.familyId!,
        String(req.params.ruleId),
        patch
      );

      if (!rule) {
        res.status(404).json({ error: "app rule not found" });
        return;
      }

      res.json({ rule: safeDeviceAppRule(rule) });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/devices/:deviceId/app-rules/:ruleId
router.delete(
  "/devices/:deviceId/app-rules/:ruleId",
  requireParent as any,
  async (req: AuthRequest, res, next) => {
    try {
      const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
      if (!device || !authorized) {
        res.status(404).json({ error: "device not found" });
        return;
      }

      const ok = await deleteDeviceAppRule(
        String(req.params.deviceId),
        req.familyId!,
        String(req.params.ruleId)
      );

      if (!ok) {
        res.status(404).json({ error: "app rule not found" });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
