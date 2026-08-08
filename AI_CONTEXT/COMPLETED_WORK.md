# Completed Work

_Add entries when features complete: feature, date, files, notes. Historical entries below are reconstructed from the codebase (dates unknown)._

## 2026-08-08 — Mobile visual redesign ("warm & friendly," full pass)
- Files: `artifacts/mobile/constants/{spacing,radius,typography,elevation,tabs,identityColors,agreementColors}.ts` (new), `components/primitives/*` (new — `Typography`, `Button`, `Card`, `Input`, `Badge`, `Toggle`, `SegmentedControl`, `Avatar`, `Feedback`, `ScoreRing`, `index.ts` barrel), `components/UI.tsx` (deleted, replaced), all 23 `app/` screens, `components/{ChildCard,ChallengeCard,CourseCard,LessonCard,TipCard,MonitoringPanel,AssessmentsPanel,BottomTabBar,ErrorFallback}.tsx`, `app/(tabs)/_layout.tsx`.
- Notes: user asked to make the app "beautiful" while preserving every existing feature. No shared UI primitives existed beforehand — every screen hand-rolled buttons/cards/inputs. Built a token layer (4px spacing grid, 9-step type scale on existing Inter weights, radius/elevation scales) and a real primitives layer, then migrated all 23 screens + shared components onto it in risk-ordered batches (simplest first, `child/[id].tsx` last as the highest-risk screen). Fixed several real dark-mode contrast bugs found along the way (hardcoded `"#FFFFFF"` text on gradient heroes that should have used `colors.primaryForeground`). Deleted an `AppModal` primitive built early on that ended up with zero call sites once real screens were migrated (every actual modal needed a centered dialog or native page-sheet instead). No functional/business logic changed anywhere. Full detail in `AI_CHANGELOG.md` 2026-08-08 entry. **Not visually verified on a device/simulator** (none available in this dev environment) — only confirmed via clean typecheck and full Metro bundle compiles; needs an Expo Go pass before considering it done end-to-end.

## 2026-08-08 — Monitoring & device-controls groundwork (Priority 5 non-native phase)
- Files: `artifacts/api-server/src/services/effectivePolicy.ts` (new), `src/lib/deviceStatus.ts` (new), `src/routes/family.ts`, `src/routes/devices.ts`, `src/routes/dashboard.ts`, `src/routes/notifications.ts`, `test/effective-policy.test.ts` (new — 8 tests, not run, see `CURRENT_STATE.md` risk note); `artifacts/mobile/app/family-policy.tsx` (new), `hooks/useFamilyPolicy.ts` (new), `hooks/useEffectivePolicy.ts` (new), `lib/deviceStatus.ts` (new), `lib/formatRelativeTime.ts` (new — also de-duplicated an identical local `timeAgo` in `app/coach/history.tsx`), `lib/apiClient.ts`, `app/child/[id].tsx`, `app/(tabs)/family.tsx`, `components/MonitoringPanel.tsx`, `app/_layout.tsx`.
- APIs added: `GET /api/family/children/:childId/effective-policy` (optional `?deviceId=`). Device responses gained a `syncStatus` field.
- Notes: user asked for monitoring/parental-control features (device online status, location, app install control, bedtime lockdown, most-used-apps) "using Apple's strict privacy rules." Research (see `docs/POLICY_ENGINE.md`, `docs/DEVICE_ARCHITECTURE.md`) found real on-device enforcement requires Apple's Family Controls entitlement + a native dev-client migration this app doesn't have; user decided (via clarifying questions) to build everything that doesn't need that first, and defer native work, location, and per-app usage analytics as an explicit next phase (see `AI_CONTEXT/NEXT_TASK.md` Priority 5). This pass turns the three existing storage-only policy layers (`family_policies`/`child_policies`/`device_restrictions`) into one resolved, honestly-labeled answer, closes the "family-wide policy has no mobile UI" gap, and replaces an aggregate device-stale count with real per-device online/last-seen status. Full detail in `AI_CHANGELOG.md` 2026-08-08 entry.

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
