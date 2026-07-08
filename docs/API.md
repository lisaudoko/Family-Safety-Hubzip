# API Reference

Express 5 server (`artifacts/api-server`). All paths prefixed `/api`. An OpenAPI spec exists at `lib/api-spec/openapi.yaml` (Orval codegen: `pnpm --filter @workspace/api-spec run codegen`) but currently covers only `/healthz` and `/coach/chat`; the tables below are derived from the route source files, which are authoritative.

**Auth legend**: _none_ = public; _auth_ = valid `Authorization: Bearer <token>`; _parent_ = auth + `role === 'parent'`.

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
| GET | `/api/family` | auth | Family details + children list. |
| POST | `/api/family` | parent | Create/update family name. |
| POST | `/api/family/children` | parent | Add/update child; enforces subscription-tier child limits. |
| PATCH | `/api/family/children/:childId` | parent | Update child details/PIN. |
| DELETE | `/api/family/children/:childId` | parent | Remove child. |
| GET | `/api/family/agreement` | auth | Agreement for the family where `parent_id = userId`; child sessions get `agreement: null`. |
| PUT | `/api/family/agreement` | auth | Upserts by client-supplied `familyId`; **no ownership check today** (see docs/SECURITY.md). |
| GET | `/api/progress` | auth | User's learning/challenge progress. |
| PUT | `/api/progress` | auth | Update progress state. |

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
| DELETE | `/api/devices/:deviceId` | auth | Unregister. |
| POST | `/api/devices/:deviceId/heartbeat` | auth | Update last-synced status. |
| POST | `/api/devices/:deviceId/events` | auth | Report events (screen time, activity); payload checked by `validateEventPayload`. |

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
| GET | `/api/analytics/activity` | Summarized activity events. |
| GET | `/api/analytics/summary` | Combined screen time + activity. |
| GET | `/api/dashboard/overview` | All children snapshot + recent activity. |
| GET | `/api/dashboard/children/:childId` | Per-child activity/screen-time breakdown. |

## Notifications
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/notifications/weekly-digest/send` | parent | Weekly summary email; rate-limited 5/hour. |

## Cross-cutting behavior

- **Rate limiting**: global 600 requests / 15 min / IP.
- **CORS**: all origins allowed.
- **Errors**: 4xx with `{ error }` message for validation/auth failures; unexpected errors → centralized handler → 500 `Internal server error`.
- **Logging**: pino-http; Authorization header and cookies redacted; pretty-printed in non-production.
