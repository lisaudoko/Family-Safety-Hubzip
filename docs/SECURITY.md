# Security

Documentation of the security implementation **as it exists today**.

## Authentication (session tokens, not JWT)

- The system uses **opaque UUID session tokens**, not JWTs. Tokens are created at login/registration, stored in the `sessions` table with a **90-day expiry**, and sent as `Authorization: Bearer <token>`.
- `requireAuth` middleware (`src/lib/auth-middleware.ts`) validates the token by joining `sessions` with `profiles` and attaching `userId`, `role`, `familyId` to the request, and rejects (401) if `sessions.expires_at` is in the past — the expired row is also deleted (best-effort) so it doesn't linger. Enforced as of 2026-07-10; previously the 90-day TTL was written at issuance but never checked at request time.
- Passwords hashed with **bcryptjs** before storage. Child logins use PINs (short numeric secrets) scoped to a family code.
- Password reset uses **hashed one-time codes** (`code_hash`) with `expires_at` and `used_at` tracking. Email verification (implemented 2026-07-11) uses the same hashed-code pattern via `email_verification_codes`: `POST /api/auth/verify-email` (`{ code }`) sets `profiles.email_verified = true`; `POST /api/auth/resend-verification` (rate-limited 5/hr per user) reissues a code. Registration auto-sends the first code. **Verification is informational only — no route or feature checks `email_verified` today**; this is a deliberate least-disruptive default in the absence of an explicit gating decision (see Known Gaps).
- Logout deletes the session row. Sessions cascade-delete when a profile is deleted.
- Mobile stores the token in AsyncStorage (`@dv_auth_token`); offline account passwords are stashed in **SecureStore** during pending sync.

## Role-Based Access Control

- Roles: `parent` (default), child-scoped sessions, and `admin`.
- **Parent permissions**: family & children CRUD, device event listing, analytics, dashboard, billing, weekly digest, minting support-access codes, reading the audit log.
- **Child permissions**: own devices, own progress, curriculum, coach; cannot manage family or billing. `DELETE /api/devices/:deviceId` is `requireParent`-gated (fixed 2026-07-10 — previously any authenticated family member could de-register any family device).
- **Admin**: manually-seeded `profiles.role = 'admin'` accounts (no self-registration endpoint). Not a standing admin surface — admin accounts only gain access to a family's data by redeeming a parent-minted support code, and only for that one family, for a limited time. See "Admin Support Sessions" below.
- Enforcement: `requireParent` middleware on parent-only routes; `requireAdmin` on admin-only routes; family-scoped queries use the `familyId` attached by `requireAuth`.

## Admin Support Sessions (consent-gated, time-boxed)

Added 2026-07-10 in response to a product decision to reserve `admin` strictly for support scenarios, not general access: "the parent account can give us a code for us to put in to login with and we can fix the errors."

- A parent mints a single-use code: `POST /api/family/support-code` (`requireParent`). The plaintext code is returned once (never stored), hashed with bcrypt into `support_codes` with a ~30-minute expiry. Surfaced in the mobile app as "Get Support Access Code" in Profile settings.
- An admin redeems it: `POST /api/admin/support-sessions` (`requireAuth` + `requireAdmin`) with `{ code }`. On a valid, unused, unexpired match, the code is marked used, a `support_sessions` row is created, and a **new** `sessions` row (its own Bearer token, independent of the admin's normal login session) is issued with a 60-minute TTL and `support_session_id` set.
- When `requireAuth` sees a session with `support_session_id` set, it resolves `req.role = 'parent'` and `req.familyId` to the support session's target family — so every existing `requireParent`-gated route (family, devices, analytics, dashboard, billing) works for the admin unmodified, scoped to that one family only. Critically, `req.actorRole` and `req.userId` always continue to reflect the **real admin identity**, never overridden, so every action is still attributable to the admin, not the family. `requireAdmin` checks `req.actorRole` (not the overridable `req.role`), so admin-only routes keep working correctly even when called with a support-session token.
- The admin can end the session early: `POST /api/admin/support-sessions/:id/end` (must be that session's own admin). Ending deletes the associated `sessions` row, so the token stops working immediately; sessions also self-expire at their TTL via the normal `expires_at` check in `requireAuth`.
- No admin-side UI exists — redemption/ending are API-only by design.

## Audit Logging

Added 2026-07-10. New `audit_log` table (`family_id`/`actor_id` indexed) records: `register`, `login`, `login_failed`, `child_login`, `child_login_failed`, `logout`, `password_reset_requested`, `password_reset_completed`, `family_created`, `child_added`, `child_updated`, `child_removed`, `agreement_updated`, `billing_checkout_started`, `billing_portal_opened`, `support_code_created`, `support_session_started`, `support_session_ended`, `support_session_write`.

- Explicit `logAuditEvent()` calls (`src/lib/audit.ts`) are placed at each business-logic call site above — not a blanket request logger, so the `action` vocabulary stays meaningful.
- A separate `logSupportSessionWrite` middleware, mounted globally in `app.ts`, auto-logs one `support_session_write` row per mutating request (POST/PUT/PATCH/DELETE) made during an active support session — this catches admin writes to routes that don't have their own explicit `logAuditEvent` call. GET reads during a support session are **not** individually logged.
- Every audit write is best-effort: `logAuditEvent` catches its own errors and logs them via Pino rather than throwing, so a logging failure never breaks the underlying request.
- Parents read their family's trail via `GET /api/audit-log` (`requireParent`, family-scoped, paginated, date-filterable).

## Rate Limiting

- Global: 600 requests / 15 minutes per IP.
- `/api/notifications/weekly-digest/send`: 5 requests / hour.

## Input Validation

- Zod (`zod/v4`) `safeParse` using schemas from `@workspace/api-zod` (generated from the OpenAPI spec), plus explicit property checks in routes.
- Device event payloads validated by a custom `validateEventPayload`.

## SQL Injection Protection

- All database access goes through **Drizzle ORM**, which parameterizes queries. No raw string-interpolated SQL in routes. Startup migrations use static SQL statements.

## CSRF

- Not applicable in the traditional sense: the API is consumed by a native mobile client using Bearer tokens (no cookie-based sessions), so cross-site request forgery via ambient credentials is not a vector. No CSRF token mechanism exists.

## Payment Security

- Stripe webhook verifies the **Stripe signature** before processing events. Checkout and portal sessions are created server-side; no card data touches the API.

## Logging & Secrets

- Pino logging **redacts Authorization headers and cookies**.
- Secrets (`DATABASE_URL`, Stripe keys) live in Replit environment secrets, never in code.

## Known Gaps (documented, not fixed here)

- Email verification exists (implemented 2026-07-11) but is not enforced — unverified accounts have unrestricted access to every feature. Open question: should any endpoints (e.g. billing, coach) gate on `profiles.email_verified`? No decision made yet.
- CORS is open to all origins.
- Child PINs are low-entropy by design (UX tradeoff); brute-force protection relies on the global rate limit only.
- GET reads during an admin support session are not individually audit-logged, only mutations.
- No admin-side UI for redeeming/ending support sessions — API-only by design.
- Automated tests exist (Vitest in `artifacts/api-server/test/`, incl. `cross-family.test.ts`, `admin.test.ts`) but coverage of the above gaps is incomplete.
