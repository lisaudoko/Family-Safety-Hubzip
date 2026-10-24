# API Summary

Express 5, base path `/api`. Auth: `Bearer <uuid-token>` (sessions table; `expires_at` enforced by `requireAuth`). "Parent" = requires `role === 'parent'`; a redeemed admin support session also resolves to `role === 'parent'` for the target family (see Admin below) while `actorRole`/`userId` still reflect the real admin for audit attribution. "Admin" = requires `actorRole === 'admin'` (`requireAdmin`), checked separately from `role` so it still works during a support session. OpenAPI spec (`lib/api-spec/openapi.yaml`) covers only `/healthz` + `/coach/chat` — route files are authoritative. Full detail: `docs/API.md`.

## Endpoints

### Health
- `GET /api/healthz` — none — `{ status: "ok" }`

### Auth (`routes/auth.ts`)
- `POST /api/auth/register` — none — parent signup (name, email, password)
- `POST /api/auth/login` — none — email/password
- `GET /api/auth/family-by-code/:code` — none — child names for a family code
- `POST /api/auth/child-login` — none — child ID + PIN
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` — none
- `POST /api/auth/verify-email` — auth — body `{ code }`; marks `email_verified = true` (2026-07-11, informational only, not access-gated)
- `POST /api/auth/resend-verification` — auth — rate-limited 5/hr, reissues a verification code
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
- `POST /api/family/support-code` — parent — mint a single-use, ~30min-TTL code for admin support access (one-time plaintext reveal)
- `GET /api/audit-log` — parent — family-scoped, paginated security/account event history

### Curriculum (`routes/curriculum.ts`) — all auth
- `GET /api/curriculum` — full aggregate (courses/lessons/quizzes/badges)
- `GET /api/courses`, `GET /api/courses/:courseId`
- `GET /api/lessons/:lessonId` — premium content redacted for free users
- `GET /api/lessons/:lessonId/quiz`
- `GET /api/badges`, `GET /api/tips`

### Devices (`routes/devices.ts`)
- `POST|GET /api/devices` — auth — register/list (parent sees family, child sees own)
- `GET /api/devices/events` — parent — filterable family events
- `GET|PATCH /api/devices/:deviceId` — auth
- `DELETE /api/devices/:deviceId` — parent (fixed 2026-07-10, was auth-only — a child could de-register any family device)
- `POST /api/devices/:deviceId/heartbeat` — auth
- `POST /api/devices/:deviceId/events` — auth — report activity/screen time
- `GET|PATCH /api/devices/:deviceId/restrictions` — parent — screen time limit, bedtime window, block Safari/new-app-installs/explicit-content, require-parent-approval (2026-07-10; first Priority 5 policy-engine building block — parent-set, not yet enforced on-device). Cross-family access returns 404, same convention as other device routes.

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

### Admin (`routes/admin.ts`) — consent-gated support access only, no standing admin surface
- `POST /api/admin/support-sessions` — admin — redeem a parent-minted code (`{ code }`) for a time-boxed (60min TTL) session scoped to that family; returns a new Bearer token
- `POST /api/admin/support-sessions/:id/end` — admin (must be that session's admin) — end the session early

## Cross-cutting

- Global rate limit: 600 req / 15 min / IP. CORS: all origins.
- Validation: Zod `safeParse` (`@workspace/api-zod`) + explicit checks; device events use custom `validateEventPayload`.
- Errors: `try/catch` → `next(err)` → centralized 500 handler. Pino logging with Authorization redaction.
