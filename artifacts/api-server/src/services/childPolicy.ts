import { db } from "@workspace/db";
import { childPoliciesTable, childrenTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export interface ChildPolicyInput {
  screen_time_limit_minutes?: number | null;
  bedtime_start?: string | null;
  bedtime_end?: string | null;
  block_new_app_installs?: boolean;
  block_safari?: boolean;
  block_explicit_content?: boolean;
  require_parent_approval?: boolean;
}

async function childBelongsToFamily(childId: string, familyId: string) {
  const [child] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.family_id, familyId)))
    .limit(1);

  return Boolean(child);
}

export async function getChildPolicy(childId: string, familyId: string) {
  if (!(await childBelongsToFamily(childId, familyId))) {
    return null;
  }

  const result = await db
    .select()
    .from(childPoliciesTable)
    .where(eq(childPoliciesTable.child_id, childId))
    .limit(1);

  return result[0] ?? null;
}

export async function updateChildPolicy(
  childId: string,
  familyId: string,
  data: ChildPolicyInput
) {
  if (!(await childBelongsToFamily(childId, familyId))) {
    return null;
  }

  const existing = await db
    .select()
    .from(childPoliciesTable)
    .where(eq(childPoliciesTable.child_id, childId))
    .limit(1);

  if (!existing[0]) {
    const [created] = await db
      .insert(childPoliciesTable)
      .values({
        id: crypto.randomUUID(),
        child_id: childId,
        family_id: familyId,
        ...data,
      })
      .returning();

    return created;
  }

  const [updated] = await db
    .update(childPoliciesTable)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(childPoliciesTable.child_id, childId))
    .returning();

  return updated;
}
