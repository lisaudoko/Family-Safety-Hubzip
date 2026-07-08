# Roadmap

## Completed Phases (reconstructed from codebase)

1. **Foundation** — monorepo setup, Expo app scaffold, Express API, PostgreSQL/Drizzle, custom auth (bcrypt + sessions), onboarding flow.
2. **Core product** — education system (courses/lessons/quizzes/badges), assessment, family challenges, family profiles + technology agreement, offline-first sync.
3. **Expansion** — child PIN login + Child Mode, device registration/heartbeats/events, parent analytics + dashboard, AI coach with usage metering, Stripe billing + premium gating, password reset, weekly digest emails, accessibility (themes, high contrast, reduce motion), Vitest tests for device/analytics/dashboard/notification routes.
4. **Documentation** (2026-07-08) — AI-friendly knowledge system (`CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/`, `docs/`).

## Current Phase

**Post-MVP hardening.** Stabilize dev environment, keep docs accurate, resolve content dual-sourcing. See `AI_CONTEXT/CURRENT_PHASE.md`.

## Future Development (candidates — not committed)

- Consolidate curriculum to a single source (DB) and retire/repurpose `data/seed.ts` as offline fallback.
- Expand automated test coverage (Vitest exists for some api-server routes; auth/family/billing untested).
- Security hardening: enforce session expiry, add family-ownership checks (agreement, child CRUD), implement or remove email verification.
- App Store release preparation (EAS build, review compliance).
- Deeper device controls / policy enforcement (currently monitoring-only — see `docs/POLICY_ENGINE.md`).
- Admin tooling / content management (no admin role exists).
- Push notifications (only email digest exists today).

Update this file when phases complete or plans change; the living tracker is `AI_CONTEXT/NEXT_TASK.md`.
