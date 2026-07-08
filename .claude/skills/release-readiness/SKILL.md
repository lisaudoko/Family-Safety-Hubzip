---
name: release-readiness
description: Verify Digital Village is ready to publish/release — quality gates, security gaps, env/secrets, workflows, docs sync. Use before deploying or preparing an App Store build.
---

# Release Readiness

## When To Use

Before publishing/deploying the API server, cutting a mobile build, or when the user asks "are we ready to ship?".

## Checklist

### 1. Quality gates
- `pnpm run typecheck` passes (canonical gate; run `typecheck:libs` first after schema changes).
- `pnpm run lint` clean.
- `pnpm --filter @workspace/api-server run test` passes (Vitest: devices, analytics, dashboard, notifications, cross-family).

### 2. Environment & services
- Required secrets set for the target environment: `DATABASE_URL`, `STRIPE_SECRET_KEY` (+ webhook secret), email/SMTP creds if digests are enabled, `EXPO_PUBLIC_DOMAIN` for mobile.
- **API server hard-fails at startup without `STRIPE_SECRET_KEY`** — verify boot succeeds, not just typecheck.
- Workflows healthy: API Server and expo running; smoke-test `curl localhost:80/api/healthz`.
- Production DB schema matches dev (drizzle push / startup migrations applied).

### 3. Security review (see `security-review` skill and `docs/SECURITY.md` Known Gaps)
- Decide explicitly whether known gaps block this release: unenforced session expiry, agreement PUT IDOR, child CRUD ownership, open CORS, unimplemented email verification.
- No secrets in code or docs; Pino redaction intact.

### 4. Product smoke test
- Register → onboarding → home dashboard.
- Child PIN login via family code.
- A course/lesson/quiz round-trip and progress sync.
- Offline behavior: airplane-mode write lands in AsyncStorage and syncs later.
- Billing checkout/portal flows (test mode) if billing is in scope.

### 5. Documentation sync
- `AI_CONTEXT/CURRENT_STATE.md`, `STATUS.md` (docs/), `NEXT_TASK.md`, `AI_CHANGELOG.md` reflect reality (run `update-project-context`).

## Output

A go/no-go report: blockers (must fix), risks accepted (explicitly listed), and post-release follow-ups added to `AI_CONTEXT/NEXT_TASK.md`.
