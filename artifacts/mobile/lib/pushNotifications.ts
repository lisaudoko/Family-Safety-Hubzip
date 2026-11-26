import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { apiUpdateDevice } from "@/lib/apiClient";
import { getOrCreateDeviceId, syncDeviceNow } from "@/lib/deviceSync";

// Parent alerts (Screen Time off, device inactive, milestones, weekly summary)
// are sent by the server to the push token stored on this phone's device row.
// Only parent sessions ever register a token.

const PREF_KEY = "@dv_push_enabled"; // "1" = the parent turned notifications on

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "simulator" | "denied" | "not_configured" | "error"; message: string };

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

async function fetchToken(): Promise<string> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Family alerts",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const id = projectId();
  if (!id) throw new Error("not_configured");
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return data;
}

async function saveToken(token: string | null): Promise<void> {
  // The device row must exist before it can hold a token.
  await syncDeviceNow(true);
  const deviceId = await getOrCreateDeviceId();
  await apiUpdateDevice(deviceId, { pushToken: token });
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREF_KEY)) === "1";
  } catch {
    return false;
  }
}

/** Asks for OS permission and registers this phone for family alerts. */
export async function enablePushNotifications(): Promise<EnableResult> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return { ok: false, reason: "simulator", message: "Notifications only work on a real phone." };
  }
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message: "Notifications are turned off for Digital Village. You can allow them in your phone's Settings.",
      };
    }
    const token = await fetchToken();
    await saveToken(token);
    await AsyncStorage.setItem(PREF_KEY, "1");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "not_configured") {
      return { ok: false, reason: "not_configured", message: "Notifications aren't set up for this build yet." };
    }
    return { ok: false, reason: "error", message: "Couldn't turn on notifications. Please try again." };
  }
}

/** Turns family alerts off for this phone. */
export async function disablePushNotifications(): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, "0");
  await saveToken(null).catch(() => undefined);
}

/**
 * Stops alerts reaching this phone without changing the parent's preference.
 * Call while the parent's session is still valid: before logout, and before a
 * child signs in on this phone.
 */
export async function detachPushToken(): Promise<void> {
  if (Platform.OS === "web" || !(await isPushEnabled())) return;
  try {
    const deviceId = await getOrCreateDeviceId();
    await apiUpdateDevice(deviceId, { pushToken: null });
  } catch {
    // best-effort
  }
}

/** For parent sessions with alerts on: (re)attach this phone's current token. */
export async function reattachPushToken(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice || !(await isPushEnabled())) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await saveToken(await fetchToken());
  } catch {
    // best-effort; retried on the next sign-in or app start
  }
}

/**
 * Keeps the token attached while a parent is signed in, and opens the screen
 * an alert points to when it is tapped (including from a cold start).
 */
export function usePushNotifications(role: "parent" | "child" | undefined): void {
  useEffect(() => {
    if (role === "parent") void reattachPushToken();
  }, [role]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url as Href);
    };
    // Cold start (app opened by tapping an alert): wait for the router and the
    // auth redirect to settle before navigating.
    const timer = setTimeout(() => {
      void Notifications.getLastNotificationResponseAsync().then(open);
    }, 800);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
}
