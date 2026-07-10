# Completed Work

_Add entries when features complete: feature, date, files, notes. Historical entries below are reconstructed from the codebase (dates unknown)._

## 2026-07-10 — Session expiry enforcement
- Files: `artifacts/api-server/src/lib/auth-middleware.ts`, `test/auth.test.ts`
- Notes: `requireAuth` now rejects expired sessions (401) instead of accepting tokens forever. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-10 — Education activity as a dedicated device-event type
- Files: `artifacts/api-server/src/lib/capabilities.ts`, `src/lib/analytics.ts`, `src/routes/analytics.ts`, `src/routes/dashboard.ts`, `src/routes/devices.ts`, `test/analytics.test.ts`, `test/dashboard.test.ts`, `artifacts/mobile/lib/deviceSync.ts`
- APIs changed/added: new `GET /api/analytics/education`; `GET /api/analytics/summary` now includes `education`; `GET /api/dashboard/children/:childId` now includes `education.byType`; `GET /api/dashboard/overview` per-child `recentActivity` now includes `educationCount`. New device event type `education_activity` (capability `lesson_participation`).
- Notes: Resolved the "educational activity events" pending decision (ingest via device-event pipeline). Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-10 — Enforcement audit: device/dashboard/analytics/family-data isolation
- Files: `artifacts/api-server/test/cross-family.test.ts` (4 new tests)
- Notes: Verified Priority 1 ("device ownership validation") and Priority 2 ("device capability model") were already implemented — checkboxes were stale, not gaps. Completed Priority 3's "Enforcement audit" across all route files; no isolation gaps found. No production code changes; added regression tests. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-10 — Child Family Experience + family API ownership hardening
- Files: `artifacts/api-server/src/routes/family.ts`, `artifacts/api-server/test/family.test.ts`, `artifacts/mobile/context/FamilyContext.tsx`, `artifacts/mobile/lib/apiClient.ts`, `artifacts/mobile/app/(tabs)/family.tsx`
- APIs changed: `GET /api/family` (added `siblings`), `GET/PUT /api/family/agreement` (family-scoped via `req.familyId`; `PUT` now parent-only), `POST/PATCH/DELETE /family/children*` (ownership checks added). No new endpoints or tables.
- Notes: Child Family tab now functional end-to-end (parents + siblings, self excluded); closes the Priority 6 IDOR gaps for family/child routes. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-08 — AI Documentation System
- Files: `CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/*`, `docs/*`
- Notes: Documentation generated from direct codebase inspection; supersedes `replit.md` for feature inventory.

## Pre-documentation (dates unknown, reconstructed)

- **Auth system** — `routes/auth.ts`, `context/AuthContext.tsx`, `lib/auth-middleware.ts`. bcrypt + UUID sessions (90d TTL at issuance; expiry not enforced in middleware), child PIN login via family code, password reset, offline local accounts + sync (`lib/localAccountSync.ts`). Email verification NOT implemented (table only).
- **Education system** — `routes/curriculum.ts`, DB content tables, `data/seed.ts`, learn/course/lesson/quiz screens. 9 courses / 64 lessons / 13 quizzes / 22 badges / weekly tips; premium redaction server-side.
- **Family system** — `routes/family.ts`, `context/FamilyContext.tsx`, family/agreement screens. Family, children (age bands), tech agreement, tier-limited child count.
- **Device tracking & analytics** — `routes/devices.ts`, `routes/analytics.ts`, `routes/dashboard.ts`, `lib/deviceSync.ts`. Registration, heartbeats, events, parent dashboard.
- **AI Coach** — `routes/coach.ts`, `context/CoachContext.tsx`, coach tab + history. 10-message free limit via `coach_usage`.
- **Billing** — `routes/billing.ts`, `subscriptions` table, subscription screen. Stripe checkout/portal/webhook.
- **Notifications** — `routes/notifications.ts`. Weekly digest email, 5/hr rate limit.
- **Accessibility** — `context/AccessibilityContext.tsx`, `hooks/useColors.ts`. Light/dark/system, high contrast, reduce motion.
