# Architectural Decisions

Stable, long-form decision records. Concise AI version: `AI_CONTEXT/DECISIONS.md`.

## ADR-1: Custom session auth instead of Supabase or JWT
- **Decision**: bcryptjs password hashing + opaque UUID session tokens (90-day TTL) in a `sessions` table, sent as `Authorization: Bearer <token>`.
- **Reason**: full control over the auth model (parent + child PIN logins, offline accounts) on our own PostgreSQL; avoids third-party auth dependency and JWT revocation complexity.
- **Impact**: every request does a sessions⋈profiles lookup; logout/revocation is a row delete; no signature secrets to manage.

## ADR-2: Offline-first mobile architecture
- **Decision**: all mobile mutations write to AsyncStorage first, then sync to the server best-effort. Registration falls back to local `local_` accounts, migrated later by `localAccountSync.ts`.
- **Reason**: parents/kids use the app with unreliable connectivity; UI must be instant and never data-lossy.
- **Impact**: contexts are dual-write; IDs are client-mintable text UUIDs; conflict handling is last-write-wins via server hydration.

## ADR-3: Contract-first API with OpenAPI + Orval
- **Decision**: `lib/api-spec/openapi.yaml` is the contract; Orval generates React Query hooks and Zod schemas.
- **Reason**: type-safe client/server boundary in a monorepo; single source of truth for payloads.
- **Impact**: endpoint work starts in the spec; server validates with generated Zod; do not change `info.title` (controls generated filenames).

## ADR-4: Family as the billing & metering unit
- **Decision**: Stripe subscriptions, coach usage limits, agreements, and reports are keyed to the family, not the individual profile.
- **Reason**: the product is family-centric; one parent pays for the household.
- **Impact**: `subscriptions.family_id` and `family_agreements.family_id` are unique; `coach_usage` unique on (family_id, period); tier checks resolve via familyId.

## ADR-5: Child access via family code + PIN, not accounts
- **Decision**: children are records in the `children` table and log in by picking their name from a family-code lookup and entering a PIN.
- **Reason**: kids shouldn't need email accounts; COPPA-friendly, parent-controlled.
- **Impact**: public `family-by-code` endpoint; low-entropy PINs mitigated by rate limiting; child sessions are role-scoped.

## ADR-6: Device monitoring is app-reported telemetry, not MDM
- **Decision**: devices self-register and self-report heartbeats/screen-time/activity events; parents see analytics. No remote control/enforcement.
- **Reason**: Expo/App Store constraints; product is education-first, not surveillance.
- **Impact**: no policy enforcement engine (see `docs/POLICY_ENGINE.md`); analytics accuracy depends on app usage.

## ADR-7: Dual migration strategy
- **Decision**: drizzle-kit for dev schema push + idempotent startup migrations in the api-server for deployed environments.
- **Reason**: zero-touch schema sync on boot; Replit deploys don't run manual migration steps.
- **Impact**: new schema must be mirrored as `IF NOT EXISTS` SQL in `startup-migrate.ts`.

## ADR-8: Curriculum stored in the database (with legacy static seed)
- **Decision**: courses/lessons/quizzes/badges/tips live in DB tables served by `/api/curriculum`; server redacts premium content for free users. The original static `data/seed.ts` remains in the mobile app.
- **Reason**: server-driven content enables premium gating and future content updates without app releases.
- **Impact**: two content sources exist; consolidation pending (see `AI_CONTEXT/NEXT_TASK.md`).
