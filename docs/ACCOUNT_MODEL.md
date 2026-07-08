# Account Model

## Account Types

### Parent accounts
- Created via `POST /api/auth/register` with full name, email, password (bcrypt-hashed).
- Stored in `profiles` with `role = 'parent'`, `subscription_tier` (`'free'` default), `has_completed_onboarding`, `email_verified`.
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

No admin role exists.

## Authentication Flow

1. Register/login → server creates `sessions` row (UUID token, 90-day expiry) → token returned.
2. Mobile stores token in AsyncStorage `@dv_auth_token`; `apiFetch` attaches `Authorization: Bearer <token>`.
3. `requireAuth` validates on each request (sessions ⋈ profiles) and attaches `userId`, `role`, `familyId`. Note: `expires_at` is written at issuance but not currently enforced by the middleware (see `docs/SECURITY.md`).
4. Password reset: `forgot-password` emails a code → `reset-password` verifies hashed code + expiry.
5. Logout deletes the session row and clears local token.
