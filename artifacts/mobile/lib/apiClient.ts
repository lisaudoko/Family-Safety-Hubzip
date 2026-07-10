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
  email: string | null;
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

export async function apiForgotPassword(email: string): Promise<void> {
  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function apiResetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
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
  email?: string | null;
}): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(partial),
  });
}

export async function apiCompleteOnboarding(): Promise<{ user: ApiUser }> {
  return apiFetch("/auth/onboarding", { method: "PATCH" });
}

export async function apiCreateCheckoutSession(
  plan: "monthly" | "annual",
): Promise<{ url: string }> {
  return apiFetch("/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function apiCreatePortalSession(): Promise<{ url: string }> {
  return apiFetch("/billing/portal-session", { method: "POST" });
}

// ── Family ──────────────────────────────────────────────────────────────────
export interface ApiParent {
  id: string;
  name: string;
}

export interface ApiFamily {
  id: string;
  name: string;
  parentId: string;
  familyCode: string;
  createdAt: string;
  parents: ApiParent[];
  children: ApiChild[];
  siblings: ApiChild[];
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

export async function apiUpsertFamily(
  id: string,
  name: string,
): Promise<{ ok: true; familyCode: string }> {
  return apiFetch("/family", {
    method: "POST",
    body: JSON.stringify({ id, name }),
  });
}

export async function apiAddChild(
  id: string,
  familyId: string,
  name: string,
  ageBand: string,
  pin?: string,
): Promise<{ ok: true; pin: string }> {
  return apiFetch("/family/children", {
    method: "POST",
    body: JSON.stringify({ id, familyId, name, ageBand, pin }),
  });
}

export async function apiUpdateChild(
  childId: string,
  updates: { name?: string; ageBand?: string; pin?: string },
): Promise<void> {
  await apiFetch(`/family/children/${childId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteChild(childId: string): Promise<void> {
  await apiFetch(`/family/children/${childId}`, { method: "DELETE" });
}

// ── Child login ─────────────────────────────────────────────────────────────

export interface ApiFamilyByCodeChild {
  id: string;
  name: string;
}

export async function apiGetFamilyByCode(code: string): Promise<{
  family: { name: string };
  children: ApiFamilyByCodeChild[];
}> {
  return apiFetch(`/auth/family-by-code/${encodeURIComponent(code)}`);
}

export async function apiChildLogin(
  childId: string,
  pin: string,
): Promise<{ token: string; user: ApiUser }> {
  return apiFetch("/auth/child-login", {
    method: "POST",
    body: JSON.stringify({ childId, pin }),
  });
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

// ── Curriculum ──────────────────────────────────────────────────────────────

export interface ApiCourseSummary {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  iconName: string;
  color: string;
  isPremium: boolean;
  audience: "parent" | "child" | "both";
  lessonCount: number;
  hasQuizCount: number;
}

export interface ApiCourseLessonSummary {
  id: string;
  title: string;
  estimatedMinutes: number;
  hasQuiz: boolean;
  audience: "parent" | "child" | "both";
  ageRange: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface ApiCourseDetail {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  iconName: string;
  color: string;
  isPremium: boolean;
  audience: "parent" | "child" | "both";
  lessons: ApiCourseLessonSummary[];
}

export interface ApiLessonSection {
  type: "text" | "tip" | "scenario";
  [key: string]: unknown;
}

export interface ApiLessonScenario {
  title: string;
  situation: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ApiLesson {
  id: string;
  courseId: string;
  title: string;
  module: string | null;
  audience: "parent" | "child" | "both";
  ageRange: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  learningObjectives: string[];
  content: string;
  sections: ApiLessonSection[] | null;
  interactiveActivity: { type: string; prompt: string; instructions: string } | null;
  scenarios: ApiLessonScenario[];
  parentDiscussionPrompts: string[];
  actionSteps: string[];
  completionCriteria: string | null;
  badgeId: string | null;
  estimatedMinutes: number;
  keyTakeaways: string[];
  hasQuiz: boolean;
}

export interface ApiQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ApiQuiz {
  id: string;
  lessonId: string;
  questions: ApiQuizQuestion[];
}

export interface ApiBadge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  condition: string;
}

export async function apiListCourses(params?: {
  audience?: string;
  category?: string;
}): Promise<{ courses: ApiCourseSummary[] }> {
  const query = new URLSearchParams();
  if (params?.audience) query.set("audience", params.audience);
  if (params?.category) query.set("category", params.category);
  const qs = query.toString();
  return apiFetch(`/courses${qs ? `?${qs}` : ""}`);
}

export async function apiGetCourse(
  courseId: string,
): Promise<{ course: ApiCourseDetail }> {
  return apiFetch(`/courses/${courseId}`);
}

export async function apiGetLesson(
  lessonId: string,
): Promise<{ lesson: ApiLesson }> {
  return apiFetch(`/lessons/${lessonId}`);
}

export async function apiGetLessonQuiz(
  lessonId: string,
): Promise<{ quiz: ApiQuiz }> {
  return apiFetch(`/lessons/${lessonId}/quiz`);
}

export async function apiListBadges(): Promise<{ badges: ApiBadge[] }> {
  return apiFetch("/badges");
}

export interface ApiFullLesson {
  id: string;
  courseId: string;
  title: string;
  module: string | null;
  audience: "parent" | "child" | "both";
  ageRange: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  learningObjectives: string[];
  content: string;
  duration: string;
  sections: ApiLessonSection[] | null;
  interactiveActivity: { type: string; prompt: string; instructions: string } | null;
  scenarios: ApiLessonScenario[];
  parentDiscussionPrompts: string[];
  actionSteps: string[];
  completionCriteria: string | null;
  badgeId: string | null;
  estimatedMinutes: number;
  keyTakeaways: string[];
  hasQuiz: boolean;
}

export interface ApiFullCourse {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  iconName: string;
  color: string;
  isPremium: boolean;
  audience: "parent" | "child" | "both";
  lessons: ApiFullLesson[];
  quizzes: ApiQuiz[];
}

export async function apiGetCurriculum(): Promise<{
  courses: ApiFullCourse[];
  badges: ApiBadge[];
}> {
  return apiFetch("/curriculum");
}

export interface ApiWeeklyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  iconName: string;
}

export async function apiGetTips(): Promise<{ tips: ApiWeeklyTip[] }> {
  return apiFetch("/tips");
}

// ── Devices ─────────────────────────────────────────────────────────────────

export interface ApiDevice {
  id: string;
  ownerId: string;
  familyId: string;
  name: string;
  platform: string;
  osVersion: string | null;
  appVersion: string | null;
  capabilities: string[];
  permissionStatus: Record<string, string>;
  status: string;
  isStale: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function apiRegisterDevice(device: {
  id: string;
  name: string;
  platform: "ios" | "android";
  osVersion?: string;
  appVersion?: string;
  capabilities?: string[];
}): Promise<{ device: ApiDevice; syncIntervalSeconds: number }> {
  return apiFetch("/devices", { method: "POST", body: JSON.stringify(device) });
}

export async function apiGetDevices(): Promise<{ devices: ApiDevice[] }> {
  return apiFetch("/devices");
}

export async function apiUpdateDevice(
  deviceId: string,
  updates: { name?: string; capabilities?: string[]; permissionStatus?: Record<string, string> },
): Promise<{ device: ApiDevice }> {
  return apiFetch(`/devices/${deviceId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteDevice(deviceId: string): Promise<void> {
  await apiFetch(`/devices/${deviceId}`, { method: "DELETE" });
}

export async function apiDeviceHeartbeat(
  deviceId: string,
  updates?: { permissionStatus?: Record<string, string>; capabilities?: string[] },
): Promise<{ ok: true; lastSyncedAt: string; syncIntervalSeconds: number }> {
  return apiFetch(`/devices/${deviceId}/heartbeat`, {
    method: "POST",
    body: JSON.stringify(updates ?? {}),
  });
}

export async function apiPostDeviceEvent(
  deviceId: string,
  event: { id: string; eventType: string; payload?: Record<string, unknown>; occurredAt?: string },
): Promise<void> {
  await apiFetch(`/devices/${deviceId}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface ApiDashboardDevice {
  id: string;
  name: string;
  platform: string;
  isStale: boolean;
  lastSyncedAt: string | null;
}

export interface ApiDashboardChild {
  id: string;
  name: string;
  ageBand: string;
  devices: ApiDashboardDevice[];
  recentActivity: {
    windowDays: number;
    screenTimeSeconds: number;
    activityCount: number;
  };
}

export async function apiGetDashboardOverview(): Promise<{ children: ApiDashboardChild[] }> {
  return apiFetch("/dashboard/overview");
}

export interface ApiChildDashboard {
  child: { id: string; name: string; ageBand: string };
  devices: ApiDashboardDevice[];
  screenTime: {
    windowDays: number;
    byDay: { date: string; seconds: number }[];
  };
  activity: {
    windowDays: number;
    byType: { type: string; count: number }[];
  };
}

export async function apiGetChildDashboard(childId: string): Promise<ApiChildDashboard> {
  return apiFetch(`/dashboard/children/${childId}`);
}

// ── Analytics ───────────────────────────────────────────────────────────────

export interface ApiScreenTimeSummary {
  from: string;
  to: string;
  familyTotalDurationSeconds: number;
  familyEventCount: number;
  byDevice: { deviceId: string; totalDurationSeconds: number; eventCount: number }[];
  byDay: { day: string; totalDurationSeconds: number; eventCount: number }[];
  byCategory: { category: string; totalDurationSeconds: number; eventCount: number }[];
}

export interface ApiActivitySummary {
  from: string;
  to: string;
  familyEventCount: number;
  byActivityType: { activityType: string; eventCount: number }[];
  byDevice: { deviceId: string; eventCount: number }[];
}

export async function apiGetAnalyticsSummary(params?: {
  from?: string;
  to?: string;
  deviceId?: string;
}): Promise<{ screenTime: ApiScreenTimeSummary; activity: ApiActivitySummary }> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.deviceId) query.set("deviceId", params.deviceId);
  const qs = query.toString();
  return apiFetch(`/analytics/summary${qs ? `?${qs}` : ""}`);
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface ApiWeeklyDigest {
  from: string;
  to: string;
  familyTotalDurationSeconds: number;
  familyEventCount: number;
  byChild: { childName: string; totalDurationSeconds: number; eventCount: number }[];
  activityHighlights: { activityType: string; eventCount: number }[];
  devices: { name: string; platform: string; stale: boolean; lastSyncedAt: string | null }[];
}

export async function apiSendWeeklyDigest(): Promise<{
  sent: boolean;
  to: string;
  digest: ApiWeeklyDigest;
}> {
  return apiFetch("/notifications/weekly-digest/send", { method: "POST" });
}
