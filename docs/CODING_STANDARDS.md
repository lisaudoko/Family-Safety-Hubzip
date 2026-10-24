# Coding Standards

## TypeScript

- Strict mode everywhere (`tsconfig.base.json`); TypeScript 5.9, Node.js 24.
- `lib/*` packages are composite (emit declarations via `tsc --build`); `artifacts/*` are leaf packages checked with `tsc --noEmit`. Never make leaf packages composite.
- Zod imported from `zod/v4`. Prefer generated schemas from `@workspace/api-zod` for API payloads.
- Quality gates: `pnpm run typecheck` (canonical), `pnpm run lint` (root `eslint.config.mjs`), and Vitest tests in `artifacts/api-server/test/` (`pnpm --filter @workspace/api-server run test`).
- Trust `pnpm run typecheck` over editor/LSP state when they disagree.

## File Organization

- Monorepo: `artifacts/` (deployable apps), `lib/` (shared libraries), `scripts/` (utilities).
- Workspace package names: `@workspace/<name>`. Each package declares its own dependencies (`catalog:` when pinned).
- Artifacts never import from each other — shared code goes in a new `lib/*` package.
- Mobile: screens in `app/` (expo-router), shared state in `context/`, HTTP + sync in `lib/`, static content in `data/seed.ts`, theming in `constants/` + `hooks/`.
- Server: one route file per domain in `src/routes/`, shared helpers in `src/lib/`.

## Component Patterns (mobile)

- Reusable atoms in `components/UI.tsx` (ProgressBar, ScoreRing, CategoryPill, SectionHeader) and feature cards (CourseCard, ChallengeCard).
- Always style via `useColors()` (supports light/dark/high-contrast); never hardcode colors.
- Icons: Feather from `@expo/vector-icons`. Fonts: Inter.
- Respect `AccessibilityContext` (reduceMotion, highContrast) in new UI.
- Offline-first mutations: state + AsyncStorage write first, server sync best-effort.

## Backend Patterns

- Route handlers: `try/catch` → `next(err)`; validate with Zod `safeParse` before DB access; 4xx `{ error }` for client faults.
- Auth: `requireAuth` / `requireParent` middleware; scope queries by the attached `familyId`/`userId` — never trust client-provided IDs for ownership.
- Logging: `req.log` in handlers, singleton `logger` elsewhere. **Never `console.log` in server code.**
- Express 5: cast `String(req.params.x)` before drizzle `eq()`.
- New endpoints: prefer spec-first (`lib/api-spec/openapi.yaml` + codegen), but note the spec currently covers only `/healthz` and `/coach/chat` — most existing routes are hand-written.

## Database Patterns

- `snake_case` columns, text PKs (app-generated UUIDs), `created_at`/`updated_at` with `defaultNow()`, jsonb with `.$type<T>()`.
- drizzle-zod insert/select schemas for new tables (omit timestamps on insert).
- Schema change checklist: edit schema → drizzle-kit push (dev) → mirror idempotent SQL in `startup-migrate.ts` → `pnpm run typecheck:libs` → full typecheck.
