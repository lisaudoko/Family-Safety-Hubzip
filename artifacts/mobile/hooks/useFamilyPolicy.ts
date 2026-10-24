import { useEffect, useState } from "react";
import {
  apiGetFamilyPolicy,
  apiUpdateFamilyPolicy,
  FamilyPolicy,
} from "@/lib/apiClient";

export function useFamilyPolicy() {
  const [policy, setPolicy] = useState<FamilyPolicy | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPolicy() {
    setLoading(true);
    try {
      const res = await apiGetFamilyPolicy();
      setPolicy(res.policy ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function updatePolicy(data: Partial<FamilyPolicy>) {
    const res = await apiUpdateFamilyPolicy(data);
    setPolicy(res.policy);
  }

  useEffect(() => {
    loadPolicy();
  }, []);

  return {
    policy,
    loading,
    refresh: loadPolicy,
    updatePolicy,
  };
}
