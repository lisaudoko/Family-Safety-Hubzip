---
name: mobile-development
description: Add or modify the Expo mobile app (artifacts/mobile) following Digital Village conventions — expo-router screens, offline-first contexts, apiClient wrappers, theming.
---

# Mobile Development

## When To Use

Any change under `artifacts/mobile/` — screens, contexts, API wrappers, content, styling.

## Process

1. Read `AI_CONTEXT/CURRENT_STATE.md`, `AI_CONTEXT/KNOWN_PATTERNS.md`, and locate files via `AI_CONTEXT/PROJECT_MAP.md`.
2. Follow the existing structure:
   - Screens: expo-router file-based in `app/` (`(tabs)/` for main tabs; dynamic routes like `app/course/[id].tsx`).
   - State: React contexts (`AuthContext`, `FamilyContext`, `CoachContext`, `AccessibilityContext`) + TanStack Query.
   - API calls: add `api<Verb><Noun>()` wrappers in `lib/apiClient.ts` using the shared `apiFetch` (attaches Bearer token from AsyncStorage `@dv_auth_token`). Never fetch directly from screens.
   - Theming: tokens from `constants/colors.ts` via `hooks/useColors.ts` (light/dark). Icons: Feather from `@expo/vector-icons`. Font: Inter.
   - Shared components: reuse `components/UI.tsx` (ProgressBar, ScoreRing, CategoryPill, SectionHeader) before creating new ones.
3. **Preserve offline-first behavior**: write to AsyncStorage immediately (instant UI), sync to server best-effort; on load, hydrate cache first then server. `local_` account IDs skip server sync.
4. Content changes: static content lives in `data/seed.ts`; server curriculum lives in DB tables — keep both in sync or note drift. Assessment categories in seed.ts must match the category maps in `components/AssessmentsPanel.tsx` (assessments live in the Learn tab — there is no separate Assess tab).
5. Verify: `pnpm run typecheck`; visually check via the running expo workflow. Trust `tsc` + a fresh "Web Bundled" log over stale Metro SyntaxErrors captured mid-edit.
6. Update docs via `update-project-context`.

## Gotchas

- API base URL comes from `configureApiBase()` using `EXPO_PUBLIC_DOMAIN` — never hardcode hosts.
- Package installs: `pnpm --filter @workspace/mobile add <dep>` (root installs fail for package-scoped deps).
- `lib/supabase.ts` is legacy — the app uses the Express API, not Supabase. Do not extend it.
