---
name: backend-development
description: Add or modify Express 5 API server functionality (artifacts/api-server) following Digital Village conventions — routes, middleware, validation, logging, tests.
---

# Backend Development

## When To Use

Adding or changing anything in `artifacts/api-server/` — routes, middleware, server libs.

## Process

1. Read `AI_CONTEXT/API_SUMMARY.md` and `AI_CONTEXT/KNOWN_PATTERNS.md`; check `docs/API.md` for the existing endpoint inventory (route files are authoritative — the OpenAPI spec covers only `/healthz` and `/coach/chat`).
2. Confirm no existing endpoint already does the job.
3. Implement in the matching domain file in `src/routes/` (auth, family, curriculum, devices, billing, analytics, dashboard, coach, notifications, health). New domain → new file, mounted in `src/app.ts` under `/api`.
4. Follow conventions:
   - `requireAuth` for authenticated routes, `requireParent` for parent-only.
   - **Scope queries by the middleware-attached `familyId`/`userId` — never trust client-supplied IDs for ownership** (existing agreement/child routes violate this; do not copy that pattern).
   - Validate inputs with Zod `safeParse` before DB access; return 4xx `{ error }` for client faults; `try/catch` → `next(err)` for the rest.
   - Log with `req.log` (never `console.log`); Pino redacts Authorization headers.
   - Express 5: cast `String(req.params.x)` before drizzle `eq()`.
5. Test manually via `curl localhost:80/api/...` (shared proxy, never direct port). Add/extend Vitest tests in `artifacts/api-server/test/` for non-trivial logic.
6. Verify: `pnpm run typecheck`, `pnpm run lint`, `pnpm --filter @workspace/api-server run test`.
7. Update docs via the `update-project-context` skill (`API_SUMMARY.md`, `docs/API.md`, changelog).

## Gotchas

- The server crashes at startup if `STRIPE_SECRET_KEY` is unset (`src/lib/stripe.ts` throws at import time).
- After `lib/db` schema changes, run `pnpm run typecheck:libs` first or you'll get stale "no exported member" errors.
- Startup migrations (`src/lib/startup-migrate.ts`) must stay idempotent (`IF NOT EXISTS`).
