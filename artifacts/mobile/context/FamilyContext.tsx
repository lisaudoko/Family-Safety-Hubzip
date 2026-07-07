import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AgeBand, COURSES } from "@/data/seed";
import { useAuth } from "@/context/AuthContext";
import {
  apiAddChild,
  apiDeleteChild,
  apiGetAgreement,
  apiGetFamily,
  apiGetProgress,
  apiSaveProgress,
  apiUpsertAgreement,
  apiUpsertFamily,
  apiUpdateChild,
  type ApiProgress,
} from "@/lib/apiClient";

export interface Child {
  id: string;
  name: string;
  ageBand: AgeBand;
  familyId: string;
  createdAt: string;
}

export interface FamilyProfile {
  id: string;
  name: string;
  parentId: string;
  children: Child[];
  createdAt: string;
}

export interface AgreementRule {
  id: string;
  category: string;
  rule: string;
  enabled: boolean;
}

export interface FamilyAgreement {
  id: string;
  familyId: string;
  rules: AgreementRule[];
  signedAt: string | null;
  customRules: string[];
}

export interface AssessmentResult {
  score: number;
  completedAt: string;
  categoryScores: Record<string, { score: number; max: number }>;
}

export interface UserProgress {
  completedLessons: string[];
  completedQuizzes: string[];
  courseProgress: Record<string, number>;
  completedChallenges: string[];
  activeChallenges: string[];
  earnedBadges: string[];
  assessmentScore: number | null;
  assessmentCompletedAt: string | null;
  assessmentResults: Record<string, AssessmentResult>;
  challengeSteps: Record<string, number[]>;
  weeklyTipIndex: number;
}

interface FamilyContextType {
  family: FamilyProfile | null;
  agreement: FamilyAgreement | null;
  progress: UserProgress;
  isLoading: boolean;
  initFamily: (name: string, familyId: string, parentId: string) => Promise<void>;
  addChild: (name: string, ageBand: AgeBand, familyId: string) => Promise<void>;
  removeChild: (childId: string) => Promise<void>;
  updateChild: (childId: string, updates: Partial<Child>) => Promise<void>;
  saveAgreement: (rules: AgreementRule[], customRules: string[]) => Promise<void>;
  signAgreement: () => Promise<void>;
  completeLesson: (lessonId: string, courseId: string, totalLessons: number) => Promise<void>;
  completeQuiz: (quizId: string) => Promise<void>;
  startChallenge: (challengeId: string) => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
  completeChallengeStep: (challengeId: string, stepIndex: number, totalSteps: number) => Promise<boolean>;
  setAssessmentResult: (
    assessmentId: string,
    score: number,
    categoryScores: Record<string, { score: number; max: number }>,
  ) => Promise<void>;
  awardBadge: (badgeId: string) => Promise<void>;
  advanceWeeklyTip: () => Promise<void>;
}

const FAMILY_KEY = "@dv_family";
const AGREEMENT_KEY = "@dv_agreement";
const PROGRESS_KEY = "@dv_progress";

function storageKeys(userId?: string) {
  const suffix = userId ? `:${userId}` : "";
  return {
    family: FAMILY_KEY + suffix,
    agreement: AGREEMENT_KEY + suffix,
    progress: PROGRESS_KEY + suffix,
  };
}

const defaultProgress: UserProgress = {
  completedLessons: [],
  completedQuizzes: [],
  courseProgress: {},
  completedChallenges: [],
  activeChallenges: [],
  earnedBadges: [],
  assessmentScore: null,
  assessmentCompletedAt: null,
  assessmentResults: {},
  challengeSteps: {},
  weeklyTipIndex: 0,
};

function mergeBadges(earned: string[], toAdd: string[]): string[] {
  const set = new Set(earned);
  for (const id of toAdd) set.add(id);
  return Array.from(set);
}

function deriveProgressBadges(p: UserProgress): string[] {
  const add: string[] = [];
  const lessonCount = p.completedLessons.length;
  if (lessonCount >= 1) add.push("b1");
  if (lessonCount >= 5) add.push("b2");
  if (lessonCount >= 8) add.push("b3");
  if (COURSES.every(c => c.lessons.some(l => p.completedLessons.includes(l.id)))) add.push("b6");
  const challengeCount = p.completedChallenges.length;
  if (challengeCount >= 1) add.push("b7");
  if (challengeCount >= 5) add.push("b8");
  if (p.completedChallenges.includes("ch1")) add.push("b9");
  if (p.completedChallenges.includes("ch2")) add.push("b10");
  if (p.completedChallenges.includes("ch3")) add.push("b11");
  if (p.completedChallenges.includes("ch4")) add.push("b12");
  if (p.completedChallenges.includes("ch5")) add.push("b13");
  if (p.completedChallenges.includes("ch8")) add.push("b22");
  if (lessonCount >= 10 && challengeCount >= 3) add.push("b21");
  return mergeBadges(p.earnedBadges, add);
}

const FamilyContext = createContext<FamilyContextType | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [family, setFamily] = useState<FamilyProfile | null>(null);
  const [agreement, setAgreement] = useState<FamilyAgreement | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  const familyRef = useRef<FamilyProfile | null>(null);
  useEffect(() => { familyRef.current = family; }, [family]);

  const loadedForUser = useRef<string | null>(null);

  // Scoped cache keys per user
  const cacheKeys = useCallback(
    () => storageKeys(user?.id),
    [user?.id],
  );

  // Load from local cache, then hydrate from server
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user.role !== "parent") {
      setIsLoading(false);
      return;
    }
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    (async () => {
      await loadLocal(user.id);
      // Skip server sync for offline (local_*) users
      if (!user.id.startsWith("local_")) {
        await loadFromServer(user.id);
      }
    })();
  }, [isAuthenticated, user?.id, user?.role]);

  const loadLocal = async (userId: string) => {
    const keys = storageKeys(userId);
    try {
      const [fam, agr, prog] = await Promise.all([
        AsyncStorage.getItem(keys.family),
        AsyncStorage.getItem(keys.agreement),
        AsyncStorage.getItem(keys.progress),
      ]);
      setFamily(fam ? JSON.parse(fam) : null);
      setAgreement(agr ? JSON.parse(agr) : null);
      setProgress(prog ? { ...defaultProgress, ...JSON.parse(prog) } : defaultProgress);
    } catch {
      // ignore corrupt cache
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromServer = async (userId: string) => {
    const keys = storageKeys(userId);
    try {
      const [{ family: serverFamily }, { agreement: serverAgreement }, { progress: serverProgress }] =
        await Promise.all([apiGetFamily(), apiGetAgreement(), apiGetProgress()]);

      if (serverFamily) {
        const fam: FamilyProfile = {
          ...serverFamily,
          children: serverFamily.children.map(c => ({
            ...c,
            ageBand: c.ageBand as AgeBand,
          })),
        };
        setFamily(fam);
        await AsyncStorage.setItem(keys.family, JSON.stringify(fam));
      }

      if (serverAgreement) {
        const agr: FamilyAgreement = {
          id: serverAgreement.id,
          familyId: serverAgreement.familyId,
          rules: serverAgreement.rules as AgreementRule[],
          customRules: serverAgreement.customRules,
          signedAt: serverAgreement.signedAt,
        };
        setAgreement(agr);
        await AsyncStorage.setItem(keys.agreement, JSON.stringify(agr));
      }

      if (serverProgress) {
        // Preserve local-only enriched fields merged on top of server data
        const localRaw = await AsyncStorage.getItem(keys.progress);
        const local = localRaw ? (JSON.parse(localRaw) as Partial<UserProgress>) : null;
        const merged: UserProgress = {
          completedLessons: serverProgress.completedLessons,
          completedQuizzes: serverProgress.completedQuizzes,
          courseProgress: serverProgress.courseProgress as Record<string, number>,
          completedChallenges: serverProgress.completedChallenges,
          activeChallenges: serverProgress.activeChallenges,
          earnedBadges: serverProgress.earnedBadges,
          assessmentScore: serverProgress.assessmentScore,
          assessmentCompletedAt: serverProgress.assessmentCompletedAt,
          assessmentResults: (local?.assessmentResults ?? serverProgress.assessmentResults) as Record<string, AssessmentResult>,
          challengeSteps: (local?.challengeSteps ?? serverProgress.challengeSteps) as Record<string, number[]>,
          weeklyTipIndex: serverProgress.weeklyTipIndex,
        };
        setProgress(merged);
        await AsyncStorage.setItem(keys.progress, JSON.stringify(merged));
      }
    } catch {
      // keep local cache on network error
    }
  };

  // ── Persistence helpers ──────────────────────────────────────────────────

  const isOnlineUser = () => user?.id && !user.id.startsWith("local_");

  const saveFamily = async (f: FamilyProfile) => {
    await AsyncStorage.setItem(cacheKeys().family, JSON.stringify(f));
    setFamily(f);
    familyRef.current = f;
    if (isOnlineUser()) {
      try {
        await apiUpsertFamily(f.id, f.name);
      } catch {
        // best-effort
      }
    }
  };

  const saveAgreementData = async (a: FamilyAgreement) => {
    await AsyncStorage.setItem(cacheKeys().agreement, JSON.stringify(a));
    setAgreement(a);
    if (isOnlineUser()) {
      try {
        await apiUpsertAgreement({
          id: a.id,
          familyId: a.familyId,
          rules: a.rules,
          customRules: a.customRules,
          signedAt: a.signedAt,
        });
      } catch {
        // best-effort
      }
    }
  };

  const saveProgress = async (p: UserProgress) => {
    await AsyncStorage.setItem(cacheKeys().progress, JSON.stringify(p));
    setProgress(p);
    if (isOnlineUser()) {
      try {
        const payload: ApiProgress = {
          completedLessons: p.completedLessons,
          completedQuizzes: p.completedQuizzes,
          courseProgress: p.courseProgress,
          completedChallenges: p.completedChallenges,
          activeChallenges: p.activeChallenges,
          earnedBadges: p.earnedBadges,
          assessmentScore: p.assessmentScore,
          assessmentCompletedAt: p.assessmentCompletedAt,
          assessmentResults: p.assessmentResults as Record<string, unknown>,
          challengeSteps: p.challengeSteps,
          weeklyTipIndex: p.weeklyTipIndex,
        };
        await apiSaveProgress(payload);
      } catch {
        // best-effort
      }
    }
  };

  const awardBadgesMerged = async (ids: string[]) => {
    let base = progress;
    try {
      const raw = await AsyncStorage.getItem(cacheKeys().progress);
      if (raw) base = { ...defaultProgress, ...JSON.parse(raw) };
    } catch {
      // fall back to in-memory
    }
    const merged = mergeBadges(base.earnedBadges, ids);
    if (merged.length === base.earnedBadges.length) return;
    await saveProgress({ ...base, earnedBadges: merged });
  };

  // ── Mutators ──────────────────────────────────────────────────────────────

  const initFamily = useCallback(async (name: string, familyId: string, parentId: string) => {
    const f: FamilyProfile = {
      id: familyId,
      name,
      parentId,
      children: [],
      createdAt: new Date().toISOString(),
    };
    await saveFamily(f);
  }, [user?.id]);

  const addChild = useCallback(async (name: string, ageBand: AgeBand, familyId: string) => {
    const child: Child = {
      id: "ch" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      ageBand,
      familyId,
      createdAt: new Date().toISOString(),
    };
    const fam = familyRef.current;
    const updated = fam
      ? { ...fam, children: [...fam.children, child] }
      : {
          id: familyId,
          name: "My Family",
          parentId: user?.id ?? "",
          children: [child],
          createdAt: new Date().toISOString(),
        };
    await saveFamily(updated);
    if (isOnlineUser()) {
      try {
        await apiAddChild(child.id, familyId, child.name, child.ageBand);
      } catch {
        // best-effort
      }
    }
    await awardBadgesMerged(["b14"]);
  }, [user?.id, progress]);

  const removeChild = useCallback(async (childId: string) => {
    const fam = familyRef.current;
    if (!fam) return;
    const updated = { ...fam, children: fam.children.filter(c => c.id !== childId) };
    await saveFamily(updated);
    if (isOnlineUser()) {
      try { await apiDeleteChild(childId); } catch { /* best-effort */ }
    }
  }, [user?.id]);

  const updateChild = useCallback(async (childId: string, updates: Partial<Child>) => {
    const fam = familyRef.current;
    if (!fam) return;
    const updated = {
      ...fam,
      children: fam.children.map(c => (c.id === childId ? { ...c, ...updates } : c)),
    };
    await saveFamily(updated);
    if (isOnlineUser()) {
      try {
        await apiUpdateChild(childId, {
          name: updates.name,
          ageBand: updates.ageBand,
        });
      } catch { /* best-effort */ }
    }
  }, [user?.id]);

  const saveAgreement = useCallback(async (rules: AgreementRule[], customRules: string[]) => {
    const a: FamilyAgreement = {
      id: agreement?.id ?? ("agr" + Date.now()),
      familyId: family?.id ?? "",
      rules,
      signedAt: agreement?.signedAt ?? null,
      customRules,
    };
    await saveAgreementData(a);
  }, [agreement, family, user?.id]);

  const signAgreement = useCallback(async () => {
    if (!agreement) return;
    const updated = { ...agreement, signedAt: new Date().toISOString() };
    await saveAgreementData(updated);
    await awardBadgesMerged(["b15"]);
  }, [agreement, progress, user?.id]);

  const completeLesson = useCallback(async (lessonId: string, courseId: string, totalLessons: number) => {
    const updated = { ...progress };
    if (!updated.completedLessons.includes(lessonId)) {
      updated.completedLessons = [...updated.completedLessons, lessonId];
    }
    const courseLessons = updated.completedLessons.filter(id => id.startsWith(courseId));
    updated.courseProgress = {
      ...updated.courseProgress,
      [courseId]: Math.round((courseLessons.length / totalLessons) * 100),
    };
    updated.earnedBadges = deriveProgressBadges(updated);
    await saveProgress(updated);
  }, [progress, user?.id]);

  const completeQuiz = useCallback(async (quizId: string) => {
    if (progress.completedQuizzes.includes(quizId)) return;
    const updated = { ...progress, completedQuizzes: [...progress.completedQuizzes, quizId] };
    await saveProgress(updated);
  }, [progress, user?.id]);

  const startChallenge = useCallback(async (challengeId: string) => {
    if (
      progress.activeChallenges.includes(challengeId) ||
      progress.completedChallenges.includes(challengeId)
    ) return;
    const updated = {
      ...progress,
      activeChallenges: [...progress.activeChallenges, challengeId],
    };
    await saveProgress(updated);
  }, [progress, user?.id]);

  const completeChallenge = useCallback(async (challengeId: string) => {
    const updated: UserProgress = {
      ...progress,
      completedChallenges: progress.completedChallenges.includes(challengeId)
        ? progress.completedChallenges
        : [...progress.completedChallenges, challengeId],
      activeChallenges: progress.activeChallenges.filter(id => id !== challengeId),
    };
    updated.earnedBadges = deriveProgressBadges(updated);
    await saveProgress(updated);
  }, [progress, user?.id]);

  const completeChallengeStep = useCallback(async (
    challengeId: string,
    stepIndex: number,
    totalSteps: number,
  ): Promise<boolean> => {
    const current = progress.challengeSteps[challengeId] ?? [];
    const next = current.includes(stepIndex)
      ? current.filter(i => i !== stepIndex)
      : [...current, stepIndex];
    const updated: UserProgress = {
      ...progress,
      challengeSteps: { ...progress.challengeSteps, [challengeId]: next },
    };
    let justCompleted = false;
    if (totalSteps > 0 && next.length >= totalSteps && !updated.completedChallenges.includes(challengeId)) {
      updated.completedChallenges = [...updated.completedChallenges, challengeId];
      updated.activeChallenges = updated.activeChallenges.filter(id => id !== challengeId);
      updated.earnedBadges = deriveProgressBadges(updated);
      justCompleted = true;
    }
    await saveProgress(updated);
    return justCompleted;
  }, [progress, user?.id]);

  const setAssessmentResult = useCallback(async (
    assessmentId: string,
    score: number,
    categoryScores: Record<string, { score: number; max: number }>,
  ) => {
    const completedAt = new Date().toISOString();
    const updated: UserProgress = {
      ...progress,
      assessmentResults: {
        ...progress.assessmentResults,
        [assessmentId]: { score, completedAt, categoryScores },
      },
    };
    if (assessmentId === "social-media") {
      updated.assessmentScore = score;
      updated.assessmentCompletedAt = completedAt;
    }
    updated.earnedBadges = mergeBadges(updated.earnedBadges, ["b17"]);
    await saveProgress(updated);
  }, [progress, user?.id]);

  const awardBadge = useCallback(async (badgeId: string) => {
    if (progress.earnedBadges.includes(badgeId)) return;
    const updated = { ...progress, earnedBadges: [...progress.earnedBadges, badgeId] };
    await saveProgress(updated);
  }, [progress, user?.id]);

  const advanceWeeklyTip = useCallback(async () => {
    const updated = { ...progress, weeklyTipIndex: (progress.weeklyTipIndex + 1) % 8 };
    await saveProgress(updated);
  }, [progress, user?.id]);

  return (
    <FamilyContext.Provider
      value={{
        family,
        agreement,
        progress,
        isLoading,
        initFamily,
        addChild,
        removeChild,
        updateChild,
        saveAgreement,
        signAgreement,
        completeLesson,
        completeQuiz,
        startChallenge,
        completeChallenge,
        completeChallengeStep,
        setAssessmentResult,
        awardBadge,
        advanceWeeklyTip,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within FamilyProvider");
  return ctx;
}
