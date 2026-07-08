---
name: database-changes
description: Add or modify Drizzle/PostgreSQL schema in lib/db for Digital Village — table conventions, push workflow, startup migrations, and the required typecheck order.
---

# Database Changes

## When To Use

Any change to `lib/db/src/schema/index.ts` (tables, columns, indexes, drizzle-zod schemas).

## Process

1. Read `AI_CONTEXT/DATABASE_SUMMARY.md` (19 existing tables) and `docs/DATABASE.md`. **Never create a parallel table for data an existing table already models.**
2. Edit `lib/db/src/schema/index.ts` (single schema file). Follow conventions:
   - `snake_case` columns; `camelCase` TS exports (e.g., `profilesTable`).
   - **Text primary keys** — UUIDs generated in application code (offline clients mint IDs). No serial IDs.
   - `created_at` / `updated_at` with `defaultNow()`.
   - Complex data in `jsonb` with `.$type<T>()`.
   - Export drizzle-zod schemas alongside the table.
3. Push (dev): `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push`
   (avoid `pnpm --filter @workspace/db run push` — its install check can fail).
4. If the api-server must self-migrate on boot, add idempotent `IF NOT EXISTS` SQL to `artifacts/api-server/src/lib/startup-migrate.ts`.
5. **Rebuild lib declarations before anything else**: `pnpm run typecheck:libs`, then `pnpm run typecheck`. Skipping this yields false "no exported member" errors in api-server.
6. Update docs via `update-project-context` (`DATABASE_SUMMARY.md`, `docs/DATABASE.md`, changelog).

## Rules

- Additive changes only in dev-push workflow; destructive changes (drops, renames) need explicit user approval and a data-migration plan.
- Foreign keys: follow existing cascade behavior (e.g., sessions cascade-delete with profiles).
- Remember production has a separate database — schema drift between dev and prod must be reconciled at deploy time.
