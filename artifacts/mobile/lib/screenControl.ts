import { Platform } from "react-native";
import type { EffectivePolicy } from "@/lib/apiClient";

// On-device enforcement via Apple's Screen Time APIs (FamilyControls,
// ManagedSettings, DeviceActivity), through react-native-device-activity.
// Only works in a custom dev client / EAS build that includes the Family
// Controls entitlement - in Expo Go (and on Android) every function here is
// a safe no-op, so callers never need to guard.

type DeviceActivityModule = typeof import("react-native-device-activity");

let cached: DeviceActivityModule | null | undefined;

function native(): DeviceActivityModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "ios") return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-device-activity") as DeviceActivityModule;
    if (mod.isAvailable()) cached = mod;
  } catch {
    // Native module missing (Expo Go) - enforcement unavailable.
  }
  return cached;
}

export type ScreenControlStatus = "unavailable" | "notDetermined" | "denied" | "approved";

export function getScreenControlStatus(): ScreenControlStatus {
  const mod = native();
  if (!mod) return "unavailable";
  switch (mod.getAuthorizationStatus()) {
    case 2:
      return "approved";
    case 1:
      return "denied";
    default:
      return "notDetermined";
  }
}

// Child authorization: the child signs in with their own Apple ID in an iCloud
// Family, and a parent in that family approves the Screen Time request. This
// is what makes the restrictions un-removable by the child.
export async function requestChildAuthorization(): Promise<ScreenControlStatus> {
  const mod = native();
  if (!mod) return "unavailable";
  try {
    await mod.requestAuthorization("child");
  } catch {
    // Denied / cancelled - status below reflects it.
  }
  return getScreenControlStatus();
}

const BEDTIME_ACTIVITY = "dv_bedtime";
const MIN_INTERVAL_MINUTES = 15; // DeviceActivity rejects shorter schedules.

// Domains blocked when "Block Search Engines" is on.
const SEARCH_ENGINE_DOMAINS = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "ecosia.org",
  "search.brave.com",
  "baidu.com",
  "yandex.com",
  "startpage.com",
];

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":");
  return { hour: Number(h), minute: Number(m) };
}

function minutesOfDay(t: { hour: number; minute: number }): number {
  return t.hour * 60 + t.minute;
}

function isNowInWindow(start: { hour: number; minute: number }, end: { hour: number; minute: number }): boolean {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}

function applyBedtime(mod: DeviceActivityModule, startStr: string | null, endStr: string | null) {
  mod.stopMonitoring([BEDTIME_ACTIVITY]);

  if (!startStr || !endStr) {
    mod.disableBlockAllMode("dv_bedtime_cleared");
    return;
  }

  const start = parseTime(startStr);
  const end = parseTime(endStr);
  const length = (minutesOfDay(end) - minutesOfDay(start) + 1440) % 1440;
  if (length < MIN_INTERVAL_MINUTES) return;

  mod.updateShield(
    {
      title: "Bedtime",
      subtitle: "This device is resting until morning.",
      primaryButtonLabel: "OK",
      iconSystemName: "moon.stars.fill",
    },
    { primary: { behavior: "close" } },
  );

  // The monitor extension runs these even when the app is killed.
  mod.configureActions({
    activityName: BEDTIME_ACTIVITY,
    callbackName: "intervalDidStart",
    actions: [{ type: "enableBlockAllMode" }],
  });
  mod.configureActions({
    activityName: BEDTIME_ACTIVITY,
    callbackName: "intervalDidEnd",
    actions: [{ type: "disableBlockAllMode" }],
  });

  mod.startMonitoring(
    BEDTIME_ACTIVITY,
    {
      intervalStart: { hour: start.hour, minute: start.minute },
      intervalEnd: { hour: end.hour, minute: end.minute },
      repeats: true,
    },
    [],
  );

  // Apple only fires intervalDidStart at the boundary, so reconcile now.
  if (isNowInWindow(start, end)) mod.enableBlockAllMode("dv_bedtime_apply");
  else mod.disableBlockAllMode("dv_bedtime_apply");
}

function applyWebFilter(mod: DeviceActivityModule, blockSearch: boolean, blockExplicit: boolean) {
  if (blockExplicit) {
    // Apple's adult-content filter, plus search engines when requested.
    mod.setWebContentFilterPolicy(
      { type: "auto", domains: blockSearch ? SEARCH_ENGINE_DOMAINS : undefined },
      "dv_policy",
    );
  } else if (blockSearch) {
    mod.setWebContentFilterPolicy({ type: "specific", domains: SEARCH_ENGINE_DOMAINS }, "dv_policy");
  } else {
    mod.clearWebContentFilterPolicy("dv_policy");
  }
}

export interface ApplyResult {
  applied: boolean;
  reason?: "unavailable" | "not-authorized";
}

// Applies what the server resolved for this device. Idempotent - safe to call
// on every foreground. Not yet enforceable (needs per-device app selections
// from Apple's picker, or APIs the wrapper doesn't expose): daily screen-time
// limit, blockNewAppInstalls, requireParentApproval.
export function applyPolicy(policy: EffectivePolicy): ApplyResult {
  const mod = native();
  if (!mod) return { applied: false, reason: "unavailable" };
  if (getScreenControlStatus() !== "approved") return { applied: false, reason: "not-authorized" };

  applyWebFilter(mod, policy.blockSafari.value, policy.blockExplicitContent.value);
  applyBedtime(mod, policy.bedtimeStart.value, policy.bedtimeEnd.value);
  return { applied: true };
}
