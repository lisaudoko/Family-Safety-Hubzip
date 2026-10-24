import { useEffect, useState } from "react";
import { apiGetEffectivePolicy, EffectivePolicy } from "@/lib/apiClient";

export function useEffectivePolicy(childId?: string) {
  const [policy, setPolicy] = useState<EffectivePolicy | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPolicy() {
    if (!childId) return;

    setLoading(true);
    try {
      const res = await apiGetEffectivePolicy(childId);
      setPolicy(res.policy);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, [childId]);

  return {
    policy,
    loading,
    refresh: loadPolicy,
  };
}
