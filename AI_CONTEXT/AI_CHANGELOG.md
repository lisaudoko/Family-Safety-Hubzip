# AI Changelog

_Append newest entries at the top. Format: date, what, why, files, future considerations._

## 2026-07-08 — Created AI-friendly documentation system

- **What**: Created `CLAUDE.md`, `AGENTS.md`, the full `AI_CONTEXT/` directory (14 files, incl. `PROJECT_MAP.md`), `docs/` (12 files), and the Claude Code skill `.claude/skills/update-project-context/SKILL.md` by inspecting the actual codebase (API routes, Drizzle schema, mobile app).
- **Why**: Reduce token usage for future AI agents; prior documentation (`replit.md`) was outdated (described 6 tables, no Stripe, no coach/devices).
- **Files affected**: documentation only — no production code modified.
- **Verification pass**: an independent review against the code corrected initial drafts — OpenAPI spec covers only `/healthz` + `/coach/chat` (not full contract-first); `requireAuth` does not enforce session `expires_at`; ESLint config + api-server Vitest tests DO exist; email verification flow is NOT implemented (table only); `PUT /family/agreement` and child CRUD lack ownership checks (documented in `docs/SECURITY.md` Known Gaps); content counts marked as seed-snapshot.
- **Future considerations**:
  - Keep `AI_CONTEXT/` in sync after every meaningful change (see `AGENTS.md`).
  - `replit.md` should eventually be reconciled with this system.
  - Curriculum dual-source (DB + `data/seed.ts`) flagged as a pending decision.
