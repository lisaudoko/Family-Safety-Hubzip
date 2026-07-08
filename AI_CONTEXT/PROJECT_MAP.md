# Project Map — Fast Navigation

pnpm monorepo. Three top-level areas: `artifacts/` (apps), `lib/` (shared packages), `AI_CONTEXT/` + `docs/` (knowledge system).

## Mobile app (main product) — `artifacts/mobile/`

| What | Where |
| --- | --- |
| Screens (expo-router, file-based) | `app/` |
| Main tabs (index, learn, assess, family, profile) | `app/(tabs)/` |
| Learning flow | `app/course/[id].tsx`, `app/lesson/[id].tsx`, `app/quiz/[id].tsx` |
| Family features | `app/challenge/[id].tsx`, `app/child/[id].tsx`, `app/agreement.tsx` |
| Subscription screen | `app/subscription.tsx` |
| Auth state | `context/AuthContext.tsx` |
| Family/children/progress state | `context/FamilyContext.tsx` |
| AI coach state | `context/CoachContext.tsx` |
| All API call wrappers + token handling | `lib/apiClient.ts` |
| Offline account sync | `lib/localAccountSync.ts` |
| Device sync helpers | `lib/deviceSync.ts` |
| Static content seed (courses/quizzes/etc.) | `data/seed.ts` |
| Theme tokens / hook | `constants/colors.ts`, `hooks/useColors.ts` |
| Shared UI components | `components/UI.tsx` |

## API server — `artifacts/api-server/`

| What | Where |
| --- | --- |
| Express app setup (routers mounted under `/api`) | `src/app.ts` |
| Routes (one file per domain) | `src/routes/` — auth, family, curriculum, devices, billing, analytics, dashboard, coach, notifications, health |
| Auth middleware (`requireAuth`, `requireParent`) | `src/lib/auth-middleware.ts` |
| Stripe client (throws at import if key missing) | `src/lib/stripe.ts` |
| Email (nodemailer) | `src/lib/email.ts` |
| Idempotent startup migrations | `src/lib/startup-migrate.ts` |
| Vitest tests | `test/` — devices, analytics, dashboard, notifications, cross-family |

## Shared libraries — `lib/`

| What | Where |
| --- | --- |
| Drizzle schema (all 19 tables + drizzle-zod) | `lib/db/src/schema/index.ts` |
| OpenAPI spec (partial: healthz + coach/chat only) | `lib/api-spec/openapi.yaml` |
| Generated Zod schemas / hooks (Orval) | `lib/api-zod/`, `lib/api-client-react/` |

## Configuration

| What | Where |
| --- | --- |
| Workspace packages + catalog | `pnpm-workspace.yaml` |
| Root task orchestration | `package.json` |
| TS solution (composite libs) / shared defaults | `tsconfig.json`, `tsconfig.base.json` |
| ESLint | `eslint.config.mjs` (root) |
| Env/secrets | Replit secrets: `DATABASE_URL`, Stripe keys; `EXPO_PUBLIC_DOMAIN` for mobile API base |

## Knowledge system

- `CLAUDE.md` — permanent Claude Code instructions (read first)
- `AI_CONTEXT/` — concise AI summaries + living trackers (CURRENT_STATE, NEXT_TASK, AI_CHANGELOG, ...)
- `docs/` — detailed human documentation
- `.claude/skills/update-project-context/` — post-task documentation-update workflow
- `replit.md` — OUTDATED feature inventory; do not trust for current features
