# Completed Work

_Add entries when features complete: feature, date, files, notes. Historical entries below are reconstructed from the codebase (dates unknown)._

## 2026-07-10 — Direct auth-flow test coverage (Priority 9)
- Files: `artifacts/api-server/test/auth-flows.test.ts` (new — 7 tests)
- Notes: register/login/family-by-code/child-login/forgot-password/reset-password now have dedicated tests, not just indirect exercise via helpers. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-10 — Device Restrictions (Priority 5 groundwork)
- Files: `lib/db/src/schema/index.ts` (already staged pre-session), `artifacts/api-server/src/lib/startup-migrate.ts`, `src/services/deviceRestrictions.ts`, `src/routes/devices.ts`, `artifacts/mobile/lib/apiClient.ts`, `hooks/useDeviceRestrictions.ts`, `app/(tabs)/profile.tsx`, `test/device-restrictions.test.ts` (new — 3 tests).
- APIs added: `GET|PATCH /api/devices/:deviceId/restrictions`. DB tables added: `device_restrictions`, `device_app_rules` (unwired), `blocked_app_events` (unwired).
- Notes: completed and fixed an in-progress, uncommitted feature found already sitting in the working tree. Fixed a route/service signature mismatch that would have failed typecheck, an IDOR (service never checked family ownership), a mass-assignment gap (no input validation), a missing DB migration, and a dead orphaned mobile file (`app/settings/device-controls.tsx`, deleted). Brought the mobile UI up to parity with all 7 schema fields (previously only 3 were wired). This is parent-set storage only — nothing enforces these restrictions on-device. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

## 2026-07-10 — Device restrictions API client cleanup
- Files: `artifacts/mobile/lib/apiClient.ts`
- Notes: Removed duplicate `apiGetDeviceRestrictions` and `apiUpdateDeviceRestrictions` exports that caused Metro/Babel compilation failure. Consolidated device restrictions methods under the typed `DeviceRestrictions` interface.

## 2026-07-10 — Admin support-access sessions + security audit logging (Priority 6 closed)
- Files: `lib/db/src/schema/index.ts`, `artifacts/api-server/src/lib/startup-migrate.ts`, `src/lib/auth-middleware.ts`, `src/lib/audit.ts` (new), `src/routes/admin.ts` (new), `src/routes/index.ts`, `src/routes/devices.ts`, `src/routes/family.ts`, `src/routes/billing.ts`, `src/app.ts`, `test/helpers.ts`, `test/admin.test.ts` (new), `artifacts/mobile/lib/apiClient.ts`, `artifacts/mobile/app/(tabs)/profile.tsx`
- APIs added: `POST /api/family/support-code`, `GET /api/audit-log`, `POST /api/admin/support-sessions`, `POST /api/admin/support-sessions/:id/end`. DB tables added: `support_codes`, `support_sessions`, `audit_log`; `sessions.support_session_id` added.
- Notes: Closes out Priority 6's last three items (RBAC verification, admin-role decision, audit logging). Admin role is scoped strictly to consent-gated, time-boxed support sessions — no standing admin surface. Also fixed a real RBAC gap (`DELETE /devices/:deviceId` → `requireParent`) and a pre-existing bug in `GET /api/family` that ignored `req.familyId`. Full detail in `AI_CHANGELOG.md` 2026-07-10 entry.

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
