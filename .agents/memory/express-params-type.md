---
name: Express params string type
description: req.params values are typed as string | string[] in Express 5 strict mode
---

In this project's Express 5 setup with strict TypeScript, `req.params.X` resolves to `string | string[]`. Passing it directly to drizzle-orm's `eq()` causes a type error ("No overload matches this call") because eq expects `string | SQLWrapper`.

**Rule:** Cast route params with `String(req.params.X)` before passing to drizzle queries.

**Why:** Express 5 types are stricter than Express 4, and the drizzle eq() overloads don't accept the union.

**How to apply:** In any route handler with path params (e.g. `/children/:childId`), use `String(req.params.childId)` inside the .where() clause.
