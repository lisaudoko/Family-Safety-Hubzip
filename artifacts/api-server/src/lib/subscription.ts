import { db } from '@workspace/db';
import { subscriptionsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** A family keeps premium access through `past_due` (grace period) until Stripe cancels the subscription outright. */
export async function isFamilyPremium(familyId: string | null | undefined): Promise<boolean> {
  if (!familyId) return false;
  const [sub] = await db
    .select({ status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.family_id, familyId))
    .limit(1);
  return !!sub && ACTIVE_STATUSES.has(sub.status);
}

export function currentPeriod(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
