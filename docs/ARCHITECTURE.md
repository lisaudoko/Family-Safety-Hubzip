# Architecture

## Overall

Digital Village is a pnpm monorepo with a mobile client, an API server, and shared libraries:

```
artifacts/mobile/        Expo (React Native) app — the product, iOS-first
artifacts/api-server/    Express 5 API, all routes under /api
artifacts/mockup-sandbox/ Design/preview sandbox (dev tooling, not product)
lib/db/                  Drizzle ORM schema + migrations (PostgreSQL)
lib/api-spec/            OpenAPI spec (openapi.yaml) + Orval codegen output
```

A shared reverse proxy routes traffic by path: `/api` → api-server. The Expo app is accessed via its own dev domain. Services must handle their full base path themselves.

## Frontend Architecture (artifacts/mobile)

- **Routing**: expo-router 6 file-based routing.
  - `(tabs)/`: Home (`index`), Learn, Coach, Family, Profile.
  - Stacks: `course/[id]`, `lesson/[id]`, `quiz/[id]`, `challenge/[id]`, `child/[id]`, `coach/history`, `agreement`, `subscription`.
  - Auth flow: `welcome`, `register`, `login`, `forgot-password`, `child-login`, `onboarding`.
  - `app/index.tsx` is the auth gate (Redirect based on session).
- **State**:
  - `context/AuthContext.tsx` — session lifecycle, token in AsyncStorage (`@dv_auth_token`), child mode + "Return to Parent" token swap, offline `local_` account fallback.
  - `context/FamilyContext.tsx` — family, children, agreement, learning progress; local cache + server sync.
  - `context/CoachContext.tsx` — AI chat history (local + server).
  - `context/AccessibilityContext.tsx` — theme mode, high contrast, reduce motion.
- **Networking**: `lib/apiClient.ts` centralizes all HTTP calls; base URL from `EXPO_PUBLIC_DOMAIN` via `configureApiBase()`. TanStack Query + generated hooks available via `@workspace/api-client-react`.
- **Background sync**: `lib/deviceSync.ts` (heartbeats, screen-time events), `lib/localAccountSync.ts` (offline-account migration on AppState foreground).
- **Content**: `data/seed.ts` holds static courses/lessons/quizzes/challenges/assessment/badges; server also serves curriculum from DB (see Data Flow).
- **UI**: `components/UI.tsx` shared atoms, `hooks/useColors.ts` + `constants/colors.ts` theming (light/dark/high-contrast variants), Inter fonts, Feather icons.

## Backend Architecture (artifacts/api-server)

- `src/index.ts` boot: runs `runStartupMigrations` (idempotent SQL), then listens on `$PORT`.
- `src/app.ts`: CORS (all origins), pino-http logging (Authorization redacted), global rate limit (600/15min/IP), mounts domain routers under `/api`, centralized error middleware (logs + 500).
- `src/routes/`: `auth`, `family`, `curriculum`, `devices`, `billing`, `analytics`, `dashboard`, `coach`, `notifications`, `health`.
- `src/lib/auth-middleware.ts`: `requireAuth` (Bearer token → sessions ⋈ profiles → attaches `userId`/`role`/`familyId`), `requireParent`.
- Validation: Zod `safeParse` from `@workspace/api-zod` (generated) plus explicit checks.

## Database Architecture

PostgreSQL (Replit-provisioned) via Drizzle ORM. 19 tables covering identity (profiles, sessions, reset/verification codes), family (families, children, family_agreements), content (courses, lessons, quizzes, quiz_questions, badges, weekly_tips), progress (user_progress), devices (devices, device_events), monetization (subscriptions, coach_usage), and reporting (family_reports). Full detail: `docs/DATABASE.md`.

## Service Relationships & Data Flow

```
Screen → Context → apiClient wrapper → /api route → auth middleware
       ↘ AsyncStorage (immediate)         ↓ Zod validation
                                          ↓ Drizzle → PostgreSQL
```

- **Offline-first**: mobile writes to AsyncStorage first (instant UI), then syncs to the server best-effort. On app init it loads local cache, then hydrates from the server. `local_` users skip server sync until migrated.
- **Curriculum**: served from DB via `/api/curriculum`; static `data/seed.ts` also exists in the app (dual source — consolidation pending).
- **Devices**: app registers itself, sends heartbeats and events; parents consume aggregated analytics/dashboard endpoints.
- **Billing**: parent → Stripe checkout/portal via API; Stripe webhook updates `subscriptions`; tier checks gate premium content, coach messages, and child limits.
