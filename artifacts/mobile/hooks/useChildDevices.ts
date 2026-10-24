import { useEffect, useState } from "react";
import { apiGetDevices, apiUpdateDevice, ApiDevice } from "@/lib/apiClient";

export function useChildDevices(childId?: string) {
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDevices() {
    if (!childId) return;

    setLoading(true);
    try {
      const res = await apiGetDevices();
      setDevices(res.devices.filter((d) => d.ownerId === childId));
    } finally {
      setLoading(false);
    }
  }

  async function renameDevice(deviceId: string, name: string) {
    const res = await apiUpdateDevice(deviceId, { name });
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? res.device : d)));
  }

  useEffect(() => {
    loadDevices();
  }, [childId]);

  return {
    devices,
    loading,
    refresh: loadDevices,
    renameDevice,
  };
}
