---
name: architecture-review
description: Review a planned or completed change against Digital Village's actual architecture (offline-first Expo mobile + Express 5 API + Drizzle/PostgreSQL). Use before major implementations and after large changes.
---

# Architecture Review

## When To Use

- Before implementing a feature that spans more than one subsystem (mobile + API, API + DB).
- Before adding a new package, service, table, or third-party dependency.
- After completing a large change, to confirm it fits the existing architecture.

## Process

1. Read `AI_CONTEXT/ARCHITECTURE_SUMMARY.md` and `AI_CONTEXT/DECISIONS.md`; for depth read `docs/ARCHITECTURE.md`.
2. Locate affected code via `AI_CONTEXT/PROJECT_MAP.md`.
3. Check the change against the load-bearing constraints:
   - **Offline-first mobile**: writes go to AsyncStorage first, then sync to the server best-effort. New mobile features must not require connectivity for core UX.
   - **Auth**: opaque UUID Bearer sessions (`sessions` table), NOT JWT. `requireAuth`/`requireParent` middleware; scope queries by attached `familyId`/`userId`.
   - **Text PKs**: app-generated UUIDs everywhere (clients can mint IDs pre-sync). Never introduce serial IDs.
   - **Monorepo rules**: `lib/*` composite packages, `artifacts/*` leaf packages; artifacts never import each other — shared code goes in a new `lib/*` package.
   - **Routing**: all API routes under `/api`, reached through the shared proxy (`localhost:80` in dev), never direct ports.
   - **Two curriculum sources** (DB tables + `data/seed.ts`) — do not add a third; note drift risk in any content change.
4. Flag duplication: does an existing route, apiClient wrapper, context, or table already cover this?
5. Verdict: list conflicts with existing decisions, risks, and required doc updates (`AI_CONTEXT/DECISIONS.md` if a new decision is made).

## Rules

- New architectural decisions must be recorded in `AI_CONTEXT/DECISIONS.md` (and `docs/DECISIONS.md` with rationale).
- Do not overturn an existing decision silently — call it out and get approval first.
- Prefer extending existing patterns (`AI_CONTEXT/KNOWN_PATTERNS.md`) over inventing new ones.
