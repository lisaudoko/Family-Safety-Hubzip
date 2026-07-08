# AGENTS.md — Shared Instructions for All AI Coding Agents

These rules apply to Claude Code, Replit Agent, and any other AI assistant working on Digital Village.

## Start Here

1. Read `AI_CONTEXT/CURRENT_STATE.md` and `AI_CONTEXT/ARCHITECTURE_SUMMARY.md` before touching code; use `AI_CONTEXT/PROJECT_MAP.md` to locate files instead of scanning the tree.
2. For the area you're changing, read the matching summary: `DATABASE_SUMMARY.md`, `API_SUMMARY.md`, `BUSINESS_RULES.md`, or `KNOWN_PATTERNS.md`.
3. Check `AI_CONTEXT/NEXT_TASK.md` for current priorities and pending decisions.
4. Only read source files when summaries don't answer the question. Prefer targeted greps over full-file reads.

## Project Rules

- Do not invent features, tables, or endpoints. Document and build only what is agreed.
- The mobile app is offline-first: writes go to AsyncStorage immediately, then sync to the server best-effort. Preserve this pattern.
- The OpenAPI spec (`lib/api-spec/openapi.yaml`) is only partially adopted — it currently covers `/healthz` and `/coach/chat`. Most routes are hand-written. When touching the spec, run `pnpm --filter @workspace/api-spec run codegen`.
- Never modify working production code unless required for the task.
- Never commit secrets. Stripe keys, `DATABASE_URL`, etc. live in Replit environment secrets.

## How to Analyze Changes

1. Identify affected layers: mobile screen/context → apiClient wrapper → OpenAPI spec → Express route → Drizzle schema.
2. Search for existing implementations before writing new ones (`grep` the route files, `lib/apiClient.ts`, and schema).
3. Check `KNOWN_PATTERNS.md` for the established pattern and copy it.
4. For DB changes, verify against the 19 existing tables in `DATABASE_SUMMARY.md` first.

## How to Avoid Duplicate Work

- Check `COMPLETED_WORK.md` and `AI_CHANGELOG.md` to see if a feature was already built.
- Check `NEXT_TASK.md` to see if the work is already claimed/in progress.
- Search the codebase for similar function/route names before creating new ones.

## How to Document Changes

After completing any meaningful task:

1. Append an entry to `AI_CONTEXT/AI_CHANGELOG.md`: what changed, why, files affected, future considerations.
2. Add the feature to `AI_CONTEXT/COMPLETED_WORK.md` with the date.
3. Update `AI_CONTEXT/CURRENT_STATE.md` / `CURRENT_PHASE.md` if the project status changed.
4. Update `AI_CONTEXT/NEXT_TASK.md` — remove completed items, add discovered follow-ups.
5. If you changed the schema or API, update `DATABASE_SUMMARY.md` / `API_SUMMARY.md` and the matching `docs/` file.
6. Record any new architectural decision in `AI_CONTEXT/DECISIONS.md` (decision, reason, impact).

Keep AI_CONTEXT files concise — they are for AI consumption. Put long-form detail in `docs/`.

## Quality Gates

- `pnpm run typecheck` must pass before declaring work done. Also run `pnpm run lint` and the api-server Vitest suite (`pnpm --filter @workspace/api-server run test`) when touching server code.
- After schema changes: `pnpm run typecheck:libs` first, then full typecheck.
- Verify server routes manually via `curl localhost:80/api/...` when possible.
