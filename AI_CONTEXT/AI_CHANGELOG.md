# AI Changelog

_Append newest entries at the top. Format: date, what, why, files, future considerations._

## 2026-07-08 — Adopted product-owner development roadmap (Phase 2)

- **What**: Replaced `AI_CONTEXT/NEXT_TASK.md` with the owner-provided 10-priority roadmap, annotated against actual codebase state (done items checked off; JWT/admin/CSRF items reconciled with the real session-token auth model). Updated `CURRENT_PHASE.md` to Phase 2 (Device Sync Wiring + Parent Safety Platform Backend).
- **Why**: Product owner set explicit priorities on 2026-07-08.
- **Files affected**: `AI_CONTEXT/NEXT_TASK.md`, `AI_CONTEXT/CURRENT_PHASE.md` — documentation only.

## 2026-07-08 — Added 7 Claude Code workflow skills

- **What**: Created `.claude/skills/` workflows: `architecture-review`, `api-design`, `backend-development`, `database-changes`, `mobile-development`, `security-review`, `release-readiness` (joining `update-project-context`). Registered them in `CLAUDE.md` (skills table) and `AGENTS.md` (Start Here).
- **Why**: Encode project-specific processes (offline-first constraints, family-scoped auth, schema/typecheck ordering, release gates) so any agent follows the same verified workflow.
- **Files affected**: documentation/skills only — no production code modified.

## 2026-07-08 — Created AI-friendly documentation system

- **What**: Created `CLAUDE.md`, `AGENTS.md`, the full `AI_CONTEXT/` directory (14 files, incl. `PROJECT_MAP.md`), `docs/` (12 files), and the Claude Code skill `.claude/skills/update-project-context/SKILL.md` by inspecting the actual codebase (API routes, Drizzle schema, mobile app).
- **Why**: Reduce token usage for future AI agents; prior documentation (`replit.md`) was outdated (described 6 tables, no Stripe, no coach/devices).
- **Files affected**: documentation only — no production code modified.
- **Verification pass**: an independent review against the code corrected initial drafts — OpenAPI spec covers only `/healthz` + `/coach/chat` (not full contract-first); `requireAuth` does not enforce session `expires_at`; ESLint config + api-server Vitest tests DO exist; email verification flow is NOT implemented (table only); `PUT /family/agreement` and child CRUD lack ownership checks (documented in `docs/SECURITY.md` Known Gaps); content counts marked as seed-snapshot.
- **Future considerations**:
  - Keep `AI_CONTEXT/` in sync after every meaningful change (see `AGENTS.md`).
  - `replit.md` should eventually be reconciled with this system.
  - Curriculum dual-source (DB + `data/seed.ts`) flagged as a pending decision.
