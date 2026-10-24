# Architecture Summary

## Shape

pnpm monorepo. Mobile app talks to Express API over HTTPS (Bearer token); API talks to PostgreSQL via Drizzle.

```
artifacts/mobile      Expo app (expo-router, iOS-first) — the product
artifacts/api-server  Express 5 API, all routes under /api, port from $PORT (8080 in dev)
lib/db                Drizzle schema + migrations (19 tables)
lib/api-spec          OpenAPI spec (openapi.yaml) + Orval codegen
```

## Frontend (mobile)

- expo-router file-based screens; main tabs: Home, Learn, Coach, Family, Profile.
- Contexts: `AuthContext` (session, child mode, offline fallback), `FamilyContext` (family/children/progress/agreement), `CoachContext` (AI chat), `AccessibilityContext` (theme/contrast/motion).
- `lib/apiClient.ts` — all HTTP wrappers + token management (`@dv_auth_token` in AsyncStorage).
- `lib/deviceSync.ts` — heartbeats + screen-time reporting. `lib/localAccountSync.ts` — migrates offline accounts to server.
- Offline-first: write AsyncStorage first (instant UI), sync to server best-effort; hydrate from server on load.

## Backend

- Express 5, routes per domain in `src/routes/`: auth, family, curriculum, devices, billing, analytics, dashboard, coach, notifications, health.
- `src/lib/auth-middleware.ts`: `requireAuth` (Bearer → sessions join profiles → attaches userId/role/familyId), `requireParent`.
- Pino logging (pino-http, Authorization redacted), global rate limit 600 req/15min, CORS open, centralized error middleware.
- Startup migrations (`src/lib/startup-migrate.ts`) run idempotent SQL before listening.

## Data Flow

Screen → context → `apiClient` wrapper → `/api/*` route → Zod validation → Drizzle → PostgreSQL. Mobile caches responses in AsyncStorage keyed per user.

## Routing / Ports

Shared reverse proxy routes by path: `/api` → api-server. In dev, curl `localhost:80/api/...`, never the port directly. Mobile uses `EXPO_PUBLIC_DOMAIN` via `configureApiBase()`.
