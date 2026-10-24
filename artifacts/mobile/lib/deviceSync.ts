import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { apiDeviceHeartbeat, apiRegisterDevice } from "@/lib/apiClient";

const DEVICE_ID_KEY = "@dv_device_id";
const LAST_SYNC_KEY = "@dv_device_last_sync";
const DEFAULT_SYNC_INTERVAL_SECONDS = 15 * 60;

// Capabilities this app can genuinely back today, without any native
// permission APIs beyond what's already in the project. Kept separate from
// the server's full capability list so we never claim something we can't
// actually deliver.
const APP_CAPABILITIES = ["device_sync", "family_participation", "lesson_participation"];

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
