import { db } from "@workspace/db";
import {
  deviceAppRulesTable,
  deviceRestrictionsTable,
  devicesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export interface DeviceAppRuleInput {
  app_bundle_id: string;
  app_name: string;
  blocked?: boolean;
  bedtime_locked?: boolean;
  daily_limit_minutes?: number | null;
  restricted_start?: string | null;
  restricted_end?: string | null;
}

export interface DeviceAppRulePatch {
  app_name?: string;
  blocked?: boolean;
  bedtime_locked?: boolean;
  daily_limit_minutes?: number | null;
  restricted_start?: string | null;
  restricted_end?: string | null;
}

async function deviceBelongsToFamily(deviceId: string, familyId: string) {
  const [device] = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.family_id, familyId)))
    .limit(1);

  return Boolean(device);
}

// device_app_rules hangs off a device_restrictions row (restriction_id), not
// the device directly. Get-or-create that row so parents can set app rules
// even before ever touching the device-level restriction toggles.
async function getOrCreateRestrictionId(deviceId: string, familyId: string) {
  const existing = await db
    .select({ id: deviceRestrictionsTable.id })
    .from(deviceRestrictionsTable)
    .where(eq(deviceRestrictionsTable.device_id, deviceId))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(deviceRestrictionsTable)
    .values({
      id: crypto.randomUUID(),
      device_id: deviceId,
      family_id: familyId,
    })
    .returning({ id: deviceRestrictionsTable.id });

  return created!.id;
}

export async function listDeviceAppRules(deviceId: string, familyId: string) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return null;
  }

  const [restriction] = await db
    .select({ id: deviceRestrictionsTable.id })
    .from(deviceRestrictionsTable)
    .where(eq(deviceRestrictionsTable.device_id, deviceId))
    .limit(1);

  if (!restriction) return [];

  return db
    .select()
    .from(deviceAppRulesTable)
    .where(eq(deviceAppRulesTable.restriction_id, restriction.id));
}

export async function createDeviceAppRule(
  deviceId: string,
  familyId: string,
  data: DeviceAppRuleInput
) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return null;
  }

  const restrictionId = await getOrCreateRestrictionId(deviceId, familyId);

  const [created] = await db
    .insert(deviceAppRulesTable)
    .values({
      id: crypto.randomUUID(),
      restriction_id: restrictionId,
      ...data,
    })
    .onConflictDoUpdate({
      target: [deviceAppRulesTable.restriction_id, deviceAppRulesTable.app_bundle_id],
      set: {
        app_name: data.app_name,
        blocked: data.blocked ?? false,
        bedtime_locked: data.bedtime_locked ?? false,
        daily_limit_minutes: data.daily_limit_minutes ?? null,
        restricted_start: data.restricted_start ?? null,
        restricted_end: data.restricted_end ?? null,
        updated_at: new Date(),
      },
    })
    .returning();

  return created;
}

async function ruleBelongsToDevice(ruleId: string, deviceId: string) {
  const [row] = await db
    .select({ id: deviceAppRulesTable.id })
    .from(deviceAppRulesTable)
    .innerJoin(
      deviceRestrictionsTable,
      eq(deviceRestrictionsTable.id, deviceAppRulesTable.restriction_id)
    )
    .where(
      and(
        eq(deviceAppRulesTable.id, ruleId),
        eq(deviceRestrictionsTable.device_id, deviceId)
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function updateDeviceAppRule(
  deviceId: string,
  familyId: string,
  ruleId: string,
  data: DeviceAppRulePatch
) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return null;
  }
  if (!(await ruleBelongsToDevice(ruleId, deviceId))) {
    return null;
  }

  const [updated] = await db
    .update(deviceAppRulesTable)
    .set({ ...data, updated_at: new Date() })
    .where(eq(deviceAppRulesTable.id, ruleId))
    .returning();

  return updated;
}

export async function deleteDeviceAppRule(
  deviceId: string,
  familyId: string,
  ruleId: string
) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return false;
  }
  if (!(await ruleBelongsToDevice(ruleId, deviceId))) {
    return false;
  }

  await db.delete(deviceAppRulesTable).where(eq(deviceAppRulesTable.id, ruleId));
  return true;
}
