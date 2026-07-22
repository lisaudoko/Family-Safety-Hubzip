# Account Model

## Account Types

### Parent accounts
- Created via `POST /api/auth/register` with full name, email, password (bcrypt-hashed).
- Stored in `profiles` with `role = 'parent'`, `subscription_tier` (`'free'` default), `has_completed_onboarding`, `email_verified`. Registration auto-sends a 6-digit verification code (`email_verification_codes`, 15-min TTL); `POST /api/auth/verify-email`/`POST /api/auth/resend-verification` (2026-07-11) confirm/reissue it. Verification is informational only — not required for any action today.
- Each parent owns exactly one family (`families.parent_id`). The family has a unique `family_code`.
- Parents manage: family name, children, agreement, devices/analytics, billing.

### Child accounts
- Children are rows in the `children` table (name, `age_band`, PIN) — **not** email-based accounts.
- Child login flow: parent shares the family code → `GET /api/auth/family-by-code/:code` returns child names → child selects self and enters 4–6 digit PIN → `POST /api/auth/child-login` issues a child-scoped session.
- Child sessions render a restricted "Child Mode" UI; "Return to Parent" swaps back to the parent token.

### Family accounts
- The family is the unit for: subscription/billing (`subscriptions.family_id` unique), agreement (`family_agreements.family_id` unique), coach usage metering (`coach_usage`), device grouping, reports.

### Offline (`local_`) accounts
- If registration fails due to network, the app creates a local profile (id prefixed `local_`) in AsyncStorage. All progress stays local.
- `lib/localAccountSync.ts` migrates the account to the server when connectivity returns (password held in SecureStore until then). Local users skip server sync.

### Admin accounts (support access only)
- Added 2026-07-10. `profiles.role = 'admin'` rows are **manually seeded** (direct DB insert) — there is no self-registration or invite endpoint. They log in through the normal `POST /api/auth/login` like any other profile.
- Admin accounts have **no standing access to any family's data**. The only way an admin can read/write a family is by redeeming a single-use code that family's parent generated (`POST /api/family/support-code` → `POST /api/admin/support-sessions`), which grants a time-boxed (60-minute), parent-equivalent session scoped to that one family. See "Admin Support Sessions" in `docs/SECURITY.md` for the full mechanism, and `GET /api/audit-log` for how parents see what happened during one.

## Roles & Permissions

| Capability | Parent | Child |
| --- | --- | --- |
| Family/children CRUD | ✅ | ❌ |
| Agreement read / write | ✅ / ✅ | ❌ (GET is parent-scoped; children receive `agreement: null`) |
| Curriculum, progress, coach | ✅ | ✅ |
| Devices | family-wide | own only |
| Device events / analytics / dashboard | ✅ | ❌ |
| Billing (checkout/portal) | ✅ | ❌ |
| Weekly digest | ✅ | ❌ |
| Mint support-access code / read audit log | ✅ | ❌ |

Admin role exists, but strictly for redeeming a parent-minted support code into a temporary, single-family, parent-equivalent session — never as standing access. See "Admin accounts" above and `docs/SECURITY.md`.

## Authentication Flow

1. Register/login → server creates `sessions` row (UUID token, 90-day expiry) → token returned.
2. Mobile stores token in AsyncStorage `@dv_auth_token`; `apiFetch` attaches `Authorization: Bearer <token>`.
3. `requireAuth` validates on each request (sessions ⋈ profiles), enforces `expires_at` (401 + best-effort delete if expired, since 2026-07-10), and attaches `userId`, `role`, `familyId`, `actorRole`. If the session carries a `support_session_id` (an admin support session), `role`/`familyId` are overridden to the target family while `actorRole`/`userId` keep reflecting the real admin.
4. Password reset: `forgot-password` emails a code → `reset-password` verifies hashed code + expiry.
5. Logout deletes the session row and clears local token.
