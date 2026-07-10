# CLAUDE.md — Permanent Instructions for Claude Code

## Project Overview

**Digital Village** is an iOS-first family digital safety platform. It helps parents raise digitally-safe kids through education (courses/lessons/quizzes), assessment, family challenges, a family technology agreement, device activity monitoring, and an AI parenting coach.

- Main product: Expo (React Native) mobile app at `artifacts/mobile/`
- Backend: Express 5 API server at `artifacts/api-server/` (all routes under `/api`)
- Database: Replit PostgreSQL with Drizzle ORM, schema at `lib/db/`
- Contract: OpenAPI spec at `lib/api-spec/openapi.yaml` with Orval codegen

Read `AI_CONTEXT/CURRENT_STATE.md` first for a quick orientation, then the relevant `AI_CONTEXT/*.md` summaries. Only read source files when the summaries are insufficient.

## Development Rules

1. **Analyze existing code before modifying.** Inspect the relevant route/context/schema files before changing behavior.
2. **Never duplicate existing functionality.** Check `lib/apiClient.ts`, existing routes, and existing DB tables first.
3. **Reuse existing services** — auth middleware, apiClient wrappers, contexts, shared UI components (`components/UI.tsx`).
4. **Reuse existing database tables** — 19 tables already exist (see `AI_CONTEXT/DATABASE_SUMMARY.md`). Do not create parallel tables.
5. **Follow current architecture** — offline-first mobile (AsyncStorage cache + server sync), Bearer-token sessions, hand-written Express routes (OpenAPI spec only partially adopted).
6. **Ask questions before making assumptions** about product behavior or scope.
7. **Create a plan before major implementation.**
8. **Implement one subsystem at a time** and verify with typecheck between subsystems.
9. **Run checks after each subsystem**: `pnpm run typecheck` (canonical gate), `pnpm run lint` (root ESLint config), and `pnpm --filter @workspace/api-server run test` (Vitest tests exist in `artifacts/api-server/test/`).
10. **Add priorities to the 'AI_CONTEXT/NEXT_TASK.md' when nessesary** or when you see a change that should be made with user approval

## AI Development Context Management

Before beginning any major development task, review:

- `AI_CONTEXT/CURRENT_STATE.md` — current snapshot, risks
- `AI_CONTEXT/CURRENT_PHASE.md` — phase goals and remaining objectives
- `AI_CONTEXT/NEXT_TASK.md` — priority, approved next task, pending decisions
- `AI_CONTEXT/PROJECT_MAP.md` — fast codebase navigation
- Relevant files inside `docs/`

Understand the existing architecture before making changes. Do not duplicate existing services, APIs, database tables, or business logic. Follow existing project patterns and conventions (`AI_CONTEXT/KNOWN_PATTERNS.md`).

**A development task is not complete until the AI knowledge system is updated.** After completing any subsystem, follow `.claude/skills/update-project-context/SKILL.md`: update `AI_CONTEXT/CURRENT_STATE.md`, `COMPLETED_WORK.md`, `NEXT_TASK.md`, and `AI_CHANGELOG.md` (plus any affected `docs/` files). Update only files affected by the change.

### Claude Code Skills (`.claude/skills/`)

| Skill | Use when |
| --- | --- |
| `update-project-context` | After completing any feature/subsystem — sync AI_CONTEXT + docs |
| `architecture-review` | Before multi-subsystem features or new packages/tables/dependencies |
| `api-design` | Before adding or changing any endpoint contract |
| `backend-development` | Implementing anything in `artifacts/api-server/` |
| `database-changes` | Any change to `lib/db` schema |
| `mobile-development` | Any change under `artifacts/mobile/` |
| `security-review` | Changes touching auth, family data, billing, devices; pre-release |
| `release-readiness` | Before deploying or preparing an App Store build |

## Technology

| Area | Choice |
| --- | --- |
| Package manager | pnpm workspaces (monorepo) |
| Runtime | Node.js 24, TypeScript 5.9 (strict) |
| Mobile | Expo SDK 54, expo-router 6, React Native 0.81.5 |
| Mobile state | TanStack Query, React contexts, AsyncStorage |
| Backend | Express 5, Pino logging (pino-http) |
| Database | Replit PostgreSQL, Drizzle ORM, drizzle-zod |
| Validation | Zod (`zod/v4`) |
| API codegen | Orval from `lib/api-spec/openapi.yaml` |
| Payments | Stripe (checkout sessions, customer portal, webhook) |
| Build | esbuild (CJS bundle for api-server) |
| Deployment | Replit workflows; services routed by path via shared proxy |

## Engineering Standards

### TypeScript
- Strict mode across all packages; `lib/*` are composite packages that emit declarations, `artifacts/*` are leaf packages checked with `tsc --noEmit`.
- After changing `lib/db` schema exports, run `pnpm run typecheck:libs` before typechecking api-server (stale declarations otherwise).
- Express 5 types `req.params.X` as `string | string[]` — cast with `String(req.params.X)` before drizzle `eq()`.

### Naming
- DB tables/columns: `snake_case`. TypeScript exports: `camelCase` (e.g., `profilesTable`).
- Workspace packages: `@workspace/<name>`.
- API client wrappers in mobile: `api<Verb><Noun>` (e.g., `apiGetFamily`, `apiSaveProgress`).

### Folder Organization
- `artifacts/mobile/app/` — expo-router file-based screens; `(tabs)/` for main tabs.
- `artifacts/mobile/context/` — React contexts; `lib/` — API + sync helpers; `data/seed.ts` — static content.
- `artifacts/api-server/src/routes/` — one file per domain (auth, family, curriculum, devices, billing, analytics, dashboard, coach, notifications, health).
- `lib/db/src/schema/index.ts` — single schema file with all tables + drizzle-zod schemas.

### API Conventions
- All routes mounted under `/api`. Bearer token auth via `requireAuth`; parent-only routes via `requireParent`.
- The OpenAPI spec (`lib/api-spec/openapi.yaml`) currently covers only `/healthz` and `/coach/chat` — most routes are implemented directly without spec entries. Prefer adding new endpoints to the spec, but don't assume existing routes are spec-backed.
- Validate inputs with Zod `safeParse` (from `@workspace/api-zod`) or explicit checks; return 4xx with a message, pass unexpected errors to `next(err)`.
- Never call service ports directly in dev; go through the shared proxy at `localhost:80/api/...`.

### Database Conventions
- Text primary keys (UUIDs generated in application code).
- `created_at` / `updated_at` timestamps with `defaultNow()`.
- Complex data in `jsonb` with `.$type<T>()`.
- Schema changes: edit `lib/db/src/schema/index.ts`, then `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push` (dev). The server also runs idempotent startup migrations (`src/lib/startup-migrate.ts`).

### Error Handling & Logging
- Server: `try/catch` → `next(err)`; centralized error middleware logs and returns 500.
- **Never `console.log` in server code.** Use `req.log` in handlers, singleton Pino `logger` elsewhere. Authorization headers are redacted.
- Mobile: API failures fall back to local AsyncStorage state (offline-tolerant); do not silently swallow errors in new server code.
## Skill Usage Rules

When a task matches an available Claude Code skill, use that skill automatically.

Available skills should be applied based on task type:

- Architecture changes → architecture-review skill
- Backend work → backend-development skill
- Database changes → database-management skill
- Security-sensitive work → security-review skill
- Mobile/device work → mobile-development skill
- API work → api-design skill
- Completed features → update-project-context skill

Do not wait for the user to explicitly request a skill.


## Additional Documentation

Only read detailed documentation when required.
Reference:

- docs/API.md

- docs/DATABASE.md

- docs/ARCHITECTURE.md

- docs/SECURITY.md

- docs/DEVICE_ARCHITECTURE.md

- docs/ACCOUNT_MODEL.md

- docs/EDUCATION_SYSTEM.md

- docs/POLICY_ENGINE.md

- docs/CODING_STANDARDS.md

- docs/ROADMAP.md

- docs/STATUS.md

- docs/AI_AGENT_WORKFLOW.md

- docs/AI_MODEL_POLICY.md