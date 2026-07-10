# Next Task (Living Tracker)

_Update this file whenever priorities change or tasks complete._

_Roadmap provided by the product owner on 2026-07-08. Checkboxes reflect actual codebase state (verified); notes in italics flag where reality differs from the original roadmap text._

## Current Phase

**Phase 2 — Mobile-Side Device Sync Wiring + Parent Safety Platform Backend**

Goal: complete the foundation for the parent/child safety ecosystem while maintaining privacy, security, and cross-platform compatibility.

---

## Priority 1 — Complete Backend Device Sync Infrastructure (In Progress)

- [x] Device registration system — `POST /api/devices` exists (child + family association, status tracking)
- [ ] Device ownership validation — _gap: ownership checks need hardening (see Security backlog)_
- [x] Device synchronization APIs — heartbeat/sync endpoints exist (`routes/devices.ts`); last-active + connection status tracked
- [x] Event ingestion — screen time / app activity / device activity events exist (`device_events`)
- [ ] Educational activity events — not yet ingested as device events (progress is tracked separately via `user_progress`)
- [ ] Event processing architecture — validation + storage exist; analytics generated on read (`routes/analytics.ts`); **no audit records yet**

## Priority 2 — Device Capability System

- [ ] Create platform-neutral device capability model (cross-platform only: screen time, activity summaries, app usage summaries, educational activity, device health). No platform-specific unsupported capabilities.

## Priority 3 — Parent Dashboard Backend (Partially Implemented)

- [x] Family overview dashboard (`routes/dashboard.ts`)
- [x] Child activity summaries, device status, usage analytics (`routes/analytics.ts`)
- [ ] Educational progress surfaced in dashboard — partial; connect to education progress (see Priority 7)
- [ ] Policy status — blocked on Priority 5 (no policy engine exists)
- [ ] Enforcement audit: parent-only access is in place via `requireParent`, but family-data isolation must be verified per endpoint (known ownership-check gaps)

## Priority 4 — Child Account System (Mostly Implemented)

- [x] Parent creates child profile; child cannot self-register
- [x] Child joins family; child authentication via family code + PIN
- [x] Child permissions (limited to own devices/progress)

### Child Family Experience (NEW)

- [ ] Family tab role-aware rendering
  - Parent accounts continue to see the parent Family management interface.
  - Child accounts must never see the parent management interface.

- [ ] Child Family view
  - Display parent(s)/guardian(s).
  - Display siblings (other child accounts in the same family).
  - Exclude the currently logged-in child from the sibling list.
  - Display appropriate empty states if there are no siblings.

- [ ] Backend support
  - Audit existing family APIs.
  - Reuse existing family, child, and authentication systems.
  - Extend existing endpoints only if required.
  - Do not duplicate database tables or APIs.

- [ ] Authorization review
  - Ensure child accounts can only retrieve members of their own family.
  - Prevent child accounts from accessing parent management data.
  - Verify family ownership validation.

- [ ] Child onboarding flow — review/polish end-to-end
- [ ] Parent-child relationship validation — _gap: child CRUD routes lack family-ownership verification (security backlog)_

## Priority 5 — Policy Engine (Architecture Approved — NOT started)

_No policy engine exists today; the family agreement is a social contract and devices are monitoring-only (see `docs/POLICY_ENGINE.md`)._

- [ ] Family policies, child policies, device policies (schema + storage)
- [ ] Rule evaluation system
- [ ] Permission enforcement — server-side, parent-controlled

## Priority 6 — Security Implementation Review (Required Before Production)

_Note: auth is opaque UUID session tokens, not JWT; there is no admin role today. See `docs/SECURITY.md`._

- [ ] Session auth hardening — enforce `expires_at` in `requireAuth`
- [ ] RBAC verification — parent/child permissions per endpoint; decide if an admin role is needed
- [ ] Fix known gaps: `PUT /family/agreement` IDOR, child CRUD ownership checks
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
- [ ] Connect education progress to parent dashboard

## Priority 8 — AI Documentation System ✅ COMPLETE (2026-07-08)

- [x] CLAUDE.md, AGENTS.md, AI_CONTEXT/ (14 files incl. all required), docs/ (12 files), Claude skills (8 in `.claude/skills/`)

## Priority 9 — Testing and Quality Assurance (Before Production)

- Environment: [ ] Node / pnpm / DB connection / build process verification
- Application: [ ] parent registration/login, family + child creation, child login, permissions, dashboard, device sync, analytics — _partial Vitest coverage exists (devices, analytics, dashboard, notifications, cross-family); auth & family routes untested_
- Security: [x] family data isolation tests exist (`cross-family.test.ts`) — [ ] extend to unauthorized-access and role-permission testing across all routes

## Priority 10 — Production Readiness (Before Launch)

- [ ] Complete error handling + logging review
- [ ] Review database indexes and API performance
- [ ] Security review sign-off (Priority 6)
- [ ] Complete documentation + deployment checklist (`release-readiness` skill)

---

## Pending Decisions

- Curriculum single-source: serve exclusively from DB and retire `data/seed.ts`, or keep as offline fallback?
- Admin role: roadmap security review lists admin permissions, but no admin role exists — build one or drop the requirement?
- Educational activity events: ingest through the device-event pipeline or keep separate in `user_progress`?
- Update or retire outdated sections of `replit.md`.

## Backlog / Known Follow-ups

- API Server workflow fails in dev: `STRIPE_SECRET_KEY` not set → `src/lib/stripe.ts` throws at import time. Set the secret (or lazy-init the Stripe client).
- Implement or remove the email verification flow (table + column exist, endpoints don't).
- Open CORS — restrict before production.
