# Next Task (Living Tracker)

_Update this file whenever priorities change or tasks complete._

## Current Priority

- None assigned. Awaiting next directive from the product owner.

## Next Approved Tasks

- (none yet)

## Pending Decisions

- Should curriculum content be served exclusively from the DB (`/api/curriculum`) and the static `data/seed.ts` retired, or kept as offline fallback? Currently both exist.
- Update or retire the outdated sections of `replit.md` (still describes 6 tables / no Stripe).
- App Store release timeline and requirements (not started).

## Backlog / Known Follow-ups

- API Server workflow fails in dev: `STRIPE_SECRET_KEY` not set → `src/lib/stripe.ts` throws at import time. Fix by setting the secret (or lazy-initializing the Stripe client).
- Security fixes (verified gaps): enforce `expires_at` in `requireAuth`; add family-ownership checks to `PUT /family/agreement` and child CRUD routes.
- Expand Vitest coverage (exists for devices/analytics/dashboard/notifications/cross-family; auth & family routes uncovered).
- Implement or remove the email verification flow (table + column exist, endpoints don't).
