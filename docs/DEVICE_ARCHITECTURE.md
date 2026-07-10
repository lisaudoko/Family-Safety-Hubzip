# Device Architecture

How device tracking works today. All routes in `artifacts/api-server/src/routes/devices.ts`; mobile logic in `artifacts/mobile/lib/deviceSync.ts`.

## Device Registration

- `POST /api/devices` registers (or updates) the current device: platform, capabilities (jsonb array), permission_status (jsonb object).
- Devices belong to an owner (`owner_id` → profiles) and a family (`family_id` → families). `status` defaults to `'active'`.
- `PATCH /api/devices/:deviceId` updates name/capabilities; `DELETE` unregisters.

## Synchronization

- `POST /api/devices/:deviceId/heartbeat` updates last-synced status. The mobile app sends heartbeats via `lib/deviceSync.ts` (triggered on app lifecycle, e.g. foregrounding).
- Registration is idempotent — re-posting the same device updates it.

## Capabilities & Permissions

- `capabilities`: jsonb array describing what the device can report.
- `permission_status`: jsonb object recording OS-level permission grants.
- Note: as an Expo app, actual OS-level monitoring is limited to what the app itself can observe (e.g., its own foreground time) — this is app-reported telemetry, not MDM-level device control.

## Event Tracking

- `POST /api/devices/:deviceId/events` records events into `device_events`: `event_type`, jsonb `payload`, `occurred_at`. Payloads validated by `validateEventPayload`.
- `lib/deviceSync.ts` reports foreground screen time and device status in the background.
- `GET /api/devices/events` (parent) lists family events with filters.
- Event types: `heartbeat` (device_sync), `screen_time` (screen_time_reporting), `activity` (activity_summary — general app usage), `education_activity` (lesson_participation — lesson/quiz/challenge/assessment completions, submitted via `submitActivityEvent` in `lib/deviceSync.ts` from `FamilyContext.tsx`'s completion handlers). Kept as a separate event type from `activity` so the dashboard can distinguish learning activity from general app usage — see `AI_CHANGELOG.md` 2026-07-10.

## Analytics

Parent-only aggregation endpoints (`routes/analytics.ts`):
- `/api/analytics/screen-time` — screen time summarized by date/device.
- `/api/analytics/activity` — summarized general app-activity events.
- `/api/analytics/education` — summarized education-activity events (lesson/quiz/challenge/assessment completions).
- `/api/analytics/summary` — combined view (screen time + activity + education).

## Parent Dashboard

`routes/dashboard.ts` (parent-only):
- `/api/dashboard/overview` — snapshot of all children's status + recent activity.
- `/api/dashboard/children/:childId` — detailed per-child breakdown.

Mobile surfaces this in the Family tab and `child/[id]` screen.
