import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db, devicesTable, profilesTable } from '@workspace/db';
import { logger } from './logger.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo's per-request limit

export interface PushMessage {
  title: string;
  body: string;
  /** In-app route to open when tapped, e.g. "/child/<id>" or "/(tabs)/family". */
  url?: string;
}

const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
export function isValidPushToken(token: unknown): token is string {
  return typeof token === 'string' && token.length <= 200 && TOKEN_PATTERN.test(token);
}

/** Strips control characters and caps length for text that came from a client. */
export function cleanText(value: unknown, max = 80): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Sends a push to every parent in the family that has notifications on (a
 * device with a push token). Never throws: alerts are best-effort and must not
 * break the request or job that triggered them. Returns how many were accepted.
 */
export async function notifyParents(familyId: string, message: PushMessage): Promise<number> {
  try {
    const rows = await db
      .select({ deviceId: devicesTable.id, token: devicesTable.push_token })
      .from(devicesTable)
      .innerJoin(profilesTable, eq(profilesTable.id, devicesTable.owner_id))
      .where(
        and(
          eq(devicesTable.family_id, familyId),
          eq(profilesTable.role, 'parent'),
          isNotNull(devicesTable.push_token),
        ),
      );
    const targets = rows.filter((r): r is { deviceId: string; token: string } => isValidPushToken(r.token));
    if (targets.length === 0) return 0;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    let sent = 0;
    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify(
          batch.map((t) => ({
            to: t.token,
            title: message.title,
            body: message.body,
            sound: 'default',
            data: message.url ? { url: message.url } : {},
          })),
        ),
      });
      if (!res.ok) {
        logger.error({ status: res.status }, 'expo push request failed');
        continue;
      }
      const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const dead: string[] = [];
      (body.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'ok') sent++;
        else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(batch[idx]!.deviceId);
      });
      // App uninstalled or notifications revoked at the OS level: stop sending.
      if (dead.length > 0) {
        await db.update(devicesTable).set({ push_token: null }).where(inArray(devicesTable.id, dead));
      }
    }
    return sent;
  } catch (err) {
    logger.error({ err, familyId }, 'notifyParents failed');
    return 0;
  }
}
