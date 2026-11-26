import { db } from '@workspace/db';
import { profilesTable, subscriptionsTable } from '@workspace/db';
import { and, eq } from 'drizzle-orm';

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** A family keeps premium access through `past_due` (grace period) until Stripe cancels the subscription outright. */
export async function isFamilyPremium(familyId: string | null | undefined): Promise<boolean> {
  if (!familyId) return false;
  const [sub] = await db
    .select({ status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.family_id, familyId))
    .limit(1);
  if (sub && ACTIVE_STATUSES.has(sub.status)) return true;

  // App Store / Google Play subscriptions (RevenueCat) have no Stripe row; their
  // state lives in the family tier that /billing/sync-purchases and the
  // RevenueCat webhook maintain (Stripe events update it too).
  const [premiumProfile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(and(eq(profilesTable.family_id, familyId), eq(profilesTable.subscription_tier, 'premium')))
    .limit(1);
  return !!premiumProfile;
}

export function currentPeriod(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
