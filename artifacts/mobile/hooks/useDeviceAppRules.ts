import { useEffect, useState } from "react";
import {
  apiListDeviceAppRules,
  apiCreateDeviceAppRule,
  apiUpdateDeviceAppRule,
  apiDeleteDeviceAppRule,
  ApiDeviceAppRule,
} from "@/lib/apiClient";

export function useDeviceAppRules(deviceId?: string) {
  const [rules, setRules] = useState<ApiDeviceAppRule[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRules() {
    if (!deviceId) return;

    setLoading(true);
    try {
      const res = await apiListDeviceAppRules(deviceId);
      setRules(res.rules);
    } finally {
      setLoading(false);
    }
  }

  async function addRule(data: { appBundleId: string; appName: string }) {
    if (!deviceId) return;
    const res = await apiCreateDeviceAppRule(deviceId, data);
    setRules((prev) => [...prev.filter((r) => r.id !== res.rule.id), res.rule]);
  }

  async function updateRule(ruleId: string, data: Partial<ApiDeviceAppRule>) {
    if (!deviceId) return;
    const res = await apiUpdateDeviceAppRule(deviceId, ruleId, data);
    setRules((prev) => prev.map((r) => (r.id === ruleId ? res.rule : r)));
  }

  async function removeRule(ruleId: string) {
    if (!deviceId) return;
    await apiDeleteDeviceAppRule(deviceId, ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  useEffect(() => {
    loadRules();
  }, [deviceId]);

  return {
    rules,
    loading,
    refresh: loadRules,
    addRule,
    updateRule,
    removeRule,
  };
}
