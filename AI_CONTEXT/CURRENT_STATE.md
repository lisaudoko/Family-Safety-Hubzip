# Current State

_Last updated: 2026-07-10_

## Status

Feature-complete MVP+ in active development. Mobile app (Expo) + Express API + PostgreSQL all functional. Not yet published to app stores.

## Completed Major Systems

- **Auth**: parent register/login (bcrypt + UUID Bearer sessions, 90-day TTL at issuance, enforced at request time by `requireAuth` since 2026-07-10), child PIN login via family code, forgot/reset password, offline `local_` accounts with background server sync. Email verification: DB table + `email_verified` column exist, but no verification endpoints/flow are implemented.
- **Education**: 9 courses, 64 lessons, 13 quizzes, 22 badges, weekly tips (snapshot of mobile `data/seed.ts` as of 2026-07-08; DB counts may differ). Content lives in DB (`courses`/`lessons`/`quizzes`/`quiz_questions`/`badges`/`weekly_tips` tables) served via `/api/curriculum`; mobile also has static seed in `data/seed.ts`.
- **Assessment**: 10-question Social Media Readiness Assessment with per-category scoring (client-side, seed data).
- **Family**: family CRUD, children profiles (age bands), family technology agreement builder, family code for child login. Child accounts now get a role-aware Family tab: `GET /api/family` returns a self-excluded `siblings` list alongside `parents`/`children`, and `GET/PUT /api/family/agreement` are family-scoped via session `familyId` (children can read, only parents can write) — see 2026-07-10 entry in `AI_CHANGELOG.md`.
- **Challenges**: 8 family challenges with step tracking.
- **Devices**: device registration, heartbeat sync, screen-time/activity/education-activity event reporting, parent analytics (`screen-time`/`activity`/`education`/`summary`) + dashboard endpoints. Ownership validation (owner-or-family-parent gating on GET/PATCH/DELETE, owner-only on heartbeat/events) and a platform-neutral capability model (`lib/capabilities.ts`) were already implemented; verified and regression-tested 2026-07-10 (previously understated in `NEXT_TASK.md`). Education activity (lesson/quiz/challenge/assessment completions) now has its own `education_activity` event type/`lesson_participation` capability, distinct from general app `activity` events — see `AI_CHANGELOG.md`.
- **AI Coach**: chat endpoint with 10-message free-tier limit per period (`coach_usage` table); mobile chat UI + history.
- **Billing**: Stripe checkout session, customer portal, webhook; `subscriptions` table keyed by family; premium gating on courses/lessons/challenges/coach.
- **Notifications**: on-demand weekly digest email (rate-limited endpoint).
- **Accessibility**: light/dark/system themes, high contrast, reduce motion.

## Active Development Areas

- See `NEXT_TASK.md` (living tracker).

## Current Risks

- `replit.md` describes an older, smaller version of the system (6 tables, "no Stripe") — trust `AI_CONTEXT/` docs and the code, not `replit.md`, for feature inventory.
- Duplicate content sources: curriculum exists in both DB tables and `artifacts/mobile/data/seed.ts`; drift is possible.
- **Security gaps**: (Fixed 2026-07-10: `PUT /family/agreement` IDOR, child CRUD ownership checks, session `expires_at` enforcement in `requireAuth`; full cross-cutting family-data-isolation audit across devices/dashboard/analytics/family/coach/billing/curriculum/notifications found no further gaps — see `AI_CHANGELOG.md`.) See `docs/SECURITY.md` "Known Gaps" for what remains (audit logging, admin role, CORS, email verification).
- **API server will not boot without `STRIPE_SECRET_KEY`**: `src/lib/stripe.ts` throws at import time if the env var is missing, crashing the whole server (not just billing routes). Set the secret or refactor to lazy-init if this becomes a problem.
