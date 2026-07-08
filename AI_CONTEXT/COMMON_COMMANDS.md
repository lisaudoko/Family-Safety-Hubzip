# Common Commands

## Install
```bash
pnpm install                                    # workspace install
pnpm --filter @workspace/<pkg> add <dep>        # add dep to a package (NEVER root installers)
```

## Development
```bash
pnpm --filter @workspace/api-server run dev     # API server (needs PORT; workflow sets it)
# Prefer restarting the Replit workflows ("API Server", "expo") over shelling out.
curl localhost:80/api/healthz                   # test API via shared proxy (never raw port)
```

## Typecheck / Build
```bash
pnpm run typecheck            # full check (canonical quality gate)
pnpm run typecheck:libs       # rebuild composite lib declarations (run after lib/db changes)
pnpm run build                # typecheck + build all
pnpm --filter @workspace/<slug> run typecheck   # single artifact
```

## API codegen
```bash
pnpm --filter @workspace/api-spec run codegen   # regen hooks + Zod from openapi.yaml
```

## Database
```bash
cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push   # push schema (dev)
# (avoid `pnpm --filter @workspace/db run push` — its install check can fail)
```

## Testing / Lint
```bash
pnpm run lint                                     # root ESLint (eslint.config.mjs)
pnpm run lint:fix
pnpm --filter @workspace/api-server run test      # Vitest suite (artifacts/api-server/test/)
```
`pnpm run typecheck` remains the canonical gate; also verify endpoints manually with curl.

## Required env
- `DATABASE_URL` (auto-provisioned), `PORT` (workflow-provided), `EXPO_PUBLIC_DOMAIN` (mobile API base), Stripe keys for billing.
