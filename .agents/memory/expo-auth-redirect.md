---
name: Expo Auth Redirect Pattern
description: Best pattern for auth-based navigation in Expo Router apps.
---

# Expo Auth Redirect Pattern

**Rule:** Use `<Redirect>` in `app/index.tsx` as the auth gate, not `useSegments` + `router.replace()` in `_layout.tsx`.

**Why:** The `useSegments` approach in `_layout.tsx` fires in a `useEffect` after render, causing a flash of the wrong screen. It can also create redirect loops when multiple screens are in the segment check.

**How to apply:**
- `app/index.tsx`: auth gate with `<Redirect href="...">` based on auth state
- `app/_layout.tsx`: providers and Stack configuration only — no redirect logic
- Register all auth screens in the Stack (`welcome`, `login`, `register`, `onboarding`) with `headerShown: false`
- Tab auth screens don't need to be in the Stack since they're inside `(tabs)/_layout.tsx`

**Stack.Screen for all routes (important):** Always declare named screens in the Stack even for file-based routes to control `headerShown`, `animation`, and `presentation`. Without explicit declaration they show a header by default.
