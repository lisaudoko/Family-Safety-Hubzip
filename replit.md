# Digital Village

iOS-first family digital safety platform — education, assessment, and family challenges for parents raising digitally-safe kids.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild composite lib declarations (run this after schema changes)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only); or use `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push`
- Required env: `DATABASE_URL` — Replit PostgreSQL connection string (provisioned automatically)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router 6, React Native 0.81.5
- State: TanStack Query, AsyncStorage (local cache + offline fallback), API server (persistent store)
- Auth: bcryptjs + UUID session tokens stored in `sessions` table, sent as `Authorization: Bearer <token>`
- Fonts: Inter (@expo-google-fonts/inter)
- Icons: @expo/vector-icons (Feather)
- API: Express 5
- DB: Replit PostgreSQL + Drizzle ORM (6 tables: profiles, sessions, families, children, user_progress, family_agreements)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo app (the main product)
  - `app/` — expo-router screens (file-based routing)
  - `app/(tabs)/` — main tab screens: index, learn, assess, family, profile
  - `app/course/[id].tsx`, `app/lesson/[id].tsx`, `app/quiz/[id].tsx` — learning flow
  - `app/challenge/[id].tsx`, `app/child/[id].tsx` — family features
  - `app/agreement.tsx` — family tech agreement builder
  - `app/subscription.tsx` — premium upgrade screen
  - `context/AuthContext.tsx` — auth via API server (bcrypt + sessions); offline AsyncStorage fallback for network errors
  - `context/FamilyContext.tsx` — family/children/progress; local AsyncStorage cache + server sync on load
  - `lib/apiClient.ts` — all API call wrappers (auth, family, children, agreement, progress); token management
  - `data/seed.ts` — all content: courses, lessons, quizzes, challenges, assessment questions, badges
  - `constants/colors.ts` — light/dark theme tokens
  - `hooks/useColors.ts` — theme hook
  - `components/UI.tsx` — shared components: ProgressBar, ScoreRing, CategoryPill, SectionHeader
- `artifacts/api-server/` — Express API (auth + family + progress routes)
  - `src/routes/auth.ts` — register, login, logout, me, patch me, onboarding, upgrade
  - `src/routes/family.ts` — family CRUD, children CRUD, agreement, progress
  - `src/lib/auth-middleware.ts` — Bearer token session validation
- `lib/db/` — Drizzle schema + migrations (Replit PostgreSQL)

## Architecture decisions

- **No Supabase** — auth and data storage use the Express API server backed by Replit PostgreSQL.
- Auth: bcrypt password hashing, UUID session tokens with 90-day TTL in `sessions` table. Token stored in AsyncStorage as `@dv_auth_token`, sent as `Authorization: Bearer <token>`.
- Mobile writes to AsyncStorage first (instant UI), then syncs to API server best-effort (offline tolerant).
- On app init, mobile loads from local cache then hydrates from server. Local-only users (id starts with `local_`) skip server sync.
- Assessment question categories in seed.ts are: "Privacy", "Safety", "Scams", "Communication", "Wellness", "Digital Footprint" — must match CATEGORY_ICONS/CATEGORY_RECOMMENDATIONS in assess.tsx.
- No Stripe/RevenueCat integration — subscription screen simulates upgrade locally via AsyncStorage (calls `PATCH /api/auth/upgrade` too).
- After adding new table exports to `lib/db/src/schema/index.ts`, always run `pnpm run typecheck:libs` before checking api-server types, or you'll get stale "no exported member" errors.

## Product

- **Welcome/Auth**: Welcome screen → Register/Login → Onboarding (family name + children)
- **Home tab**: Dashboard with stats (courses/lessons/badges), weekly tip, active challenges, recent courses
- **Learn tab**: Courses + Challenges browser with category filters. Courses contain lessons → quizzes.
- **Assess tab**: 10-question Social Media Readiness Assessment with per-category scoring and personalized recommendations
- **Family tab**: Children profiles, Family Technology Agreement builder, privacy pledge
- **Profile tab**: Stats, settings (Edit Profile, Notifications, Privacy Policy, Help & Support), logout

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Assessment question categories must match between seed.ts and the CATEGORY_ICONS/CATEGORY_RECOMMENDATIONS maps in assess.tsx.
- `pnpm --filter @workspace/<pkg> add <dep>` for package-scoped installs; `installLanguagePackages` runs at the workspace root and fails.
- Cast `req.params.X` to `String(req.params.X)` before drizzle `eq()` — Express 5 types params as `string | string[]`.
- Run `pnpm run typecheck:libs` after any schema change before typechecking api-server.
- Schema push: `pnpm --filter @workspace/db run push` triggers a pnpm install check that can fail; use `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push` instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- API base URL in mobile is configured via `configureApiBase()` in `lib/apiClient.ts` using `EXPO_PUBLIC_DOMAIN` env var
