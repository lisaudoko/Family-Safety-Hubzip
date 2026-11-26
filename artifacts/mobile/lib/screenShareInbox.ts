import { router, usePathname, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { apiGetActiveScreenShares } from "@/lib/apiClient";

const POLL_MS = 15000;

/**
 * Child sessions: opens a pending screen-view request when the app is in the
 * foreground, so a missed or disabled push notification never hides a request.
 * Each request is shown at most once.
 */
export function useScreenShareInbox(role: "parent" | "child" | undefined): void {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (role !== "child") return;
    let active = AppState.currentState === "active";

    const check = async () => {
      if (!active) return;
      try {
        const { requests } = await apiGetActiveScreenShares();
        const pending = requests.find((r) => r.status === "requested" && !shown.current.has(r.id));
        if (!pending || pathRef.current.startsWith("/screen-share/")) return;
        shown.current.add(pending.id);
        router.push(`/screen-share/${pending.id}` as Href);
      } catch {
        // offline or signed out; try again later
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      active = state === "active";
      if (active) void check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [role]);
}
