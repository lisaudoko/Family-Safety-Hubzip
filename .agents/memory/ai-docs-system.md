---
name: AI docs system
description: Where project knowledge lives and why replit.md must not be trusted for feature inventory
---
The project has an AI-friendly knowledge system (created 2026-07-08): `CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/` (concise summaries + living trackers), `docs/` (long-form).

**Why:** `replit.md` describes an old snapshot (6 tables, "no Stripe") while the codebase has 19 tables, Stripe billing, AI coach, device tracking, child PIN login. First drafts of these docs also contained overstated claims (full contract-first OpenAPI, "no tests/lint", email verification implemented) that had to be corrected against the code — verify feature claims via grep before repeating them.

**How to apply:** Read `AI_CONTEXT/CURRENT_STATE.md` first for orientation; update `AI_CONTEXT/AI_CHANGELOG.md`, `COMPLETED_WORK.md`, and touched summaries after any meaningful change (workflow in `AGENTS.md`). Known verified gaps as of writing: session expiry unenforced in requireAuth; agreement PUT + child CRUD lack ownership checks; API server crashes at boot without STRIPE_SECRET_KEY.
