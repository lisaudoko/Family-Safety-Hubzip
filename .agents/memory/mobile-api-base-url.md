---
name: Mobile → API base URL wiring
description: How the Expo mobile app reaches the Express API server, and why setBaseUrl is required.
---

The Expo app must call `setBaseUrl(...)` from `@workspace/api-client-react` before using any generated hook, otherwise requests go nowhere useful.

**Rule:** configure the base URL from `process.env.EXPO_PUBLIC_DOMAIN` (set by the expo dev script to `$REPLIT_DEV_DOMAIN`) as `https://${domain}`. On web with no domain, pass `null` (relative URLs resolve against the current origin).

**Why:** The Expo web bundle is served from the *expo* dev domain (`*.expo.riker.replit.dev`), which is a **different origin** than `REPLIT_DEV_DOMAIN` where the shared proxy routes `/api` to the API server. So relative `/api/...` from the web bundle would hit the expo origin, not the API. Native (Expo Go) has no origin at all and always needs an absolute URL. The API server already enables permissive `cors()`, so the cross-origin call works.

**How to apply:** Any new mobile feature that calls the API relies on `configureApi()` (in `artifacts/mobile/lib/api.ts`) having run at startup (called from `app/_layout.tsx`). In production builds `EXPO_PUBLIC_DOMAIN` may be unset — revisit this when wiring a deployed mobile build.
