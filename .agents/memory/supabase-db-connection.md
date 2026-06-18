---
name: Supabase DB connection from this environment
description: How to reach the Supabase Postgres DB to run DDL/migrations — direct host is unreachable, must use the pooler.
---

# Reaching the Supabase Postgres database

The Supabase project's **direct** connection host (`db.<ref>.supabase.co`) is
**IPv6-only** (only an AAAA record) and this Replit environment has **no IPv6
egress**, so direct connections fail with `ENOTFOUND` / unreachable. The anon
REST key cannot run DDL.

**To create tables / run migrations:** connect through the **Supavisor pooler**,
which is IPv4-reachable. Connection shape:

- host: `aws-1-<region>.pooler.supabase.com` (note `aws-1`, not `aws-0`)
- port: `5432` (session mode — needed for multi-statement DDL; `6543` is txn mode)
- user: `postgres.<project-ref>` (the ref must be in the username for the pooler)
- password + ref: extract from the `SUPABASE_DB_URL` secret (the user-provided
  direct URL works for credentials even though its host is unreachable)
- ssl: `{ rejectUnauthorized: false }`

**Finding the region:** the pooler rejects wrong regions with "Tenant or user not
found". Auto-detect by looping candidate regions and connecting until one
succeeds. As of the schema work, this project resolved to
`aws-1-us-east-2.pooler.supabase.com`.

**Why:** Supabase deprecated IPv4 on direct connections; only the pooler offers
IPv4. The CF response header region (e.g. `-ORD`) is the Cloudflare edge, NOT the
DB region, so it can't be used to pick the pooler.

**How to apply:** any future DDL/migration against Supabase from here must use the
pooler host above; don't waste time on `db.<ref>.supabase.co`. App runtime is
unaffected — the mobile app talks to Supabase via the REST/anon endpoint, not the
DB port.
