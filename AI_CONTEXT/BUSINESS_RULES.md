# Business Rules

## Accounts & Roles

- **Parent account**: registers with name/email/password. `role = 'parent'`, `subscription_tier` 'free' or premium. Owns one family (`families.parent_id`).
- **Child login**: no email. Child picks their name via family code (`GET /auth/family-by-code/:code`) and logs in with a 4–6 digit PIN → scoped "Child Mode" UI in the app. "Return to Parent" swaps tokens back.
- **Offline (`local_`) accounts**: created client-side when the network is unavailable at registration. Progress stored locally; `localAccountSync.ts` migrates to server when connectivity returns (password stashed in SecureStore).

## Permissions

- Parent-only (via `requireParent`): family/children CRUD, device events listing, analytics, dashboard, billing, weekly digest.
- Children: can see own devices, own progress; cannot manage family or billing.
- All authenticated: curriculum, progress, coach chat.
- Agreement: `GET` resolves family via `parent_id = userId` (child sessions get `agreement: null`); `PUT` accepts a client-supplied `familyId` and currently does NOT verify ownership (known gap — see `docs/SECURITY.md`). Child CRUD routes also lack family-ownership checks.

## Family Rules

- One family per parent. Family has a unique `family_code` used for child login.
- Children have age bands (default '10-13').
- One family agreement per family (`family_id` unique): selected standard rules (jsonb) + custom rules.
- Child count limits enforced by subscription tier at `POST /family/children`.

## Premium / Free Tier

- Free tier limits: 10 AI coach messages per period (tracked in `coach_usage`), premium courses/lessons/challenges locked (lesson content redacted server-side for free users), child count limit.
- Upgrade via Stripe checkout (parent only); subscription stored per family in `subscriptions`.

## Key Workflows

1. **Onboarding**: Register → name family → add children (age bands) → agreement → dashboard.
2. **Learning**: Course → lessons (sequential availability via `lessonAvailability.ts`) → quiz → progress + badges.
3. **Assessment**: 10 questions → per-category scores → recommendations (categories in seed.ts must match `CATEGORY_ICONS`/`CATEGORY_RECOMMENDATIONS` in assess screens).
4. **Devices**: app registers device → heartbeats → reports screen-time/activity events → parent views analytics/dashboard.
