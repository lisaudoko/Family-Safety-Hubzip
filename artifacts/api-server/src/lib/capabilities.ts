// Platform-neutral device capabilities. Every entry here must be something
// both iOS and Android can genuinely report — no OS-specific capabilities.
export const CAPABILITIES = [
  'screen_time_reporting',
  'activity_summary',
  'device_sync',
  'notifications',
  'family_participation',
  'lesson_participation',
  'website_filtering_status',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isValidCapability(value: unknown): value is Capability {
  return typeof value === 'string' && (CAPABILITIES as readonly string[]).includes(value);
}

// Maps an ingested event type to the capability a device must have
// registered in order to submit that kind of event.
export const EVENT_TYPE_CAPABILITY: Record<string, Capability> = {
  heartbeat: 'device_sync',
  screen_time: 'screen_time_reporting',
  activity: 'activity_summary',
};

export const EVENT_TYPES = Object.keys(EVENT_TYPE_CAPABILITY);
