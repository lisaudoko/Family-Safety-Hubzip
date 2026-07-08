# Policy Engine

**There is no automated policy-enforcement engine in Digital Village today.** This document describes the policy-adjacent features that actually exist, to prevent future agents from assuming enforcement capabilities.

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
