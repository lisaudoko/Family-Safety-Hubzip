# API Summary

Express 5, base path `/api`. Auth: `Bearer <uuid-token>` (sessions table; note: expiry not enforced by middleware). "Parent" = requires `role === 'parent'`. OpenAPI spec (`lib/api-spec/openapi.yaml`) covers only `/healthz` + `/coach/chat` — route files are authoritative. Full detail: `docs/API.md`.

## Endpoints

### Health
- `GET /api/healthz` — none — `{ status: "ok" }`

### Auth (`routes/auth.ts`)
- `POST /api/auth/register` — none — parent signup (name, email, password)
- `POST /api/auth/login` — none — email/password
- `GET /api/auth/family-by-code/:code` — none — child names for a family code
- `POST /api/auth/child-login` — none — child ID + PIN
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` — none
- `POST /api/auth/logout` — auth — delete session
- `GET /api/auth/me`, `PATCH /api/auth/me` — auth
- `PATCH /api/auth/onboarding` — auth — mark onboarding complete

### Family & Progress (`routes/family.ts`)
- `GET /api/family` — auth — family + children
- `POST /api/family` — parent — create/update family name
- `POST /api/family/children` — parent — add child (tier limits enforced)
- `PATCH|DELETE /api/family/children/:childId` — parent
- `GET|PUT /api/family/agreement` — auth
- `GET|PUT /api/progress` — auth — learning/challenge progress

### Curriculum (`routes/curriculum.ts`) — all auth
- `GET /api/curriculum` — full aggregate (courses/lessons/quizzes/badges)
- `GET /api/courses`, `GET /api/courses/:courseId`
- `GET /api/lessons/:lessonId` — premium content redacted for free users
- `GET /api/lessons/:lessonId/quiz`
- `GET /api/badges`, `GET /api/tips`

### Devices (`routes/devices.ts`)
- `POST|GET /api/devices` — auth — register/list (parent sees family, child sees own)
- `GET /api/devices/events` — parent — filterable family events
- `GET|PATCH|DELETE /api/devices/:deviceId` — auth
- `POST /api/devices/:deviceId/heartbeat` — auth
- `POST /api/devices/:deviceId/events` — auth — report activity/screen time

### Coach (`routes/coach.ts`)
- `POST /api/coach/chat` — auth — AI coach; 10-message free-tier limit per period

### Billing (`routes/billing.ts`)
- `POST /api/billing/checkout-session` — parent — Stripe checkout URL
- `POST /api/billing/portal-session` — parent — Stripe portal URL
- `POST /api/billing/webhook` — none (Stripe signature verified)

### Analytics & Dashboard — all parent
- `GET /api/analytics/screen-time`, `/api/analytics/activity`, `/api/analytics/summary`
- `GET /api/dashboard/overview`, `GET /api/dashboard/children/:childId`

### Notifications
- `POST /api/notifications/weekly-digest/send` — parent — rate-limited 5/hr

## Cross-cutting

- Global rate limit: 600 req / 15 min / IP. CORS: all origins.
- Validation: Zod `safeParse` (`@workspace/api-zod`) + explicit checks; device events use custom `validateEventPayload`.
- Errors: `try/catch` → `next(err)` → centralized 500 handler. Pino logging with Authorization redaction.
