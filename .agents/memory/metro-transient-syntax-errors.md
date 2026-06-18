---
name: Metro transient syntax errors during multi-edit
description: Why Metro logs SyntaxErrors mid-edit and how to confirm the real state
---

Metro's file watcher re-parses files on every save. When you apply many sequential
`edit`/`write` calls to JSX/TSX files, Metro can catch half-applied intermediate
states and log `SyntaxError: Unexpected token, expected "}"` (often pointing at the
trailing `StyleSheet.create` object — a misleading downstream symptom, not the real
cause).

**Why:** These errors are stale snapshots of an in-between file state, not the final
file. A captured log file (e.g. via refresh_all_logs) freezes those transient errors.

**How to apply:** Trust `pnpm --filter @workspace/mobile run typecheck` (tsc) — if it
passes, the syntax is valid. Then restart the expo workflow and look for a fresh
`Web Bundled <n>ms ... (N modules)` line with no SyntaxError. Do not chase the
mid-edit Metro errors; re-read the actual file to confirm balanced tags.
