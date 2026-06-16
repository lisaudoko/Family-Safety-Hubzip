import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AgeBand } from "@/data/seed";

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

export interface UserProgress {
  completedLessons: string[];
  completedQuizzes: string[];
  courseProgress: Record<string, number>;
  completedChallenges: string[];
  activeChallenges: string[];
  earnedBadges: string[];
  assessmentScore: number | null;
  assessmentCompletedAt: string | null;
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
  setAssessmentScore: (score: number) => Promise<void>;
  awardBadge: (badgeId: string) => Promise<void>;
  advanceWeeklyTip: () => Promise<void>;
}

const FAMILY_KEY = "@dv_family";
const AGREEMENT_KEY = "@dv_agreement";
const PROGRESS_KEY = "@dv_progress";

const defaultProgress: UserProgress = {
  completedLessons: [],
  completedQuizzes: [],
  courseProgress: {},
  completedChallenges: [],
  activeChallenges: [],
  earnedBadges: [],
  assessmentScore: null,
  assessmentCompletedAt: null,
  weeklyTipIndex: 0,
};

const FamilyContext = createContext<FamilyContextType | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [family, setFamily] = useState<FamilyProfile | null>(null);
  const [agreement, setAgreement] = useState<FamilyAgreement | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [fam, agr, prog] = await Promise.all([
        AsyncStorage.getItem(FAMILY_KEY),
        AsyncStorage.getItem(AGREEMENT_KEY),
        AsyncStorage.getItem(PROGRESS_KEY),
      ]);
      if (fam) setFamily(JSON.parse(fam));
      if (agr) setAgreement(JSON.parse(agr));
      if (prog) setProgress({ ...defaultProgress, ...JSON.parse(prog) });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFamily = async (f: FamilyProfile) => {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(f));
    setFamily(f);
  };

  const saveAgreementData = async (a: FamilyAgreement) => {
    await AsyncStorage.setItem(AGREEMENT_KEY, JSON.stringify(a));
    setAgreement(a);
  };

  const saveProgress = async (p: UserProgress) => {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    setProgress(p);
  };

  const initFamily = useCallback(async (name: string, familyId: string, parentId: string) => {
    const f: FamilyProfile = { id: familyId, name, parentId, children: [], createdAt: new Date().toISOString() };
    await saveFamily(f);
  }, []);

  const addChild = useCallback(async (name: string, ageBand: AgeBand, familyId: string) => {
    const child: Child = {
      id: "ch" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      ageBand,
      familyId,
      createdAt: new Date().toISOString(),
    };
    const updated = family ? { ...family, children: [...family.children, child] } : { id: familyId, name: "My Family", parentId: "", children: [child], createdAt: new Date().toISOString() };
    await saveFamily(updated);
  }, [family]);

  const removeChild = useCallback(async (childId: string) => {
    if (!family) return;
    const updated = { ...family, children: family.children.filter(c => c.id !== childId) };
    await saveFamily(updated);
  }, [family]);

  const updateChild = useCallback(async (childId: string, updates: Partial<Child>) => {
    if (!family) return;
    const updated = { ...family, children: family.children.map(c => c.id === childId ? { ...c, ...updates } : c) };
    await saveFamily(updated);
  }, [family]);

  const saveAgreement = useCallback(async (rules: AgreementRule[], customRules: string[]) => {
    const a: FamilyAgreement = {
      id: agreement?.id ?? ("agr" + Date.now()),
      familyId: family?.id ?? "",
      rules,
      signedAt: null,
      customRules,
    };
    await saveAgreementData(a);
  }, [agreement, family]);

  const signAgreement = useCallback(async () => {
    if (!agreement) return;
    const updated = { ...agreement, signedAt: new Date().toISOString() };
    await saveAgreementData(updated);
  }, [agreement]);

  const completeLesson = useCallback(async (lessonId: string, courseId: string, totalLessons: number) => {
    const updated = { ...progress };
    if (!updated.completedLessons.includes(lessonId)) {
      updated.completedLessons = [...updated.completedLessons, lessonId];
    }
    const courseLessons = updated.completedLessons.filter(id => id.startsWith(courseId));
    updated.courseProgress = { ...updated.courseProgress, [courseId]: Math.round((courseLessons.length / totalLessons) * 100) };
    await saveProgress(updated);
  }, [progress]);

  const completeQuiz = useCallback(async (quizId: string) => {
    if (progress.completedQuizzes.includes(quizId)) return;
    const updated = { ...progress, completedQuizzes: [...progress.completedQuizzes, quizId] };
    await saveProgress(updated);
  }, [progress]);

  const startChallenge = useCallback(async (challengeId: string) => {
    if (progress.activeChallenges.includes(challengeId) || progress.completedChallenges.includes(challengeId)) return;
    const updated = { ...progress, activeChallenges: [...progress.activeChallenges, challengeId] };
    await saveProgress(updated);
  }, [progress]);

  const completeChallenge = useCallback(async (challengeId: string) => {
    const updated = {
      ...progress,
      completedChallenges: progress.completedChallenges.includes(challengeId) ? progress.completedChallenges : [...progress.completedChallenges, challengeId],
      activeChallenges: progress.activeChallenges.filter(id => id !== challengeId),
    };
    await saveProgress(updated);
  }, [progress]);

  const setAssessmentScore = useCallback(async (score: number) => {
    const updated = { ...progress, assessmentScore: score, assessmentCompletedAt: new Date().toISOString() };
    await saveProgress(updated);
  }, [progress]);

  const awardBadge = useCallback(async (badgeId: string) => {
    if (progress.earnedBadges.includes(badgeId)) return;
    const updated = { ...progress, earnedBadges: [...progress.earnedBadges, badgeId] };
    await saveProgress(updated);
  }, [progress]);

  const advanceWeeklyTip = useCallback(async () => {
    const updated = { ...progress, weeklyTipIndex: (progress.weeklyTipIndex + 1) % 8 };
    await saveProgress(updated);
  }, [progress]);

  return (
    <FamilyContext.Provider value={{ family, agreement, progress, isLoading, initFamily, addChild, removeChild, updateChild, saveAgreement, signAgreement, completeLesson, completeQuiz, startChallenge, completeChallenge, setAssessmentScore, awardBadge, advanceWeeklyTip }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within FamilyProvider");
  return ctx;
}
