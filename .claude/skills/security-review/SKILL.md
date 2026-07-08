---
name: security-review
description: Review Digital Village code changes for security issues — session-token auth, family-scoped access control, input validation, secrets. Grounded in the real auth model (opaque UUID sessions, not JWT).
---

# Security Review

## When To Use

- Any change touching auth, sessions, family/children data access, billing, or device data.
- Before release-readiness sign-off.
- When the user asks for a security check.

## Threat Model Basics

- Actors: parents, children (PIN login, low-entropy by design), unauthenticated internet (open CORS).
- Sensitive data: children's profiles/ages/PINs, device activity telemetry, parent emails/password hashes, Stripe customer data.
- Auth: opaque UUID Bearer tokens in `sessions` table (NOT JWT); bcrypt password hashes; `requireAuth`/`requireParent` middleware.

## Checklist

1. **Ownership/scoping**: every query must filter by the middleware-attached `familyId`/`userId`. Reject client-supplied `familyId`/`childId` unless verified against the caller's family.
2. **Role checks**: parent-only operations behind `requireParent`; children limited to own devices/progress.
3. **Input validation**: Zod `safeParse` on all bodies; drizzle parameterization (no raw SQL string interpolation).
4. **Secrets**: never in code or docs — Replit env secrets only (`DATABASE_URL`, Stripe keys). Pino must keep redacting Authorization headers.
5. **New endpoints**: rate limiting applies globally; consider extra protection for credential endpoints (login, PIN, reset codes).
6. **Password reset codes**: hashed (`code_hash`), with `expires_at`/`used_at` — keep this pattern for any new one-time codes.

## Known Existing Gaps (docs/SECURITY.md — do NOT replicate, fix when touching these areas)

- `requireAuth` does not enforce `sessions.expires_at`.
- `PUT /api/family/agreement` trusts client `familyId` (IDOR).
- Child CRUD routes lack family-ownership verification.
- Email verification flow not implemented (table only). Open CORS. No audit logging or admin role.

## Output

Report findings by severity (critical/high/med/low) with file:line references. Update `docs/SECURITY.md` Known Gaps for anything newly found or fixed.
