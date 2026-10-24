# Policy Engine

**There is no automated policy-*enforcement* engine in Digital Village today — nothing on-device reads or applies any of these values.** As of 2026-08-08 there is a policy *resolution* engine (see below): it merges the three storage-only layers into one answer, which is a prerequisite for enforcement but not enforcement itself. This document describes the policy-adjacent features that actually exist, to prevent future agents from assuming enforcement capabilities.

## Effective Policy Resolution (2026-08-08 — fourth policy-engine building block)

- `GET /api/family/children/:childId/effective-policy` (`artifacts/api-server/src/services/effectivePolicy.ts`, parent-only, family-ownership checked) resolves what a child's policy actually is by merging `family_policies` → `child_policies` → (optionally, via `?deviceId=`) `device_restrictions`, per the precedence documented below. **This is resolution only** — it computes an answer for display; it does not write anywhere or change what happens on a device.
- Without `?deviceId=`, only the family and child layers are merged. A child can have multiple devices with independent restrictions, and there's no single well-defined way to merge "most restrictive across all devices" for a field like a bedtime window — so the device layer is only included when the caller asks about one specific device.
- Nullable fields (`screen_time_limit_minutes`, `bedtime_start`, `bedtime_end`): the most specific layer with a non-null value wins (device > child > family), matching the precedence below. The response includes which layer (`source`) supplied each value.
- Boolean flags (`block_new_app_installs`, `block_safari`, `block_explicit_content`, `require_parent_approval`): **OR-combined across layers that have a row**, not "most specific wins." These columns default to `false` at the schema level, so an untouched child/device row can't be distinguished from one where a parent explicitly chose "off" — most-specific-wins would risk a default-`false` child row silently overriding a family-level `true`. OR-combining errs toward the safer, more restrictive outcome instead. The response includes every layer (`sources`) that contributed a `true`.
- Mobile: a "What Currently Applies" summary card on each child's detail screen (`app/child/[id].tsx`) shows the resolved values with their source, alongside an explicit "Defined here — not yet enforced on this device" label so parents aren't misled into thinking anything is actually being blocked.

## Device Restrictions (2026-07-10 — first policy-engine building block)

- `device_restrictions` (one row per device) lets a parent set: `screen_time_limit_minutes`, `bedtime_start`/`bedtime_end`, `block_new_app_installs`, `block_safari`, `block_explicit_content`, `require_parent_approval`.
- API: `GET|PATCH /api/devices/:deviceId/restrictions` (parent-only, family-ownership checked, 404 on cross-family access). Mobile UI: Profile screen's "Device Restrictions" section (`app/(tabs)/profile.tsx`), via `useDeviceRestrictions` hook.
- **This is storage only — parent intent, not enforcement.** Nothing on the device reads or applies these values yet; there is no OS-level screen-time API, Safari blocker, or content filter wired up. It's the same "policy definition, no enforcement surface" pattern as the family agreement below, scoped to a single device instead of the whole family.
- `blocked_app_events` (a log of blocked launch attempts) was added to the schema alongside this but is **not wired to anything**. Ingestion would use the existing `device_events`-style pipeline.

## Device App Rules / "General Apps" (2026-07-11 — third policy-engine building block)

- `device_app_rules` (one row per app per device restriction) lets a parent set, per installed app: `blocked`, `bedtime_locked`, `daily_limit_minutes`, and `restricted_start`/`restricted_end` (HH:MM 24h — the time window during which the app is intended to be inaccessible, mirroring the `bedtime_start`/`bedtime_end` pattern used elsewhere).
- API: `GET|POST /api/devices/:deviceId/app-rules`, `PATCH|DELETE /api/devices/:deviceId/app-rules/:ruleId` (parent-only, family/device-ownership checked, 404 on cross-family access; `POST` upserts by `app_bundle_id` so re-adding the same app updates it in place). See `services/deviceAppRules.ts`.
- Mobile UI: a "General Apps" section on each device's expanded card (`app/child/[id].tsx`, `hooks/useDeviceAppRules.ts`) where a parent manually adds an app by name + bundle/package id (there is no OS API in this Expo-managed React Native app to enumerate installed apps without a custom native module) and edits its blocked/limit/window fields.
- **This is storage only — parent intent, not enforcement.** Same pattern as `device_restrictions`. Building enforcement would still mean a device-side agent (OS-specific, out of scope for this cross-platform backend) that reads `device_app_rules` and actually restricts app launches during the configured windows, plus `blocked_app_events` ingestion when it fires.

## Family & Child Restrictions (2026-07-10 — second policy-engine building block)

- `family_policies` (one row per family) and `child_policies` (one row per child) store the same field set as `device_restrictions`: `screen_time_limit_minutes`, `bedtime_start`/`bedtime_end`, `block_new_app_installs`, `block_safari`, `block_explicit_content`, `require_parent_approval`.
- API: `GET|PATCH /api/family/policy` (family-wide) and `GET|PATCH /api/family/children/:childId/policy` (per-child), both parent-only, family-ownership checked (404 on cross-family child access).
- **This is storage only — parent intent, not enforcement.** Same "policy definition, no enforcement surface" pattern as `device_restrictions` and the family agreement.
- **Precedence (resolved, not enforced):** the resolution order is family default → child override → device override — i.e. a device-level restriction wins over a child-level one, which wins over the family-wide default (booleans are OR-combined instead — see "Effective Policy Resolution" above for why). `GET /api/family/children/:childId/effective-policy` implements this; there is still no enforcement anywhere that reads or applies the resolved answer.

## What exists

### Family Technology Agreement (social contract, not enforcement)
- Built in `app/agreement.tsx`, stored in `family_agreements` (one per family): a jsonb array of selected standard `rules` plus `custom_rules` text array.
- API: `GET/PUT /api/family/agreement`.
- This is a **pledge/agreement document** families commit to together. Nothing in the system technically enforces these rules on devices.

### Family controls
- Parents manage child profiles (age bands, PINs) and can add/remove children.
- Child sessions get a restricted "Child Mode" UI (client-side scoping).
- Subscription tier limits (child count, premium content, coach messages) are enforced server-side.

### Device controls
- Devices are **monitored, not controlled**: registration, heartbeats, self-reported screen-time/activity events, and parent-facing analytics/dashboards (see `docs/DEVICE_ARCHITECTURE.md`).
- There is no remote lock, app blocking, time-limit enforcement, or content filtering.

## If real enforcement is built later

Real on-device enforcement (actually blocking an app, locking the device at bedtime, etc.) requires Apple's Family Controls entitlement (Screen Time API: FamilyControls/DeviceActivity/ManagedSettings) on iOS — native Swift code, an Apple approval process, and moving this Expo-managed app to a custom dev client/EAS build. As of 2026-08-08 this app has none of that infrastructure (no `eas.json`, no dev-client plugin, no native modules); it was deliberately deferred (see `AI_CONTEXT/NEXT_TASK.md` Priority 5) in favor of the non-native groundwork above.

- Natural anchors once that phase starts: `getEffectivePolicy()` (`services/effectivePolicy.ts`) is the resolved answer an enforcement agent would need to read; `devices.capabilities`/`permission_status` (enforcement surface); `device_events`/`blocked_app_events` (compliance signals, `blocked_app_events` still unwired).
- Record the design in `AI_CONTEXT/DECISIONS.md` and update this document.
