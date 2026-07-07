---
name: DB lib rebuild required
description: When to run typecheck:libs before checking leaf artifacts that import @workspace/db
---

After adding new exports (tables, types) to `lib/db/src/schema/index.ts`, the compiled `.d.ts` declarations are stale until you rebuild. Running `tsc --noEmit` on `artifacts/api-server` before the lib rebuild will produce "Module '@workspace/db' has no exported member X" errors even though the source is correct.

**Rule:** Always run `pnpm run typecheck:libs` (which runs `tsc --build` on composite libs) before running the api-server or other leaf-artifact typechecks when the schema has changed.

**Why:** lib packages are composite (`emitDeclarationOnly: true`). The published `.d.ts` files are what leaf artifacts see at typecheck time — not the source. Stale declarations = false type errors.

**How to apply:** Any time you add a new table or change exports in `lib/db/src/schema/`, run `pnpm run typecheck:libs` first, then `cd artifacts/api-server && tsc -p tsconfig.json --noEmit`.
