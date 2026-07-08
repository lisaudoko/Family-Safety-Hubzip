---
name: update-project-context
description: Maintain the Digital Village AI knowledge system (AI_CONTEXT/ + docs/) after completing development work. Use after finishing a feature, backend subsystem, database change, new API, or major architectural change.
---

# Update Project Context

Purpose: keep the AI knowledge system (`AI_CONTEXT/` and `docs/`) in sync with the actual codebase after development work.

## When To Use

Use this workflow after completing:

- A feature
- A backend subsystem
- A database change
- A new API
- A major architectural change

Skip it only for trivial changes with no architectural, API, schema, or status impact.

## Process

1. **Review changed files** (`git diff` / list of files touched this task).
2. **Identify affected systems** — auth, family, education, devices, billing, coach, notifications, mobile UI, database.
3. **Update AI_CONTEXT documentation** (only the files affected by the change):
   - `AI_CONTEXT/CURRENT_STATE.md` — current status, completed functionality, active development, risks
   - `AI_CONTEXT/COMPLETED_WORK.md` — feature, date, files modified, APIs added/changed, DB changes, architectural impact
   - `AI_CONTEXT/PROJECT_MAP.md` — if files/folders moved or new key files were added
   - `AI_CONTEXT/API_SUMMARY.md` / `DATABASE_SUMMARY.md` / `BUSINESS_RULES.md` / `KNOWN_PATTERNS.md` / `DECISIONS.md` — as applicable
4. **Update relevant `docs/` files** when architecture changed: `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `DEVICE_ARCHITECTURE.md`, `ACCOUNT_MODEL.md`, `EDUCATION_SYSTEM.md`, `POLICY_ENGINE.md`, `STATUS.md`, `ROADMAP.md`.
5. **Record changes in `AI_CONTEXT/AI_CHANGELOG.md`** — what changed, why, technical impact, files affected. Append a dated entry; never rewrite history.
6. **Update `AI_CONTEXT/NEXT_TASK.md`** — remaining work, recommended next step, pending decisions.
7. **Confirm documentation matches implementation** — verify claims against the code (grep/read), not memory. Verify every documented file/dir path exists verbatim (`ls`/glob) before finalizing.

## Rules

Never:

- Invent information.
- Document incomplete features as complete.
- Overwrite historical decisions or changelog entries.
- Remove important architectural context.

Always:

- Preserve architectural consistency.
- Keep AI_CONTEXT concise (summaries and pointers).
- Keep human documentation (`docs/`) detailed.
- Clearly separate completed features from planned features.
