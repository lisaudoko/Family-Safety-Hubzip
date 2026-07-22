import { useEffect, useState } from "react";
import { apiGetChildProgress, ApiChildProgress } from "@/lib/apiClient";

export function useChildProgress(childId?: string) {
  const [progress, setProgress] = useState<ApiChildProgress["progress"]>(null);
  const [loading, setLoading] = useState(false);

  async function loadProgress() {
    if (!childId) return;

    setLoading(true);
    try {
      const res = await apiGetChildProgress(childId);
      setProgress(res.progress);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, [childId]);

  return {
    progress,
    loading,
    refresh: loadProgress,
  };
}
