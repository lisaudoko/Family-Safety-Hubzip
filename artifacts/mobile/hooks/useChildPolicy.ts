import { useEffect, useState } from "react";
import {
  apiGetChildPolicy,
  apiUpdateChildPolicy,
  ChildPolicy,
} from "@/lib/apiClient";

export function useChildPolicy(childId?: string) {
  const [policy, setPolicy] = useState<ChildPolicy | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPolicy() {
    if (!childId) return;

    setLoading(true);
    try {
      const res = await apiGetChildPolicy(childId);
      setPolicy(res.policy ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function updatePolicy(data: Partial<ChildPolicy>) {
    if (!childId) return;

    const res = await apiUpdateChildPolicy(childId, data);
    setPolicy(res.policy);
  }

  useEffect(() => {
    loadPolicy();
  }, [childId]);

  return {
    policy,
    loading,
    refresh: loadPolicy,
    updatePolicy,
  };
}
