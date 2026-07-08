import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGetTips, type ApiWeeklyTip } from "@/lib/apiClient";
import { WEEKLY_TIPS, type WeeklyTip } from "@/data/seed";

const CACHE_KEY = "@dv_tips_cache";

interface TipsState {
  tips: WeeklyTip[];
  isLoading: boolean;
}

function toTips(apiTips: ApiWeeklyTip[]): WeeklyTip[] {
  return apiTips as unknown as WeeklyTip[];
}

let cachedState: TipsState | null = null;

export function useWeeklyTips(): TipsState {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<TipsState>(
    cachedState ?? { tips: WEEKLY_TIPS, isLoading: true },
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      // Offline/local-mode users never hit the server — use the bundled fallback.
      if (!isAuthenticated || !user?.id || user.id.startsWith("local_")) {
        const next = { tips: WEEKLY_TIPS, isLoading: false };
        cachedState = next;
        setState(next);
        return;
      }

      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { tips: WeeklyTip[] };
          const next = { tips: parsed.tips, isLoading: true };
          cachedState = next;
          setState(next);
        }
      } catch {
        // ignore corrupt cache
      }

      try {
        const { tips: apiTips } = await apiGetTips();
        const tips = toTips(apiTips);
        const next = { tips, isLoading: false };
        cachedState = next;
        setState(next);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ tips }));
      } catch {
        // Network failure: keep whatever we loaded from cache (or the bundled
        // fallback if there was no cache), just stop showing a loading state.
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, [isAuthenticated, user?.id]);

  return state;
}
