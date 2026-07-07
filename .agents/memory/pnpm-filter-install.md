---
name: pnpm filter vs installLanguagePackages
description: How to install packages into a specific workspace package vs workspace root
---

The `installLanguagePackages` code_execution callback runs `pnpm add` at the workspace root. This always fails with `ERR_PNPM_ADDING_TO_ROOT` in this project because the root is a workspace container, not a real app.

**Rule:** To install a package into a specific workspace package, always use:
```
pnpm --filter @workspace/<package-name> add <dep> [<dep2> ...]
```
e.g. `pnpm --filter @workspace/api-server add bcryptjs @types/bcryptjs`

**Why:** pnpm workspaces enforce that dependencies belong to their declaring package, not the root, to avoid accidental hoisting and version conflicts.

**How to apply:** Any time a new npm dependency is needed for api-server, db, or mobile, use the `--filter` flag. The `installLanguagePackages` callback is only useful for root devtools (eslint, prettier, typescript).
