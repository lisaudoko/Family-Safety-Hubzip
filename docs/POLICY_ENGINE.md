# Policy Engine

**There is no automated policy-enforcement engine in Digital Village today.** This document describes the policy-adjacent features that actually exist, to prevent future agents from assuming enforcement capabilities.

## Device Restrictions (2026-07-10 — first policy-engine building block)

- `device_restrictions` (one row per device) lets a parent set: `screen_time_limit_minutes`, `bedtime_start`/`bedtime_end`, `block_new_app_installs`, `block_safari`, `block_explicit_content`, `require_parent_approval`.
- API: `GET|PATCH /api/devices/:deviceId/restrictions` (parent-only, family-ownership checked, 404 on cross-family access). Mobile UI: Profile screen's "Device Restrictions" section (`app/(tabs)/profile.tsx`), via `useDeviceRestrictions` hook.
- **This is storage only — parent intent, not enforcement.** Nothing on the device reads or applies these values yet; there is no OS-level screen-time API, Safari blocker, or content filter wired up. It's the same "policy definition, no enforcement surface" pattern as the family agreement below, scoped to a single device instead of the whole family.
- Two related tables were added to the schema alongside this but are **not wired to anything**: `device_app_rules` (per-app block/bedtime-lock/daily-limit rows) and `blocked_app_events` (a log of blocked launch attempts). Building enforcement would mean: (1) a device-side agent that reads `device_restrictions`/`device_app_rules` and actually applies them (OS-specific, out of scope for this cross-platform backend), and (2) `blocked_app_events` ingestion via the existing `device_events`-style pipeline.

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

## If a policy engine is built later

- Natural anchors: `family_agreements.rules` (policy definitions), `devices.capabilities`/`permission_status` (enforcement surface), `device_events` (compliance signals).
- Record the design in `AI_CONTEXT/DECISIONS.md` and update this document.
