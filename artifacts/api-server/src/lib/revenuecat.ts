import { logger } from './logger.js';

const API_BASE = 'https://api.revenuecat.com/v1';

export const REVENUECAT_ENTITLEMENT_ID = process.env.REVENUECAT_ENTITLEMENT_ID ?? 'premium';

export function isRevenueCatConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY);
}

/**
 * Asks RevenueCat (server to server, with the secret key) whether this app user
 * currently holds the premium entitlement. The family id is the RevenueCat app
 * user id. Returns null when RevenueCat is not configured or unreachable so the
 * caller leaves the existing tier alone rather than downgrading on an outage.
 */
export async function fetchPremiumEntitlement(appUserId: string): Promise<boolean | null> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    // Unknown subscriber == never purchased.
    if (res.status === 404) return false;
    if (!res.ok) {
      logger.error({ status: res.status }, 'RevenueCat subscriber lookup failed');
      return null;
    }
    const body = (await res.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
    };
    const ent = body.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];
    if (!ent) return false;
    return ent.expires_date === null || new Date(ent.expires_date).getTime() > Date.now();
  } catch (err) {
    logger.error({ err }, 'RevenueCat subscriber lookup threw');
    return null;
  }
}
