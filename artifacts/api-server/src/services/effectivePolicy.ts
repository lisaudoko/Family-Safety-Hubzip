import { db } from '@workspace/db';
import { childrenTable, devicesTable, familyPoliciesTable, childPoliciesTable, deviceRestrictionsTable } from '@workspace/db';
import { and, eq } from 'drizzle-orm';

type Layer = 'family' | 'child' | 'device';

export interface EffectivePolicyValue<T> {
  value: T;
  source: Layer | 'default';
}

export interface EffectiveFlag {
  value: boolean;
  sources: Layer[];
}

export interface EffectivePolicy {
  screenTimeLimitMinutes: EffectivePolicyValue<number | null>;
  bedtimeStart: EffectivePolicyValue<string | null>;
  bedtimeEnd: EffectivePolicyValue<string | null>;
  blockNewAppInstalls: EffectiveFlag;
  blockSafari: EffectiveFlag;
  blockExplicitContent: EffectiveFlag;
  requireParentApproval: EffectiveFlag;
}

interface PolicyRow {
  screen_time_limit_minutes: number | null;
  bedtime_start: string | null;
  bedtime_end: string | null;
  block_new_app_installs: boolean;
  block_safari: boolean;
  block_explicit_content: boolean;
  require_parent_approval: boolean;
}

type LayerRow = { layer: Layer; row: PolicyRow | null };

// Nullable fields (limit/bedtime): most-specific layer that has set a
// non-null value wins - device beats child beats family, matching the
// precedence documented in docs/POLICY_ENGINE.md.
function resolveNullable<K extends 'screen_time_limit_minutes' | 'bedtime_start' | 'bedtime_end'>(
  layers: LayerRow[],
  key: K,
): EffectivePolicyValue<PolicyRow[K]> {
  for (const { layer, row } of layers) {
    const value = row?.[key];
    if (value !== null && value !== undefined) {
      return { value, source: layer };
    }
  }
  return { value: null as PolicyRow[K], source: 'default' };
}

// Boolean restriction flags default to `false` at the schema level, so an
// untouched row can't be distinguished from one where a parent explicitly
// chose "off" - "most specific layer wins" would risk a child/device row's
// default `false` silently overriding a family-level `true`. Instead these
// are OR-combined: the restriction applies if ANY layer that has a row
// enables it, which errs toward the safer/more restrictive outcome.
function resolveFlag(
  layers: LayerRow[],
  key: 'block_new_app_installs' | 'block_safari' | 'block_explicit_content' | 'require_parent_approval',
): EffectiveFlag {
  const sources: Layer[] = [];
  for (const { layer, row } of layers) {
    if (row?.[key]) sources.push(layer);
  }
  return { value: sources.length > 0, sources };
}

// Resolves the effective policy for a child, optionally narrowed to one of
// their devices. Without a deviceId, only the family and child layers are
// considered - a child can have multiple devices with independent
// restrictions, and there's no single well-defined way to merge "most
// restrictive across all devices" for fields like a bedtime window, so that
// layer is only included when the caller asks about one specific device.
export async function getEffectivePolicy(
  childId: string,
  familyId: string,
  deviceId?: string,
): Promise<EffectivePolicy | null> {
  const [child] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.family_id, familyId)))
    .limit(1);

  if (!child) return null;

  let deviceRow: PolicyRow | null = null;
  if (deviceId) {
    const [device] = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.owner_id, childId), eq(devicesTable.family_id, familyId)))
      .limit(1);

    if (!device) return null;

    const [restrictions] = await db
      .select()
      .from(deviceRestrictionsTable)
      .where(eq(deviceRestrictionsTable.device_id, deviceId))
      .limit(1);

    deviceRow = restrictions ?? null;
  }

  const [familyRow] = await db.select().from(familyPoliciesTable).where(eq(familyPoliciesTable.family_id, familyId)).limit(1);
  const [childRow] = await db.select().from(childPoliciesTable).where(eq(childPoliciesTable.child_id, childId)).limit(1);

  const layers: LayerRow[] = [
    { layer: 'device', row: deviceRow },
    { layer: 'child', row: childRow ?? null },
    { layer: 'family', row: familyRow ?? null },
  ];

  return {
    screenTimeLimitMinutes: resolveNullable(layers, 'screen_time_limit_minutes'),
    bedtimeStart: resolveNullable(layers, 'bedtime_start'),
    bedtimeEnd: resolveNullable(layers, 'bedtime_end'),
    blockNewAppInstalls: resolveFlag(layers, 'block_new_app_installs'),
    blockSafari: resolveFlag(layers, 'block_safari'),
    blockExplicitContent: resolveFlag(layers, 'block_explicit_content'),
    requireParentApproval: resolveFlag(layers, 'require_parent_approval'),
  };
}
