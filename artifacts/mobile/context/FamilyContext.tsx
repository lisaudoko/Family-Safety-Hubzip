import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AgeBand, COURSES } from "@/data/seed";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase";
import type {
  ChildRow,
  FamilyAgreementRow,
  FamilyRow,
  UserProgressRow,
} from "@/lib/supabase-types";

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
  // Per-assessment results, keyed by assessment id.
  assessmentResults: Record<string, AssessmentResult>;
  // Completed step indices per challenge id.
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

// Cache is scoped per authenticated user in Supabase mode so one account's
// cached data can never leak into another account on the same device.
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

// Centralized badge rules derived from a progress snapshot. Lesson- and
// challenge-based badges are computed here so every mutator stays consistent
// and we never hardcode badge ids in individual screens.
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
  if (lessonCount >= 10 && challengeCount >= 3) add.push("b21");
  return mergeBadges(p.earnedBadges, add);
}

const FamilyContext = createContext<FamilyContextType | null>(null);

// --- Mappers between local app shapes and Supabase row shapes -------------

function rowToFamily(fam: FamilyRow, kids: ChildRow[]): FamilyProfile {
  return {
    id: fam.id,
    name: fam.name,
    parentId: fam.parent_id ?? "",
    createdAt: fam.created_at ?? new Date().toISOString(),
    children: kids.map(k => ({
      id: k.id,
      name: k.name,
      ageBand: (k.age_band as AgeBand) ?? "10-13",
      familyId: k.family_id,
      createdAt: k.created_at ?? new Date().toISOString(),
    })),
  };
}

function rowToProgress(row: UserProgressRow): UserProgress {
  return {
    completedLessons: row.completed_lessons ?? [],
    completedQuizzes: row.completed_quizzes ?? [],
    courseProgress: row.course_progress ?? {},
    completedChallenges: row.completed_challenges ?? [],
    activeChallenges: row.active_challenges ?? [],
    earnedBadges: row.earned_badges ?? [],
    assessmentScore: row.assessment_score,
    assessmentCompletedAt: row.assessment_completed_at,
    // Local-only fields (not yet persisted to Supabase — see Task #5 sync).
    // Merged from the local cache in loadFromSupabase so they survive hydration.
    assessmentResults: {},
    challengeSteps: {},
    weeklyTipIndex: row.weekly_tip_index ?? 0,
  };
}

function progressToRow(p: UserProgress, userId: string): UserProgressRow {
  return {
    user_id: userId,
    completed_lessons: p.completedLessons,
    completed_quizzes: p.completedQuizzes,
    course_progress: p.courseProgress,
    completed_challenges: p.completedChallenges,
    active_challenges: p.activeChallenges,
    earned_badges: p.earnedBadges,
    assessment_score: p.assessmentScore,
    assessment_completed_at: p.assessmentCompletedAt,
    weekly_tip_index: p.weeklyTipIndex,
  };
}

function rowToAgreement(row: FamilyAgreementRow): FamilyAgreement {
  return {
    id: row.id,
    familyId: row.family_id,
    rules: row.rules ?? [],
    customRules: row.custom_rules ?? [],
    signedAt: row.signed_at,
  };
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [family, setFamily] = useState<FamilyProfile | null>(null);
  const [agreement, setAgreement] = useState<FamilyAgreement | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabase();
  const supabaseAvailable = !!supabase;
  // Only sync as a real parent account. Child mode reuses a non-UUID id that
  // must never own family/progress rows in Supabase.
  const useSupabaseSync =
    supabaseAvailable && isAuthenticated && !!user?.id && user?.role === "parent";
  const loadedForUser = useRef<string | null>(null);

  const cacheKeys = useCallback(
    () => storageKeys(supabaseAvailable ? user?.id : undefined),
    [supabaseAvailable, user?.id],
  );

  const resetState = useCallback(() => {
    setFamily(null);
    setAgreement(null);
    setProgress(defaultProgress);
  }, []);

  // Mock-auth mode (no Supabase): load the shared local cache once on mount.
  useEffect(() => {
    if (supabaseAvailable) return;
    loadLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Supabase mode: load the current user's own cache, then hydrate from
  // Supabase. Reset everything when logged out so data never carries across
  // users on a shared device.
  useEffect(() => {
    if (!supabaseAvailable) return;
    if (useSupabaseSync && user?.id) {
      if (loadedForUser.current === user.id) return;
      loadedForUser.current = user.id;
      (async () => {
        await loadLocal(user.id);
        await loadFromSupabase(user.id);
      })();
    } else {
      loadedForUser.current = null;
      resetState();
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseAvailable, useSupabaseSync, user?.id]);

  const loadLocal = async (userId?: string) => {
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

  const loadFromSupabase = async (userId: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const keys = storageKeys(userId);
    try {
      const { data: fams } = await sb
        .from("families")
        .select("*")
        .eq("parent_id", userId)
        .limit(1);
      const famRow = fams?.[0] as FamilyRow | undefined;

      if (famRow) {
        const { data: kids } = await sb
          .from("children")
          .select("*")
          .eq("family_id", famRow.id);
        const fam = rowToFamily(famRow, (kids ?? []) as ChildRow[]);
        setFamily(fam);
        await AsyncStorage.setItem(keys.family, JSON.stringify(fam));

        const { data: agr } = await sb
          .from("family_agreements")
          .select("*")
          .eq("family_id", famRow.id)
          .limit(1);
        if (agr?.[0]) {
          const a = rowToAgreement(agr[0] as FamilyAgreementRow);
          setAgreement(a);
          await AsyncStorage.setItem(keys.agreement, JSON.stringify(a));
        }
      }

      const { data: prog } = await sb
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .limit(1);
      if (prog?.[0]) {
        const p = rowToProgress(prog[0] as UserProgressRow);
        // Preserve local-only fields (not yet persisted to Supabase) so they
        // are not wiped when the remote row hydrates over the local cache.
        const localRaw = await AsyncStorage.getItem(keys.progress);
        const local = localRaw ? (JSON.parse(localRaw) as Partial<UserProgress>) : null;
        const merged: UserProgress = {
          ...p,
          assessmentResults: local?.assessmentResults ?? p.assessmentResults,
          challengeSteps: local?.challengeSteps ?? p.challengeSteps,
        };
        setProgress(merged);
        await AsyncStorage.setItem(keys.progress, JSON.stringify(merged));
      }
    } catch {
      // network/table errors: keep the local cache we already loaded
    }
  };

  // --- Supabase write helpers (best-effort, never throw) ------------------

  const syncFamilyToSupabase = useCallback(async (f: FamilyProfile) => {
    const sb = getSupabase();
    if (!sb || !user?.id) return;
    try {
      await sb.from("families").upsert({
        id: f.id,
        name: f.name,
        // Always the authenticated parent — never a stale cached owner id.
        parent_id: user.id,
      });
      // Upsert the current children first (no delete-then-insert gap), then
      // prune any children that are no longer part of the family.
      if (f.children.length) {
        await sb.from("children").upsert(
          f.children.map(c => ({
            id: c.id,
            family_id: f.id,
            name: c.name,
            age_band: c.ageBand,
          })),
        );
        const keepIds = f.children.map(c => c.id);
        await sb
          .from("children")
          .delete()
          .eq("family_id", f.id)
          .not("id", "in", `(${keepIds.join(",")})`);
      } else {
        await sb.from("children").delete().eq("family_id", f.id);
      }
      // Best-effort link on the profile (ignored if column type differs).
      await sb.from("profiles").update({ family_id: f.id }).eq("id", user.id);
    } catch {
      // ignore — local cache is the source of truth offline
    }
  }, [user?.id]);

  const syncProgressToSupabase = useCallback(async (p: UserProgress) => {
    const sb = getSupabase();
    if (!sb || !user?.id) return;
    try {
      await sb.from("user_progress").upsert({
        ...progressToRow(p, user.id),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }, [user?.id]);

  const syncAgreementToSupabase = useCallback(async (a: FamilyAgreement) => {
    const sb = getSupabase();
    if (!sb || !a.familyId) return;
    try {
      await sb.from("family_agreements").upsert(
        {
          id: a.id,
          family_id: a.familyId,
          rules: a.rules,
          custom_rules: a.customRules,
          signed_at: a.signedAt,
        },
        { onConflict: "family_id" },
      );
    } catch {
      // ignore
    }
  }, []);

  // --- Local persistence + Supabase sync ---------------------------------

  const saveFamily = async (f: FamilyProfile) => {
    await AsyncStorage.setItem(cacheKeys().family, JSON.stringify(f));
    setFamily(f);
    if (useSupabaseSync) await syncFamilyToSupabase(f);
  };

  const saveAgreementData = async (a: FamilyAgreement) => {
    await AsyncStorage.setItem(cacheKeys().agreement, JSON.stringify(a));
    setAgreement(a);
    if (useSupabaseSync) await syncAgreementToSupabase(a);
  };

  const saveProgress = async (p: UserProgress) => {
    await AsyncStorage.setItem(cacheKeys().progress, JSON.stringify(p));
    setProgress(p);
    if (useSupabaseSync) await syncProgressToSupabase(p);
  };

  // Award badges without clobbering other progress fields: merge against the
  // freshest persisted snapshot (not just the captured render state).
  const awardBadgesMerged = async (ids: string[]) => {
    let base = progress;
    try {
      const raw = await AsyncStorage.getItem(cacheKeys().progress);
      if (raw) base = { ...defaultProgress, ...JSON.parse(raw) };
    } catch {
      // fall back to in-memory progress
    }
    const merged = mergeBadges(base.earnedBadges, ids);
    if (merged.length === base.earnedBadges.length) return;
    await saveProgress({ ...base, earnedBadges: merged });
  };

  const initFamily = useCallback(async (name: string, familyId: string, parentId: string) => {
    const f: FamilyProfile = { id: familyId, name, parentId, children: [], createdAt: new Date().toISOString() };
    await saveFamily(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSupabaseSync, syncFamilyToSupabase]);

  const addChild = useCallback(async (name: string, ageBand: AgeBand, familyId: string) => {
    const child: Child = {
      id: "ch" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      ageBand,
      familyId,
      createdAt: new Date().toISOString(),
    };
    const updated = family
      ? { ...family, children: [...family.children, child] }
      : { id: familyId, name: "My Family", parentId: user?.id ?? "", children: [child], createdAt: new Date().toISOString() };
    await saveFamily(updated);
    // Family setup badge: earned once a family has at least one child.
    await awardBadgesMerged(["b14"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, user?.id, progress, useSupabaseSync, syncFamilyToSupabase, syncProgressToSupabase]);

  const removeChild = useCallback(async (childId: string) => {
    if (!family) return;
    const updated = { ...family, children: family.children.filter(c => c.id !== childId) };
    await saveFamily(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, useSupabaseSync, syncFamilyToSupabase]);

  const updateChild = useCallback(async (childId: string, updates: Partial<Child>) => {
    if (!family) return;
    const updated = { ...family, children: family.children.map(c => c.id === childId ? { ...c, ...updates } : c) };
    await saveFamily(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, useSupabaseSync, syncFamilyToSupabase]);

  const saveAgreement = useCallback(async (rules: AgreementRule[], customRules: string[]) => {
    const a: FamilyAgreement = {
      id: agreement?.id ?? ("agr" + Date.now()),
      familyId: family?.id ?? "",
      rules,
      signedAt: agreement?.signedAt ?? null,
      customRules,
    };
    await saveAgreementData(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement, family, useSupabaseSync, syncAgreementToSupabase]);

  const signAgreement = useCallback(async () => {
    if (!agreement) return;
    const updated = { ...agreement, signedAt: new Date().toISOString() };
    await saveAgreementData(updated);
    // Agreement Makers badge: earned once the family agreement is signed.
    await awardBadgesMerged(["b15"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement, progress, useSupabaseSync, syncAgreementToSupabase, syncProgressToSupabase]);

  const completeLesson = useCallback(async (lessonId: string, courseId: string, totalLessons: number) => {
    const updated = { ...progress };
    if (!updated.completedLessons.includes(lessonId)) {
      updated.completedLessons = [...updated.completedLessons, lessonId];
    }
    const courseLessons = updated.completedLessons.filter(id => id.startsWith(courseId));
    updated.courseProgress = { ...updated.courseProgress, [courseId]: Math.round((courseLessons.length / totalLessons) * 100) };
    updated.earnedBadges = deriveProgressBadges(updated);
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const completeQuiz = useCallback(async (quizId: string) => {
    if (progress.completedQuizzes.includes(quizId)) return;
    const updated = { ...progress, completedQuizzes: [...progress.completedQuizzes, quizId] };
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const startChallenge = useCallback(async (challengeId: string) => {
    if (progress.activeChallenges.includes(challengeId) || progress.completedChallenges.includes(challengeId)) return;
    const updated = { ...progress, activeChallenges: [...progress.activeChallenges, challengeId] };
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const completeChallenge = useCallback(async (challengeId: string) => {
    const updated: UserProgress = {
      ...progress,
      completedChallenges: progress.completedChallenges.includes(challengeId) ? progress.completedChallenges : [...progress.completedChallenges, challengeId],
      activeChallenges: progress.activeChallenges.filter(id => id !== challengeId),
    };
    updated.earnedBadges = deriveProgressBadges(updated);
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const completeChallengeStep = useCallback(async (challengeId: string, stepIndex: number, totalSteps: number): Promise<boolean> => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

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
    // Keep the legacy single-score fields in sync for the original assessment.
    if (assessmentId === "social-media") {
      updated.assessmentScore = score;
      updated.assessmentCompletedAt = completedAt;
    }
    // Safety Assessed badge: earned on completing any assessment.
    updated.earnedBadges = mergeBadges(updated.earnedBadges, ["b17"]);
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const awardBadge = useCallback(async (badgeId: string) => {
    if (progress.earnedBadges.includes(badgeId)) return;
    const updated = { ...progress, earnedBadges: [...progress.earnedBadges, badgeId] };
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  const advanceWeeklyTip = useCallback(async () => {
    const updated = { ...progress, weeklyTipIndex: (progress.weeklyTipIndex + 1) % 8 };
    await saveProgress(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, useSupabaseSync, syncProgressToSupabase]);

  return (
    <FamilyContext.Provider value={{ family, agreement, progress, isLoading, initFamily, addChild, removeChild, updateChild, saveAgreement, signAgreement, completeLesson, completeQuiz, startChallenge, completeChallenge, completeChallengeStep, setAssessmentResult, awardBadge, advanceWeeklyTip }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within FamilyProvider");
  return ctx;
}
