# API Reference

Express 5 server (`artifacts/api-server`). All paths prefixed `/api`. An OpenAPI spec exists at `lib/api-spec/openapi.yaml` (Orval codegen: `pnpm --filter @workspace/api-spec run codegen`) but currently covers only `/healthz` and `/coach/chat`; the tables below are derived from the route source files, which are authoritative.

**Auth legend**: _none_ = public; _auth_ = valid `Authorization: Bearer <token>`; _parent_ = auth + `role === 'parent'` (a redeemed admin support-session token also satisfies this, scoped to its target family); _admin_ = auth + `actorRole === 'admin'` (checked separately from `role`, which a support session overrides).

## Health
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/healthz` | none | `{ status: "ok" }` |

## Auth
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | none | Body: name, email, password. Creates parent profile + session. |
| POST | `/api/auth/login` | none | Body: email, password. Returns token + profile. |
| GET | `/api/auth/family-by-code/:code` | none | Public lookup: child names for a family code (child login step 1). |
| POST | `/api/auth/child-login` | none | Body: child ID + PIN. Returns child-scoped session. |
| POST | `/api/auth/forgot-password` | none | Sends reset code email. |
| POST | `/api/auth/reset-password` | none | Body: code + new password. |
| POST | `/api/auth/logout` | auth | Deletes current session row. |
| GET | `/api/auth/me` | auth | Current profile. |
| PATCH | `/api/auth/me` | auth | Update name/email. |
| PATCH | `/api/auth/onboarding` | auth | Mark onboarding complete. |

## Family & Progress
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/family` | auth | Family details + `parents`, `children`; also `siblings` (same list as `children`, self-excluded for child sessions). |
| POST | `/api/family` | parent | Create/update family name. |
| POST | `/api/family/children` | parent | Add/update child; enforces subscription-tier child limits; 403 if `familyId` doesn't match the caller's own family. |
| PATCH | `/api/family/children/:childId` | parent | Update child details/PIN; 404 if the child doesn't belong to the caller's family. |
| DELETE | `/api/family/children/:childId` | parent | Remove child; 404 if the child doesn't belong to the caller's family. |
| GET | `/api/family/agreement` | auth | Agreement resolved via the session's `familyId` — works for both parent and child sessions. |
| PUT | `/api/family/agreement` | parent | Upserts; 403 if the supplied `familyId` doesn't match the caller's own family. |
| GET | `/api/progress` | auth | User's learning/challenge progress. |
| PUT | `/api/progress` | auth | Update progress state. |
| POST | `/api/family/support-code` | parent | Mints a single-use, ~30-minute-TTL code for admin support access; returns the plaintext code once. |

## Audit Log
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/audit-log` | parent | Family-scoped, paginated (`limit`/`offset`), date-filterable (`from`/`to`) security/account event history — includes admin support-session activity. |

## Curriculum (all auth)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/curriculum` | Aggregate: courses, lessons, quizzes, badges. |
| GET | `/api/courses` | Published courses, filterable. |
| GET | `/api/courses/:courseId` | Course + lesson metadata. |
| GET | `/api/lessons/:lessonId` | Lesson content; **premium content redacted for free users**. |
| GET | `/api/lessons/:lessonId/quiz` | Quiz questions for a lesson. |
| GET | `/api/badges` | All badges. |
| GET | `/api/tips` | Weekly coaching tips. |

## Devices
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/devices` | auth | Register or update a device. |
| GET | `/api/devices` | auth | Parent: family devices. Child: own devices. |
| GET | `/api/devices/events` | parent | Filterable family device events. |
| GET | `/api/devices/:deviceId` | auth | Device details. |
| PATCH | `/api/devices/:deviceId` | auth | Update name/capabilities. |
| DELETE | `/api/devices/:deviceId` | parent | Unregister. Fixed 2026-07-10 (was auth-only — any authenticated family member, including a child, could de-register another family member's device). |
| POST | `/api/devices/:deviceId/heartbeat` | auth | Update last-synced status. |
| POST | `/api/devices/:deviceId/events` | auth | Report events (screen time, activity); payload checked by `validateEventPayload`. |
| GET/PATCH | `/api/devices/:deviceId/restrictions` | parent | Screen time limit, bedtime window, block Safari/new-app-installs/explicit-content, require-parent-approval. Storage only — not enforced on-device yet, see `docs/POLICY_ENGINE.md`. Cross-family access returns 404. |

## AI Coach
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/coach/chat` | auth | Chat with AI coach. Free tier: 10 messages/period, tracked in `coach_usage`. |

## Billing (Stripe)
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/billing/checkout-session` | parent | Returns Stripe Checkout URL. |
| POST | `/api/billing/portal-session` | parent | Returns Stripe customer portal URL. |
| POST | `/api/billing/webhook` | none | Stripe events; signature verified. |

## Analytics & Dashboard (all parent)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/analytics/screen-time` | Screen time by date/device. |
| GET | `/api/analytics/activity` | Summarized general app-activity events (`activity` event type). |
| GET | `/api/analytics/education` | Summarized education activity — lesson/quiz/challenge/assessment completions (`education_activity` event type, `lesson_participation` capability). Kept separate from `/activity` so learning activity isn't mixed with general app usage. |
| GET | `/api/analytics/summary` | Combined screen time + activity + education. |
| GET | `/api/dashboard/overview` | All children snapshot + recent activity (`screenTimeSeconds`, `activityCount`, `educationCount`). |
| GET | `/api/dashboard/children/:childId` | Per-child screen-time/activity/education breakdown. |

## Notifications
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/notifications/weekly-digest/send` | parent | Weekly summary email; rate-limited 5/hour. |

## Admin (support access only)
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/admin/support-sessions` | admin | Body: `{ code }`. Redeems a parent-minted support code for a new, 60-minute Bearer token scoped to that family; the resulting token satisfies `parent`-gated routes for that family only. |
| POST | `/api/admin/support-sessions/:id/end` | admin | Ends the caller's own support session early; the associated token stops working immediately. |

## Cross-cutting behavior

- **Rate limiting**: global 600 requests / 15 min / IP.
- **CORS**: all origins allowed.
- **Errors**: 4xx with `{ error }` message for validation/auth failures; unexpected errors → centralized handler → 500 `Internal server error`.
- **Logging**: pino-http; Authorization header and cookies redacted; pretty-printed in non-production.
