---
name: api-design
description: Design new Digital Village API endpoints — URL/verb conventions, auth level selection, payload shapes, OpenAPI spec-first workflow, and mobile client integration.
---

# API Design

## When To Use

Before implementing any new endpoint or changing an existing endpoint's contract. Pairs with the `backend-development` skill (design first, then implement).

## Process

1. Check `docs/API.md` + `AI_CONTEXT/API_SUMMARY.md`: does an existing endpoint already cover this? Extend before adding.
2. **Design the contract**:
   - Path: `/api/<domain>[/<resource>][/:id]`, matching an existing route-file domain where possible.
   - Verbs: GET (read), POST (create/action), PATCH (partial update), PUT (idempotent upsert), DELETE.
   - Auth level: public (rare — health, family-code lookup only) / `auth` / `parent`. Default to the most restrictive that works.
   - Ownership: derive `familyId`/`userId` from the session, never from the request body/params without verification.
   - Responses: JSON; errors as 4xx `{ error: string }`; unexpected → 500 via error middleware.
   - IDs: client-generated text UUIDs are acceptable (offline-first clients mint IDs).
3. **Spec-first (preferred)**: add the endpoint to `lib/api-spec/openapi.yaml` (do NOT change `info.title` — it controls generated filenames), then `pnpm --filter @workspace/api-spec run codegen` → Zod schemas (`@workspace/api-zod`) + React Query hooks (`@workspace/api-client-react`). Note: today the spec covers only `/healthz` and `/coach/chat`; most routes are hand-written, so spec entry is encouraged but not the status quo.
4. **Mobile integration**: add an `api<Verb><Noun>()` wrapper in `artifacts/mobile/lib/apiClient.ts`; plan the offline fallback (what happens when the call fails?).
5. Document the final contract in `docs/API.md` and `AI_CONTEXT/API_SUMMARY.md`.

## Rules

- Never introduce a second convention (no `/v2`, no camelCase columns leaking into payload key style disagreements — match existing payloads).
- Breaking changes to payloads require checking every mobile call site in `lib/apiClient.ts` first.
- Rate/usage limits that gate paid features are enforced server-side (pattern: `coach_usage` per family per period).
