# Digital Village

iOS-first family digital safety platform — education, assessment, and family challenges for parents raising digitally-safe kids.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router 6, React Native 0.81.5
- State: TanStack Query, AsyncStorage (local), Supabase (auth, when env vars set)
- Fonts: Inter (@expo-google-fonts/inter)
- Icons: @expo/vector-icons (Feather)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
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
  - `context/AuthContext.tsx` — dual-mode auth (Supabase when env vars set, AsyncStorage mock otherwise)
  - `context/FamilyContext.tsx` — family/children/progress state, all AsyncStorage
  - `lib/supabase.ts` — lazy Supabase client via getSupabase()
  - `data/seed.ts` — all content: courses, lessons, quizzes, challenges, assessment questions, badges
  - `constants/colors.ts` — light/dark theme tokens
  - `hooks/useColors.ts` — theme hook
  - `components/UI.tsx` — shared components: ProgressBar, ScoreRing, CategoryPill, SectionHeader
- `artifacts/api-server/` — Express API (backing store, mostly unused for mobile yet)

## Architecture decisions

- Supabase auth is opt-in: if `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are not set, app falls back to AsyncStorage mock auth. This means the app runs fully without Supabase credentials.
- `react-native-url-polyfill/auto` is loaded via conditional `require()` (not top-level import) because it crashes on web bundle. Always gate on `Platform.OS !== "web"`.
- Assessment question categories in seed.ts are: "Privacy", "Safety", "Scams", "Communication", "Wellness", "Digital Footprint" — must match CATEGORY_ICONS/CATEGORY_RECOMMENDATIONS in assess.tsx.
- No Stripe/RevenueCat integration — subscription screen simulates upgrade locally via AsyncStorage.

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

- Do NOT use top-level `import "react-native-url-polyfill/auto"` — use conditional require gated on `Platform.OS !== "web"`.
- Expo Metro watcher throws ENOENT on @supabase tmp dir after pnpm install — restart the expo workflow to clear it.
- Assessment question categories must match between seed.ts and the CATEGORY_ICONS/CATEGORY_RECOMMENDATIONS maps in assess.tsx.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Supabase env vars needed: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- See `artifacts/mobile/.env.example` for required env var keys
