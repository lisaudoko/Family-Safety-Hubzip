import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGetCurriculum, type ApiBadge, type ApiFullCourse } from "@/lib/apiClient";
import { COURSES, BADGES, type Course, type Badge } from "@/data/seed";

const CACHE_KEY = "@dv_curriculum_cache";

interface CurriculumState {
  courses: Course[];
  badges: Badge[];
  isLoading: boolean;
}

function toCourses(apiCourses: ApiFullCourse[]): Course[] {
  return apiCourses as unknown as Course[];
}

function toBadges(apiBadges: ApiBadge[]): Badge[] {
  return apiBadges as unknown as Badge[];
}

let cachedState: CurriculumState | null = null;

export function useCurriculum(): CurriculumState {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<CurriculumState>(
    cachedState ?? { courses: COURSES, badges: BADGES, isLoading: true },
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      // Offline/local-mode users never hit the server — use the bundled fallback.
      if (!isAuthenticated || !user?.id || user.id.startsWith("local_")) {
        const next = { courses: COURSES, badges: BADGES, isLoading: false };
        cachedState = next;
        setState(next);
        return;
      }

      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { courses: Course[]; badges: Badge[] };
          const next = { courses: parsed.courses, badges: parsed.badges, isLoading: true };
          cachedState = next;
          setState(next);
        }
      } catch {
        // ignore corrupt cache
      }

      try {
        const { courses: apiCourses, badges: apiBadges } = await apiGetCurriculum();
        const courses = toCourses(apiCourses);
        const badges = toBadges(apiBadges);
        const next = { courses, badges, isLoading: false };
        cachedState = next;
        setState(next);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ courses, badges }));
      } catch {
        // Network failure: keep whatever we loaded from cache (or the bundled
        // fallback if there was no cache), just stop showing a loading state.
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, [isAuthenticated, user?.id]);

  return state;
}
