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
- [ ] Event processing architecture — validation + storage exist; analytics generated on read (`routes/analytics.ts`); **no audit records yet** (overlaps Priority 6 "Audit logging")

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

## Priority 5 — Policy Engine (Architecture Approved — NOT started)

_No policy engine exists today; the family agreement is a social contract and devices are monitoring-only (see `docs/POLICY_ENGINE.md`)._

- [ ] Family policies, child policies, device policies (schema + storage)
- [ ] Rule evaluation system
- [ ] Permission enforcement — server-side, parent-controlled

## Priority 6 — Security Implementation Review (Required Before Production)

_Note: auth is opaque UUID session tokens, not JWT; there is no admin role today. See `docs/SECURITY.md`._

- [x] Session auth hardening — enforce `expires_at` in `requireAuth` — _fixed 2026-07-10: `requireAuth` now rejects (401) and best-effort deletes sessions past their `expires_at`; regression tests in `test/auth.test.ts`._
- [ ] RBAC verification — parent/child permissions per endpoint; decide if an admin role is needed
- [x] Fix known gaps: `PUT /family/agreement` IDOR, child CRUD ownership checks — fixed 2026-07-10 alongside Child Family Experience
- [ ] Audit logging — does not exist; design + implement
- [x] Rate limiting (global limiter in `app.ts`)
- [x] Input validation (Zod) and SQL injection protection (drizzle parameterization) — keep verifying on new endpoints
- [ ] CSRF — N/A for Bearer-token API today; re-evaluate if cookies are introduced
- [ ] Repeat security review after each major subsystem (`security-review` skill)

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
- Application: [ ] parent registration/login, family + child creation, child login, permissions, dashboard, device sync, analytics — _Vitest coverage exists (devices, analytics, dashboard, notifications, cross-family, family, auth session-expiry); still no coverage for register/login/forgot-password/child-login flows themselves_
- Security: [x] family data isolation tests exist (`cross-family.test.ts`, extended 2026-07-10 with device PATCH/DELETE, analytics, and child-role-403 cases) — [x] session expiry enforcement tests (`auth.test.ts`, added 2026-07-10) — [ ] extend further to remaining unaudited endpoints (coach, billing, curriculum, notifications — audited 2026-07-10 but not yet covered by dedicated cross-family tests)

## Priority 10 — Production Readiness (Before Launch)

- [ ] Complete error handling + logging review
- [ ] Review database indexes and API performance
- [ ] Security review sign-off (Priority 6)
- [ ] Complete documentation + deployment checklist (`release-readiness` skill)

---

## Pending Decisions

- Curriculum single-source: serve exclusively from DB and retire `data/seed.ts`, or keep as offline fallback?
- Admin role: roadmap security review lists admin permissions, but no admin role exists — build one or drop the requirement?
- Update or retire outdated sections of `replit.md`.

## Backlog / Known Follow-ups

- API Server workflow fails in dev: `STRIPE_SECRET_KEY` not set → `src/lib/stripe.ts` throws at import time. Set the secret (or lazy-init the Stripe client).
- Implement or remove the email verification flow (table + column exist, endpoints don't).
- Open CORS — restrict before production.
