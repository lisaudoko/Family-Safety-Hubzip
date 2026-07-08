# Completed Work

_Add entries when features complete: feature, date, files, notes. Historical entries below are reconstructed from the codebase (dates unknown)._

## 2026-07-08 — AI Documentation System
- Files: `CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/*`, `docs/*`
- Notes: Documentation generated from direct codebase inspection; supersedes `replit.md` for feature inventory.

## Pre-documentation (dates unknown, reconstructed)

- **Auth system** — `routes/auth.ts`, `context/AuthContext.tsx`, `lib/auth-middleware.ts`. bcrypt + UUID sessions (90d TTL at issuance; expiry not enforced in middleware), child PIN login via family code, password reset, offline local accounts + sync (`lib/localAccountSync.ts`). Email verification NOT implemented (table only).
- **Education system** — `routes/curriculum.ts`, DB content tables, `data/seed.ts`, learn/course/lesson/quiz screens. 9 courses / 64 lessons / 13 quizzes / 22 badges / weekly tips; premium redaction server-side.
- **Family system** — `routes/family.ts`, `context/FamilyContext.tsx`, family/agreement screens. Family, children (age bands), tech agreement, tier-limited child count.
- **Device tracking & analytics** — `routes/devices.ts`, `routes/analytics.ts`, `routes/dashboard.ts`, `lib/deviceSync.ts`. Registration, heartbeats, events, parent dashboard.
- **AI Coach** — `routes/coach.ts`, `context/CoachContext.tsx`, coach tab + history. 10-message free limit via `coach_usage`.
- **Billing** — `routes/billing.ts`, `subscriptions` table, subscription screen. Stripe checkout/portal/webhook.
- **Notifications** — `routes/notifications.ts`. Weekly digest email, 5/hr rate limit.
- **Accessibility** — `context/AccessibilityContext.tsx`, `hooks/useColors.ts`. Light/dark/system, high contrast, reduce motion.
