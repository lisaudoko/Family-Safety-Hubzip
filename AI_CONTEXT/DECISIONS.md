# Decisions (AI-Concise)

Long-form rationale: `docs/DECISIONS.md`. Add new decisions here first.

| Decision | Reason | Impact |
| --- | --- | --- |
| Custom bcrypt + UUID Bearer sessions instead of Supabase/JWT | Full control, simple, backed by own PostgreSQL | Auth logic lives in `routes/auth.ts` + `auth-middleware.ts`; sessions table joins profiles on every request |
| Offline-first mobile (AsyncStorage first, server best-effort) | Mobile users lose connectivity; instant UI | All contexts must write locally first; `local_` accounts sync later |
| OpenAPI + Orval codegen (partially adopted) | Type-safe client/server contract | Spec currently covers only `/healthz` + `/coach/chat`; most routes hand-written — prefer spec-first for new endpoints |
| Stripe for billing, per-family subscriptions | Standard payments; family = billing unit | `subscriptions.family_id` unique; parent-only billing routes |
| Curriculum in DB tables (also static seed retained in mobile) | Server-driven content + premium redaction | Two sources of truth — pending decision to consolidate |
| Text PKs (app-generated UUIDs) | Works offline (client can mint IDs pre-sync) | No serial IDs anywhere |
| Idempotent startup migrations in api-server | Zero-touch schema sync on boot | New tables/columns added as `IF NOT EXISTS` SQL in `startup-migrate.ts` |
| Family code + child PIN login (no child emails) | Kids shouldn't need email accounts | Public lookup endpoint by code; PIN on child record |
| Coach usage metered per family per period | Enforce free-tier limit server-side | `coach_usage` unique (family_id, period) |
| Typecheck as canonical gate, plus root ESLint + api-server Vitest | Lean but not test-free | `pnpm run typecheck` must pass; run `pnpm run lint` and api-server tests when touching server code |
