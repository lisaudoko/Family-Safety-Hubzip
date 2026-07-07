import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "@dv_auth_token";

let _baseUrl: string | null = null;

export function configureApiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    _baseUrl = `https://${domain}`;
  } else if (Platform.OS === "web") {
    _baseUrl = "";
  } else {
    _baseUrl = "";
  }
}

function getBase(): string {
  if (_baseUrl === null) configureApiBase();
  return _baseUrl ?? "";
}

// ── Token management ────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ──────────────────────────────────────────────────────

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${getBase()}/api${path}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isPremium: boolean;
  familyId: string;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
): Promise<{ token: string; user: ApiUser }> {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ token: string; user: ApiUser }> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // best-effort
  }
}

export async function apiGetMe(): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/me");
}

export async function apiUpdateMe(partial: {
  name?: string;
  email?: string;
}): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(partial),
  });
}

export async function apiCompleteOnboarding(): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/onboarding", { method: "PATCH" });
}

export async function apiUpgradePremium(): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/upgrade", { method: "PATCH" });
}

// ── Family ──────────────────────────────────────────────────────────────────

export interface ApiFamily {
  id: string;
  name: string;
  parentId: string;
  createdAt: string;
  children: ApiChild[];
}

export interface ApiChild {
  id: string;
  name: string;
  ageBand: string;
  familyId: string;
  createdAt: string;
}

export async function apiGetFamily(): Promise<{ family: ApiFamily | null }> {
  return apiFetch("/family");
}

export async function apiUpsertFamily(id: string, name: string): Promise<void> {
  await apiFetch("/family", {
    method: "POST",
    body: JSON.stringify({ id, name }),
  });
}

export async function apiAddChild(
  id: string,
  familyId: string,
  name: string,
  ageBand: string,
): Promise<void> {
  await apiFetch("/family/children", {
    method: "POST",
    body: JSON.stringify({ id, familyId, name, ageBand }),
  });
}

export async function apiUpdateChild(
  childId: string,
  updates: { name?: string; ageBand?: string },
): Promise<void> {
  await apiFetch(`/family/children/${childId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteChild(childId: string): Promise<void> {
  await apiFetch(`/family/children/${childId}`, { method: "DELETE" });
}

// ── Agreement ───────────────────────────────────────────────────────────────

export interface ApiAgreement {
  id: string;
  familyId: string;
  rules: unknown[];
  customRules: string[];
  signedAt: string | null;
}

export async function apiGetAgreement(): Promise<{
  agreement: ApiAgreement | null;
}> {
  return apiFetch("/family/agreement");
}

export async function apiUpsertAgreement(a: {
  id: string;
  familyId: string;
  rules: unknown[];
  customRules: string[];
  signedAt?: string | null;
}): Promise<void> {
  await apiFetch("/family/agreement", {
    method: "PUT",
    body: JSON.stringify(a),
  });
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface ApiProgress {
  completedLessons: string[];
  completedQuizzes: string[];
  courseProgress: Record<string, number>;
  completedChallenges: string[];
  activeChallenges: string[];
  earnedBadges: string[];
  assessmentScore: number | null;
  assessmentCompletedAt: string | null;
  assessmentResults: Record<string, unknown>;
  challengeSteps: Record<string, number[]>;
  weeklyTipIndex: number;
}

export async function apiGetProgress(): Promise<{
  progress: ApiProgress | null;
}> {
  return apiFetch("/progress");
}

export async function apiSaveProgress(p: ApiProgress): Promise<void> {
  await apiFetch("/progress", {
    method: "PUT",
    body: JSON.stringify(p),
  });
}
