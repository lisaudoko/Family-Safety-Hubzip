# Known Patterns

Copy these patterns when extending the system.

## API route pattern

```ts
// artifacts/api-server/src/routes/<domain>.ts
router.post('/thing', requireAuth, async (req, res, next) => {
  try {
    const parsed = someZodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    // drizzle query; cast params: eq(table.id, String(req.params.id))
    res.json(result);
  } catch (err) { next(err); }
});
```
- `requireAuth` attaches `userId`, `role`, `familyId`. Use `requireParent` for parent-only.
- Log with `req.log`, never `console.log`.
- Mount new routers in `src/app.ts` under `/api`.

## OpenAPI additions (partially adopted)

The spec currently covers only `/healthz` and `/coach/chat`; most routes are hand-written. For new endpoints, prefer:
1. Add endpoint to `lib/api-spec/openapi.yaml` (don't change `info.title`).
2. `pnpm --filter @workspace/api-spec run codegen` → hooks + Zod schemas.
3. Implement route; validate with generated Zod schemas.

## Mobile API wrapper pattern

- Add `api<Verb><Noun>()` in `artifacts/mobile/lib/apiClient.ts` using the shared `apiFetch` (attaches Bearer token from AsyncStorage `@dv_auth_token`).

## Offline-first context pattern (FamilyContext model)

1. On mutation: update React state + write AsyncStorage (user-scoped key) immediately.
2. Fire server sync best-effort; ignore network errors.
3. On load: read local cache first, then hydrate from server.
4. Skip server sync for users with id starting `local_`.

## DB schema pattern

- Add table to `lib/db/src/schema/index.ts`: text PK, `created_at`/`updated_at` `defaultNow()`, jsonb with `.$type<T>()`, drizzle-zod insert/select schemas omitting timestamps.
- Push: `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push`. Then `pnpm run typecheck:libs`.
- For prod safety, mirror the change as idempotent SQL in `startup-migrate.ts` if the pattern is followed.

## Screen pattern (mobile)

- expo-router file in `app/`; use `useColors()` for theming, shared components from `components/UI.tsx`, Feather icons, Inter fonts.

## Gotchas (always apply)

- Express 5: `String(req.params.x)` before drizzle `eq()`.
- `pnpm --filter @workspace/<pkg> add <dep>` for installs (never workspace-root installers).
- Assessment categories in seed.ts must match maps in assess screen.
- curl via `localhost:80/api/...`, never the raw port.
