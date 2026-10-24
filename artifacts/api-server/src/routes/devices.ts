import { Router } from 'express';
import { db } from '@workspace/db';
import { devicesTable, deviceEventsTable } from '@workspace/db';
import { and, eq } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../lib/auth-middleware.js';
import { CAPABILITIES, isValidCapability, EVENT_TYPE_CAPABILITY } from '../lib/capabilities.js';

const router = Router();
router.use(requireAuth as any);

const PLATFORMS = ['ios', 'android'];

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
    const { id, name, platform, osVersion, appVersion, capabilities } = req.body as {
      id?: string;
      name?: string;
      platform?: string;
      osVersion?: string;
      appVersion?: string;
      capabilities?: string[];
    };

    if (!id || !name?.trim() || !platform) {
      res.status(400).json({ error: 'id, name, and platform required' });
      return;
    }

    if (!PLATFORMS.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` });
      return;
    }

    if (!req.familyId) {
      res.status(400).json({ error: 'join or create a family before registering a device' });
      return;
    }

    const caps = capabilities ?? [];
    if (!caps.every(isValidCapability)) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
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
    res.status(201).json({ device: safeDevice(device!), syncIntervalSeconds: SYNC_INTERVAL_SECONDS });
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

// GET /api/devices/:deviceId
router.get('/devices/:deviceId', async (req: AuthRequest, res, next) => {
  try {
    const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authorized) {
      res.status(403).json({ error: 'Not authorized for this device' });
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
      res.status(403).json({ error: 'Not authorized for this device' });
      return;
    }

    const { name, capabilities, permissionStatus } = req.body as {
      name?: string;
      capabilities?: string[];
      permissionStatus?: Record<string, string>;
    };

    if (capabilities !== undefined && !capabilities.every(isValidCapability)) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
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
router.delete('/devices/:deviceId', async (req: AuthRequest, res, next) => {
  try {
    const { device, authorized } = await loadDeviceForCaller(req, String(req.params.deviceId));
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    if (!authorized) {
      res.status(403).json({ error: 'Not authorized for this device' });
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

    const { permissionStatus, capabilities } = req.body as {
      permissionStatus?: Record<string, string>;
      capabilities?: string[];
    };

    if (capabilities !== undefined && !capabilities.every(isValidCapability)) {
      res
        .status(400)
        .json({ error: `capabilities must be a subset of: ${CAPABILITIES.join(', ')}` });
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

    res.json({ ok: true, lastSyncedAt: now.toISOString(), syncIntervalSeconds: SYNC_INTERVAL_SECONDS });
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

    const { id, eventType, payload, occurredAt } = req.body as {
      id?: string;
      eventType?: string;
      payload?: Record<string, unknown>;
      occurredAt?: string;
    };

    if (!id || !eventType) {
      res.status(400).json({ error: 'id and eventType required' });
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

    await db.insert(deviceEventsTable).values({
      id,
      device_id: deviceId,
      owner_id: req.userId!,
      family_id: device.family_id,
      event_type: eventType,
      payload: payload ?? {},
      occurred_at: occurredAt ? new Date(occurredAt) : new Date(),
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
