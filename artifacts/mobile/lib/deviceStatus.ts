import type { ApiDashboardDevice } from "@/lib/apiClient";

export interface DeviceStatusMeta {
  label: string;
  tone: "success" | "warning" | "destructive";
}

// Maps the server's syncStatus (derived from last_synced_at, see
// artifacts/api-server/src/lib/deviceStatus.ts) to a parent-facing label and
// a theme color key. This is "is the app currently checking in", not true
// device power state - see docs/DEVICE_ARCHITECTURE.md.
export function deviceStatusMeta(device: Pick<ApiDashboardDevice, "syncStatus">): DeviceStatusMeta {
  switch (device.syncStatus) {
    case "online":
      return { label: "Online now", tone: "success" };
    case "recent":
      return { label: "Recently active", tone: "warning" };
    case "stale":
      return { label: "Offline", tone: "destructive" };
  }
}
