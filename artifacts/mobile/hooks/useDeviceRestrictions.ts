import { useEffect, useState } from "react";
import {
  apiGetDeviceRestrictions,
  apiUpdateDeviceRestrictions,
  DeviceRestrictions,
} from "@/lib/apiClient";


export function useDeviceRestrictions(deviceId?: string) {
  const [restrictions, setRestrictions] =
    useState<DeviceRestrictions | null>(null);

  const [loading, setLoading] = useState(false);


  async function loadRestrictions() {
    if (!deviceId) return;

    setLoading(true);

    try {
      const res = await apiGetDeviceRestrictions(deviceId);
      setRestrictions(res.restrictions ?? null);
    } finally {
      setLoading(false);
    }
  }


  async function updateRestrictions(
    data: Partial<DeviceRestrictions>
  ) {
    if (!deviceId) return;

    const res = await apiUpdateDeviceRestrictions(
      deviceId,
      data
    );

    setRestrictions(res.restrictions);
  }


  useEffect(() => {
    loadRestrictions();
  }, [deviceId]);


  return {
    restrictions,
    loading,
    refresh: loadRestrictions,
    updateRestrictions,
  };
}