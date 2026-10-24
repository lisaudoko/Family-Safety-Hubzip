import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Constants from "expo-constants";
import { apiDeviceHeartbeat, apiPostDeviceEvent, apiRegisterDevice } from "@/lib/apiClient";

const DEVICE_ID_KEY = "@dv_device_id";
const LAST_SYNC_KEY = "@dv_device_last_sync";
const DEFAULT_SYNC_INTERVAL_SECONDS = 15 * 60;

// Only submit a screen_time event for a foreground session that lasted at
// least this long, so brief app switches/backgrounds don't spam the API.
const MIN_FOREGROUND_SESSION_SECONDS = 20;

// Capabilities this app can genuinely back today, without any native
// permission APIs beyond what's already in the project. Kept separate from
// the server's full capability list so we never claim something we can't
// actually deliver.
const APP_CAPABILITIES = [
  "device_sync",
  "family_participation",
  "lesson_participation",
  "screen_time_reporting",
  "activity_summary",
];

function genEventId(): string {
  return "evt_" + Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = "dev_" + Date.now().toString() + Math.random().toString(36).slice(2, 8);
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// Registers this device (idempotent - safe to call repeatedly) and sends a
// heartbeat, throttled so background app-foreground events don't spam the
// API. Returns silently on any failure; sync is best-effort like the rest of
// this app's offline-friendly design.
export async function syncDeviceNow(force = false): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  try {
    const lastSyncRaw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSync = lastSyncRaw ? Number(lastSyncRaw) : 0;
    const intervalMs = DEFAULT_SYNC_INTERVAL_SECONDS * 1000;
    if (!force && Date.now() - lastSync < intervalMs) return;

    const deviceId = await getOrCreateDeviceId();

    try {
      await apiDeviceHeartbeat(deviceId, { capabilities: APP_CAPABILITIES });
    } catch {
      // Device may not be registered yet (first run) or was removed by a
      // parent - (re)register and try once more.
      await apiRegisterDevice({
        id: deviceId,
        name: Constants.deviceName ?? `${Platform.OS} device`,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        appVersion: Constants.expoConfig?.version,
        capabilities: APP_CAPABILITIES,
      });
      await apiDeviceHeartbeat(deviceId, { capabilities: APP_CAPABILITIES });
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    // best-effort
  }
}

// Keeps this device's registration and last-seen timestamp fresh while the
// user is authenticated, mirroring the AppState-driven retry pattern used
// for offline account sync in AuthContext.
export function useDeviceSync(isAuthenticated: boolean) {
  const started = useRef(false);

  const runSync = useCallback((force: boolean) => {
    if (!isAuthenticated) return;
    syncDeviceNow(force);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      started.current = false;
      return;
    }
    if (!started.current) {
      started.current = true;
      runSync(true);
    }
  }, [isAuthenticated, runSync]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", next => {
      if (next === "active") runSync(false);
    });
    return () => sub.remove();
  }, [runSync]);
}

// Submits a single device event best-effort: never throws, never blocks the
// caller, and silently drops the event on any network/registration failure -
// matching the offline-friendly pattern used by syncDeviceNow above.
async function submitDeviceEvent(
  eventType: "screen_time" | "activity" | "education_activity",
  payload: Record<string, unknown>,
): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    const deviceId = await getOrCreateDeviceId();
    await apiPostDeviceEvent(deviceId, { id: genEventId(), eventType, payload });
  } catch {
    // best-effort
  }
}

// Records an education activity event (lesson/quiz/challenge/assessment
// completion) alongside wherever that completion is already persisted
// server-side, so the parent dashboard can report it separately from
// general app usage. Fire-and-forget - callers should not await this for UI flow.
export function submitActivityEvent(
  activityType: string,
  details?: Record<string, unknown>,
): void {
  submitDeviceEvent("education_activity", { activityType, details });
}

// Tracks how long the app itself has been in the foreground and reports it as
// a screen_time event when the app backgrounds. This is an app-usage proxy,
// not device-wide OS screen time - we have no native Screen Time API access.
export function useForegroundScreenTime(isAuthenticated: boolean) {
  const sessionStartRef = useRef<number | null>(null);

  const flushSession = useCallback(() => {
    const start = sessionStartRef.current;
    sessionStartRef.current = null;
    if (start === null) return;
    const durationSeconds = Math.round((Date.now() - start) / 1000);
    if (durationSeconds < MIN_FOREGROUND_SESSION_SECONDS) return;
    submitDeviceEvent("screen_time", { durationSeconds, category: "app_usage" });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      flushSession();
      return;
    }

    sessionStartRef.current = Date.now();

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
      } else {
        flushSession();
      }
    });

    return () => {
      sub.remove();
      flushSession();
    };
  }, [isAuthenticated, flushSession]);
}
