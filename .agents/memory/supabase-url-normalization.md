---
name: Supabase URL must be the project origin
description: Why getSupabase normalizes EXPO_PUBLIC_SUPABASE_URL to its origin
---

The Supabase client (`getSupabase()` in the mobile app) normalizes
`EXPO_PUBLIC_SUPABASE_URL` to `new URL(url).origin` before calling `createClient`.

**Why:** The `EXPO_PUBLIC_SUPABASE_URL` secret was once set to the REST endpoint
(`https://<ref>.supabase.co/rest/v1/`) instead of the base project URL. The SDK
appends `/auth/v1/...`, `/rest/v1/...` etc. to whatever it is given, so the extra
path produced malformed URLs like `.../rest/v1//auth/v1/token`. Those hit
PostgREST and returned 404 `PGRST125 "Invalid path specified in request URL"`
for every auth and data call — sign-in, sign-up, and profile reads all failed.

**How to apply:** Always pass Supabase the base origin (`https://<ref>.supabase.co`).
If sign-in/auth returns `PGRST125` or 404s on `/auth/v1/*`, suspect a path suffix
in the URL value, not the auth code. The client now self-corrects and logs a
`console.warn` when normalization changes the value — the secret itself should
still be fixed to the canonical base URL.
