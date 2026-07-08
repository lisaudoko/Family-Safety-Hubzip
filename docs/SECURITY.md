# Security

Documentation of the security implementation **as it exists today**.

## Authentication (session tokens, not JWT)

- The system uses **opaque UUID session tokens**, not JWTs. Tokens are created at login/registration, stored in the `sessions` table with a **90-day expiry**, and sent as `Authorization: Bearer <token>`.
- `requireAuth` middleware (`src/lib/auth-middleware.ts`) validates the token by joining `sessions` with `profiles` and attaching `userId`, `role`, `familyId` to the request. **Caveat: it does NOT currently check `sessions.expires_at`** — the 90-day TTL is written at issuance but never enforced at request time.
- Passwords hashed with **bcryptjs** before storage. Child logins use PINs (short numeric secrets) scoped to a family code.
- Password reset uses **hashed one-time codes** (`code_hash`) with `expires_at` and `used_at` tracking. Email verification: the `email_verification_codes` table and `profiles.email_verified` column exist, but **no verification endpoints/flow are implemented**.
- Logout deletes the session row. Sessions cascade-delete when a profile is deleted.
- Mobile stores the token in AsyncStorage (`@dv_auth_token`); offline account passwords are stashed in **SecureStore** during pending sync.

## Role-Based Access Control

- Roles: `parent` (default) and child-scoped sessions. There is **no admin role** implemented.
- **Parent permissions**: family & children CRUD, device event listing, analytics, dashboard, billing, weekly digest.
- **Child permissions**: own devices, own progress, curriculum, coach; cannot manage family or billing.
- Enforcement: `requireParent` middleware on parent-only routes; family-scoped queries use the `familyId` attached by `requireAuth`.

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

- **Session expiry not enforced**: `requireAuth` never compares `expires_at` to now; expired tokens keep working until the row is deleted.
- **Broken access control on family agreement writes**: `PUT /api/family/agreement` trusts the client-supplied `familyId` with no ownership check — any authenticated user can upsert another family's agreement (IDOR).
- **Child CRUD ownership not verified**: child add/update/delete routes do not confirm the target `familyId`/`childId` belongs to the authenticated parent's family.
- **Agreement reads are parent-scoped only**: `GET /api/family/agreement` resolves the family via `parent_id = userId`, so child sessions receive `agreement: null` (docs elsewhere describing child read access describe intent, not behavior).
- Email verification flow not implemented (table exists, endpoints do not).
- No audit logging system (device_events records activity, but there is no security audit trail).
- No admin role or admin tooling.
- CORS is open to all origins.
- Child PINs are low-entropy by design (UX tradeoff); brute-force protection relies on the global rate limit only.
- Automated tests exist (Vitest in `artifacts/api-server/test/`, incl. `cross-family.test.ts`) but coverage of the above gaps is incomplete.
