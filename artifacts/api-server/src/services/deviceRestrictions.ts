import { db } from "@workspace/db";
import { deviceRestrictionsTable, devicesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export interface DeviceRestrictionsInput {
  screen_time_limit_minutes?: number | null;
  bedtime_start?: string | null;
  bedtime_end?: string | null;
  block_new_app_installs?: boolean;
  block_safari?: boolean;
  block_explicit_content?: boolean;
  require_parent_approval?: boolean;
}

async function deviceBelongsToFamily(deviceId: string, familyId: string) {
  const [device] = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.family_id, familyId)))
    .limit(1);

  return Boolean(device);
}

export async function getDeviceRestrictions(deviceId: string, familyId: string) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return null;
  }

  const result = await db
    .select()
    .from(deviceRestrictionsTable)
    .where(eq(deviceRestrictionsTable.device_id, deviceId))
    .limit(1);

  return result[0] ?? null;
}

export async function updateDeviceRestrictions(
  deviceId: string,
  familyId: string,
  data: DeviceRestrictionsInput
) {
  if (!(await deviceBelongsToFamily(deviceId, familyId))) {
    return null;
  }

  const existing = await db
    .select()
    .from(deviceRestrictionsTable)
    .where(eq(deviceRestrictionsTable.device_id, deviceId))
    .limit(1);

  if (!existing[0]) {
    const [created] = await db
      .insert(deviceRestrictionsTable)
      .values({
        id: crypto.randomUUID(),
        device_id: deviceId,
        family_id: familyId,
        ...data,
      })
      .returning();

    return created;
  }

  const [updated] = await db
    .update(deviceRestrictionsTable)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(deviceRestrictionsTable.device_id, deviceId))
    .returning();

  return updated;
}
