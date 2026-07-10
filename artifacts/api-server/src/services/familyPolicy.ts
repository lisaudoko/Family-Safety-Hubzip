import { db } from "@workspace/db";
import { familyPoliciesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface FamilyPolicyInput {
  screen_time_limit_minutes?: number | null;
  bedtime_start?: string | null;
  bedtime_end?: string | null;
  block_new_app_installs?: boolean;
  block_safari?: boolean;
  block_explicit_content?: boolean;
  require_parent_approval?: boolean;
}

export async function getFamilyPolicy(familyId: string) {
  const result = await db
    .select()
    .from(familyPoliciesTable)
    .where(eq(familyPoliciesTable.family_id, familyId))
    .limit(1);

  return result[0] ?? null;
}

export async function updateFamilyPolicy(familyId: string, data: FamilyPolicyInput) {
  const existing = await db
    .select()
    .from(familyPoliciesTable)
    .where(eq(familyPoliciesTable.family_id, familyId))
    .limit(1);

  if (!existing[0]) {
    const [created] = await db
      .insert(familyPoliciesTable)
      .values({
        id: crypto.randomUUID(),
        family_id: familyId,
        ...data,
      })
      .returning();

    return created;
  }

  const [updated] = await db
    .update(familyPoliciesTable)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(familyPoliciesTable.family_id, familyId))
    .returning();

  return updated;
}
