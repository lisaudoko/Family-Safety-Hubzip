# Development Workflow

## Planning
1. Read `CURRENT_STATE.md`, `NEXT_TASK.md`, and the relevant summaries before proposing work.
2. For non-trivial features, write a short plan: affected layers (schema → API spec → route → apiClient → context → screen), new tables/endpoints, risks.
3. Surface open questions instead of assuming product behavior.

## Approval
- Get owner sign-off on plans for: schema changes, new subsystems, destructive operations, dependency swaps.
- Small bug fixes and doc updates don't need approval.

## Implementation
1. One subsystem at a time, bottom-up: DB schema → `typecheck:libs` → OpenAPI spec → codegen → route → apiClient wrapper → context/screen.
2. Follow `KNOWN_PATTERNS.md` exactly.
3. Run `pnpm run typecheck` after each subsystem.
4. Manually verify routes via `curl localhost:80/api/...` and the app preview.

## Review
1. Self-review the diff for pattern violations (console.log in server code, raw port access, missing param casts).
2. Full `pnpm run typecheck` must pass.
3. Update AI_CONTEXT files (see `AGENTS.md` "How to Document Changes") — changelog, completed work, summaries touched by the change.
