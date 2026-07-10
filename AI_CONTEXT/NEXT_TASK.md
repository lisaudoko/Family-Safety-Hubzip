# Next Task (Living Tracker)

_Update this file whenever priorities change or tasks complete._

_Roadmap provided by the product owner on 2026-07-08. Checkboxes reflect actual codebase state (verified); notes in italics flag where reality differs from the original roadmap text._

## Current Phase

**Phase 2 — Mobile-Side Device Sync Wiring + Parent Safety Platform Backend**

Goal: complete the foundation for the parent/child safety ecosystem while maintaining privacy, security, and cross-platform compatibility.

---

## Priority 1 — Complete Backend Device Sync Infrastructure (In Progress)

- [x] Device registration system — `POST /api/devices` exists (child + family association, status tracking)
- [x] Device ownership validation — _verified 2026-07-10: `loadDeviceForCaller` in `devices.ts` gates GET/PATCH/DELETE by `device.owner_id === req.userId` or (`req.role === 'parent' && device.family_id === req.familyId`); heartbeat/events endpoints require exact owner match. Was already implemented; checkbox was stale. Locked in with new cross-family tests (`cross-family.test.ts`)._
- [x] Device synchronization APIs — heartbeat/sync endpoints exist (`routes/devices.ts`); last-active + connection status tracked
- [x] Event ingestion — screen time / app activity / device activity events exist (`device_events`)
- [x] Educational activity events — _resolved 2026-07-10 (product owner decision: ingest via device-event pipeline). Found this was already substantially wired (`FamilyContext.tsx` already called `submitActivityEvent` on every lesson/quiz/challenge/assessment completion) but overloaded the generic `activity` event type. Split into a dedicated `education_activity` event type mapped to the previously-unused `lesson_participation` capability, so learning activity is now distinguishable from general app usage in `/api/analytics/education` and the dashboard's `education` breakdown. `user_progress` remains the detailed source of truth for progress state; `device_events` now also carries a lightweight completion signal for the unified activity timeline._
- [ ] Event processing architecture — validation + storage exist; analytics generated on read (`routes/analytics.ts`); security/account audit records now exist (`audit_log` table, see Priority 6) — device-event-specific auditing beyond that is still just `device_events` telemetry, not a formal audit trail

## Priority 2 — Device Capability System (Done)

- [x] Create platform-neutral device capability model — _verified 2026-07-10: `lib/capabilities.ts` already defines a cross-platform `CAPABILITIES` list (screen_time_reporting, activity_summary, device_sync, notifications, family_participation, lesson_participation, website_filtering_status) with no OS-specific entries, enforced at registration/update/event-ingestion time in `devices.ts`. Was already implemented; checkbox was stale._

## Priority 3 — Parent Dashboard Backend (Partially Implemented)

- [x] Family overview dashboard (`routes/dashboard.ts`)
- [x] Child activity summaries, device status, usage analytics (`routes/analytics.ts`)
- [ ] Educational progress surfaced in dashboard — partial; connect to education progress (see Priority 7)
- [ ] Policy status — blocked on Priority 5 (no policy engine exists)
- [x] Enforcement audit — _completed 2026-07-10: reviewed `devices.ts`, `dashboard.ts`, `analytics.ts`, `family.ts`, `coach.ts`, `billing.ts`, `curriculum.ts`, `notifications.ts` for family-data isolation. All endpoints correctly scope by `req.familyId`/`req.userId`; `requireParent` correctly gates parent-only routes. No new gaps found (the previously-known family.ts IDOR gaps were already fixed same-day, see Priority 4/6). Added regression tests: cross-family device PATCH/DELETE 404, cross-family analytics isolation, child-role 403 on dashboard/analytics — see `cross-family.test.ts`._

## Priority 4 — Child Account System (Done)

- [x] Parent creates child profile; child cannot self-register
- [x] Child joins family; child authentication via family code + PIN
- [x] Child permissions (limited to own devices/progress)

### Child Family Experience — DONE (2026-07-10)

- [x] Family tab role-aware rendering
  - Parent accounts continue to see the parent Family management interface.
  - Child accounts must never see the parent management interface.
  - _(Screen was already role-branched in `family.tsx`; the "Add Child" form JSX had been left as a placeholder comment and was filled in as part of this task — unrelated pre-existing gap found during typecheck.)_

- [x] Child Family view
  - Display parent(s)/guardian(s) — `GET /api/family` `parents` field (pre-existing).
  - Display siblings (other child accounts in the same family) — new `siblings` field.
  - Exclude the currently logged-in child from the sibling list — done server-side in `GET /api/family`.
  - Display appropriate empty states if there are no siblings — "No siblings found." (pre-existing JSX, now reachable).

- [x] Backend support
  - Audited `family.ts`; reused `GET /api/family`, `GET/PUT /api/family/agreement`, extended in place — no new tables/endpoints.

- [x] Authorization review
  - Child accounts only ever see their own family (`req.familyId`-scoped).
  - `GET /api/family/agreement` now resolves via `req.familyId` (previously `parent_id`-only, so children got `agreement: null`); `PUT` now requires `requireParent` + familyId match.
  - Verified family ownership validation — see Priority 6 below.

- [ ] Child onboarding flow — review/polish end-to-end (not part of this pass)
- [x] Parent-child relationship validation — IDOR fixes landed (`POST/PATCH/DELETE /family/children*`, `PUT /family/agreement` now verify `req.familyId`); moved off Priority 6 backlog.

## Priority 5 — Policy Engine & Cross-Platform Device Enforcement (In Progress)

_The family agreement remains a social contract. Device restrictions are stored but not yet enforced._

### Policy Definition (In Progress)

- [x] Device policies (schema + storage)
- [x] Family policies — _completed 2026-07-10: `family_policies` table (one row per family) + `GET|PATCH /api/family/policy` (parent-only), mirroring `device_restrictions` field set (screen_time_limit_minutes, bedtime_start/end, block_new_app_installs, block_safari, block_explicit_content, require_parent_approval). Storage only, no enforcement. See `services/familyPolicy.ts`, `routes/family.ts`, `docs/POLICY_ENGINE.md`._
- [x] Child policies — _completed 2026-07-10: `child_policies` table (one row per child, family_id denormalized for ownership checks) + `GET|PATCH /api/family/children/:childId/policy` (parent-only, 404 on cross-family child access). Same field set/pattern as family policies. See `services/childPolicy.ts`. Precedence (family < child < device) documented in `docs/POLICY_ENGINE.md` but not coded — no rule evaluation exists._
- [ ] Rule evaluation engine
- [ ] Policy conflict resolution

### Device Enforcement (Not Started)

- [ ] Cross-platform enforcement agent (iOS & Android)
- [ ] App install blocking
- [ ] App usage schedules & time limits
- [ ] Device lock schedules (bedtime/school hours)
- [ ] Website & content filtering
- [ ] Remote device controls
- [ ] Parent alerts & activity monitoring
- [ ] Tamper detection & prevention

## Priority 6 — Security Implementation Review (Required Before Production) — DONE (2026-07-10)

_Note: auth is opaque UUID session tokens, not JWT. An `admin` role now exists, reserved for consent-gated support access (see below)._

- [x] Session auth hardening — enforce `expires_at` in `requireAuth` — _fixed 2026-07-10: `requireAuth` now rejects (401) and best-effort deletes sessions past their `expires_at`; regression tests in `test/auth.test.ts`._
- [x] RBAC verification — _completed 2026-07-10: fresh audit found one real gap, `DELETE /api/devices/:deviceId` was `requireAuth`-only (a child session could de-register any family device); fixed to `requireParent`. Admin-role decision: added a manually-seeded `admin` role used only for time-boxed, parent-consented support sessions, not a standing admin surface. A parent mints a single-use code (`POST /api/family/support-code`); an admin redeems it (`POST /api/admin/support-sessions`) to get a temporary session scoped to that one family, with the same read/write access a parent has. `requireAuth` resolves a support session's token to `req.role = 'parent'` + the target family's `req.familyId`, while `req.actorRole`/`req.userId` always reflect the real admin identity for audit attribution. See `docs/ACCOUNT_MODEL.md` and `docs/SECURITY.md`._
- [x] Fix known gaps: `PUT /family/agreement` IDOR, child CRUD ownership checks — fixed 2026-07-10 alongside Child Family Experience
- [x] Audit logging — _implemented 2026-07-10: new `audit_log` table + `logAuditEvent()` helper (`src/lib/audit.ts`), called explicitly at auth (register/login/login-failed/child-login/child-login-failed/logout/password-reset), family (family-created/child-added/child-updated/child-removed/agreement-updated), and billing (checkout-session/portal-session) call sites, plus support-session lifecycle events. A `logSupportSessionWrite` middleware (mounted globally in `app.ts`) auto-logs every mutating request made during an active support session. Family-scoped, paginated read via `GET /api/audit-log` (`requireParent`)._
- [x] Rate limiting (global limiter in `app.ts`)
- [x] Input validation (Zod) and SQL injection protection (drizzle parameterization) — keep verifying on new endpoints
- [x] CSRF — N/A for Bearer-token API today; re-evaluate if cookies are introduced
- [x] Repeat security review after each major subsystem (`security-review` skill) — applied during this pass; re-invoke for future subsystems

## Priority 7 — Education System Expansion

- [ ] Review existing modules (9 courses / 64 lessons seed snapshot; DB is the served source)
- [ ] Identify + create missing lessons; resolve dual-source (DB vs `data/seed.ts`) decision first
- [ ] Verify lesson progression
- [x] Track child learning progress (`user_progress`)
- [~] Connect education progress to parent dashboard — _partial: `GET /api/dashboard/children/:childId` and `/api/analytics/education` now surface education *activity* (completion events/counts) as of 2026-07-10; detailed progress state (course %, badges, assessment scores from `user_progress`) is not yet surfaced in the dashboard._

## Priority 8 — AI Documentation System ✅ COMPLETE (2026-07-08)

- [x] CLAUDE.md, AGENTS.md, AI_CONTEXT/ (14 files incl. all required), docs/ (12 files), Claude skills (8 in `.claude/skills/`)

## Priority 9 — Testing and Quality Assurance (Before Production)

- Environment: [ ] Node / pnpm / DB connection / build process verification
- Application: [x] parent registration/login, family + child creation, child login, permissions, dashboard, device sync, analytics — _Vitest coverage exists (devices, analytics, dashboard, notifications, cross-family, family, auth session-expiry, device-restrictions, family-policy, child-policy); register/login/forgot-password/reset-password/child-login flows now covered directly (`test/auth-flows.test.ts`, 7 tests, added 2026-07-10)._
- Security: [x] family data isolation tests exist (`cross-family.test.ts`, extended 2026-07-10 with device PATCH/DELETE, analytics, and child-role-403 cases) — [x] session expiry enforcement tests (`auth.test.ts`, added 2026-07-10) — [ ] extend further to remaining unaudited endpoints (coach, billing, curriculum, notifications — audited 2026-07-10 but not yet covered by dedicated cross-family tests)

## Priority 10 — Production Readiness (Before Launch)

- [ ] Complete error handling + logging review
- [ ] Review database indexes and API performance
- [ ] Security review sign-off (Priority 6)
- [ ] Complete documentation + deployment checklist (`release-readiness` skill)

---

## Pending Decisions

- ~~Curriculum single-source~~ — resolved 2026-07-10 (product owner): serve exclusively from DB; retire `artifacts/mobile/data/seed.ts`. Not yet implemented — see backlog below.
- ~~Admin role~~ — resolved 2026-07-10: `admin` role added, scoped to consent-gated, time-boxed support sessions only (see Priority 6). No standing admin UI/surface exists or is planned; redemption is API-only.
- ~~replit.md~~ — resolved 2026-07-10 (product owner): update it to match current reality rather than retiring it. Not yet implemented — see backlog below.
- ~~Priority 5 policy engine scope~~ — resolved 2026-07-10 (product owner): proceed with family/child-level policy schema + storage (same pattern as the `device_restrictions` groundwork), understanding nothing enforces these server-side or on-device yet. Implemented 2026-07-10 — see Priority 5 Policy Definition.

## Backlog / Known Follow-ups

- ~~Coach chat broken ("The coach couldn't respond")~~ — fixed 2026-07-10: root cause was mobile-only — `configureApi()` (`artifacts/mobile/lib/api.ts`), required to set the shared `@workspace/api-client-react` client's base URL and auth-token getter, was never called from `app/_layout.tsx`, and never wired `setAuthTokenGetter` even in its own body. Server-side `/api/coach/chat` was confirmed healthy via direct curl the whole time. See `AI_CHANGELOG.md`.
- ~~Per-child devices/monitoring on Family tab~~ — implemented 2026-07-10: each child's detail screen (`app/child/[id].tsx`) now has its own "Default Restrictions" (bound to the `child_policies` endpoints) and "Devices" section (rename in place, expand to per-device restrictions), closing the mobile-UI gap flagged in the prior Family & Child Policies changelog entry. Removed the device-picker/restrictions UI from `app/(tabs)/profile.tsx`. The family-wide policy endpoint (`GET|PATCH /api/family/policy`) still has no mobile UI — remains open.
- ~~API Server workflow fails in dev: `STRIPE_SECRET_KEY` not set → `src/lib/stripe.ts` throws at import time~~ — _verified 2026-07-10: this was already stale. `src/lib/stripe.ts` exports `stripe: Stripe | null` (null when `STRIPE_SECRET_KEY` is unset) and `billing.ts` guards every usage with `if (!stripe) res.status(503)...`; nothing throws at import. Proven by the full test suite, which imports `app.js` (and transitively `stripe.ts`) in every test file and boots fine with no `STRIPE_SECRET_KEY` set in the test environment. No code change needed — checkbox corrected._
- ~~Implement or remove the email verification flow~~ — resolved 2026-07-10 (product owner): implement it (table + `email_verified` column already exist, endpoints don't). Not yet implemented — see Priority 1/backlog.
- Open CORS — restrict before production.
