import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { logger } from './logger.js';

// Live screen viewing goes through LiveKit Cloud (product decision 2026-11-26).
// Nothing is recorded: no egress is ever started. Tokens are minted only here,
// after the route has checked family/child ownership.

export interface LiveKitConfig {
  url: string; // wss://<project>.livekit.cloud, handed to the apps
  apiKey: string;
  apiSecret: string;
}

export function liveKitConfig(): LiveKitConfig | null {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

/**
 * A token for one room only. The child ("publisher") may publish a screen
 * track and nothing else, and cannot watch. The parent ("viewer") may watch
 * and cannot publish anything (no camera, mic or data).
 */
export async function mintScreenShareToken(
  cfg: LiveKitConfig,
  opts: { room: string; identity: string; name: string; role: 'publisher' | 'viewer'; ttlSeconds: number },
): Promise<string> {
  const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: Math.max(60, Math.floor(opts.ttlSeconds)),
  });
  token.addGrant({
    room: opts.room,
    roomJoin: true,
    canPublish: opts.role === 'publisher',
    canPublishSources: opts.role === 'publisher' ? [TrackSource.SCREEN_SHARE] : [],
    canPublishData: false,
    canSubscribe: opts.role === 'viewer',
  });
  return token.toJwt();
}

/** Closes the room so both phones disconnect. Best-effort; never throws. */
export function endLiveKitRoom(cfg: LiveKitConfig, room: string): void {
  const host = cfg.url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  void new RoomServiceClient(host, cfg.apiKey, cfg.apiSecret)
    .deleteRoom(room)
    .catch((err: unknown) => logger.warn({ err, room }, 'LiveKit deleteRoom failed (room may already be gone)'));
}
