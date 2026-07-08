# Project Status Dashboard

_Last updated: 2026-07-08_

## Completed ✅

| Area | Status |
| --- | --- |
| Auth (parent, child PIN, reset, verification, offline accounts) | Done |
| Education (9 courses, 64 lessons, 13 quizzes, 22 badges, tips) | Done |
| Assessment (10 questions, category scoring) | Done |
| Challenges (8, step tracking) | Done |
| Family + agreement builder | Done |
| Device tracking + analytics + parent dashboard | Done |
| AI coach (10-msg free limit) | Done |
| Stripe billing + premium gating | Done |
| Weekly digest email | Done |
| Accessibility (themes, contrast, motion) | Done |
| AI documentation system | Done (2026-07-08) |

## Current Work 🔄

- Nothing actively in flight; see `AI_CONTEXT/NEXT_TASK.md`.

## Remaining Work 📋

- Reconcile dual curriculum sources (DB vs `data/seed.ts`).
- Update/retire outdated `replit.md` feature inventory.
- Expand test coverage (Vitest suite exists in `artifacts/api-server/test/` for devices/analytics/dashboard/notifications/cross-family; auth & family routes uncovered).
- Fix known access-control gaps: session expiry not enforced in `requireAuth`; `PUT /family/agreement` and child CRUD lack family-ownership checks.
- Implement or remove the email verification flow (table exists, endpoints do not).
- App Store release prep.
- Dev environment: API Server fails to boot when `STRIPE_SECRET_KEY` is unset (`src/lib/stripe.ts` throws at import time — whole server crashes, not just billing).

## Risks ⚠️

- **Content drift** between DB curriculum and static seed.
- **Partial test coverage** — Vitest covers device/analytics/dashboard/notification routes; auth, family, curriculum, billing are untested.
- **Access-control gaps** — agreement upsert IDOR, unverified child-CRUD ownership, unenforced session expiry (see `docs/SECURITY.md`).
- **Stripe dependency** — the entire API server crashes at startup without `STRIPE_SECRET_KEY` (hard import-time check).
- **Open CORS** and low-entropy child PINs (rate-limit-only protection) — acceptable for now, revisit before scale.
