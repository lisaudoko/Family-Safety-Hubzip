# Live Screen Mirroring: Plan (draft, not started)

_Requested by the product owner on 2026-11-26: a parent asks to see a child's screen, the child accepts, and the child's screen streams live to the parent's Digital Village app. **Decided 2026-11-26: LiveKit Cloud; launch is delayed until this ships.** Phase 1 (server) is built; phases 2–4 are not started._

## What it is and isn't

- **Consent every time.** A parent taps "Request screen view." The child's phone shows a prompt, and nothing is shared until the child accepts and starts sharing. Apple and Google do not allow silent screen capture: iOS shows a red recording indicator and Android a system notification for the whole session.
- **Live only, never recorded.** Video goes from the child's phone to the parent's phone through a real-time video service. Nothing is saved by us or the provider (no recording or "egress" feature enabled).
- **Either side can stop it.** It also ends automatically after a time limit (proposed: 15 minutes).
- **Parents only.** Only parents can request, and only for their own children.

## How a session flows

1. The parent opens a child's page and taps **Request screen view**. The server creates a `screen_share_requests` row (status `requested`, expires in 2 minutes) and sends a push to the child's device(s).
2. The child sees "Mom wants to see your screen" and taps **Accept** or **Decline**.
3. On **Accept**, the server mints two short-lived, single-room tokens:
   - the child's token can only *publish a screen track*;
   - the parent's token can only *watch*.
4. The child starts sharing.
   - **iPhone:** the child taps the system broadcast button (Apple requires this tap) and chooses Digital Village. A Broadcast Upload Extension captures the screen and streams it.
   - **Android:** the system "Start recording or casting?" dialog appears. The child taps Start, and a foreground service streams the screen.
5. The parent's app shows the live view. The child's app shows a persistent "Mom is viewing your screen. Tap to stop" banner.
6. The session ends when either side taps Stop, the time limit is reached, or either side disconnects. The server marks the row `ended`, and the tokens stop working.
7. Each request, acceptance, decline and end is recorded in the existing audit log.

## Components

| Area | Work | Notes |
| --- | --- | --- |
| Video service | Managed WebRTC SFU. **Recommended: LiveKit Cloud** (open source, React Native SDK with screen-share support on iOS and Android, server SDK for tokens) | **Decide** provider. Usage-based pricing; confirm current rates. Alternatives: Agora, Daily, self-hosted LiveKit |
| Database | New `screen_share_requests` table (UUID id, family_id, parent_id, child_id, status, created/responded/ended/expires timestamps) | Startup migration + schema. No existing table fits |
| API | `POST /api/screen-share/requests` (parent), `POST /…/:id/accept` and `/decline` (that child only), `POST /…/:id/end` (either side), `GET /…/active` | Token minting server-side only, after family/child checks; rate limit (e.g. 5 requests per child per hour) |
| Push to children | Child devices register push tokens (today only parents do) | Used only for screen-view requests. A child can't turn requests off, but declining is always one tap |
| iOS app | Broadcast Upload Extension target (new App ID under the existing App Group), broadcast picker button, viewer screen, "being viewed" banner | Hardest part. Extensions have tight memory limits; needs a config plugin, a dev build, and two real iPhones to test |
| Android app | MediaProjection + foreground service (type `mediaProjection`), viewer screen, banner | Play Console foreground-service declaration; Play monitoring-app disclosure rules |
| Viewer | Live video view on the parent's phone, with an End button | Works on iPhone and Android parents |

## What else has to change

- **Privacy policy, in-app privacy text, data inventory, and the FaceTime/Meet tip** all say Digital Village never sees the child's screen. They must be rewritten to say screens are shown live only with the child's acceptance, are never recorded, and pass through the video provider (a new processor).
- **Terms of service:** add acceptable use for screen viewing (only your own children, no coercion).
- **Store answers:** Apple App Privacy and Google Data Safety must cover "screen content, viewed live, not stored." The Google Play monitoring/stalkerware policy needs a prominent disclosure. Expect closer review, especially with children under 13 declared.
- **COPPA:** live screen content can include a child's personal information and other people's. A lawyer should confirm the consent model (the parent requests, and the child accepts each time).
- **Architecture exception:** this is an online-only feature, like the AI Coach.

## Phases and rough effort

1. **Server** (requests table, endpoints, token minting, audit, tests): **built 2026-11-26** — `routes/screenShare.ts`, `lib/livekit.ts`, `test/screen-share.test.ts`. Limits: request expires after 2 minutes, session after 15, max 5 requests per child per hour.
2. **Android** sharing + viewer: 1–1.5 weeks.
3. **iOS** broadcast extension + viewer: 1.5–2 weeks.
4. **Policy, store and legal updates; two-device testing on both platforms; fixes:** about 1 week.

**Total: roughly 4–6 weeks.** Nothing in phases 2–3 can be tested without development builds on real devices.

## Decisions needed

- [x] Video provider: LiveKit Cloud. Create the project and set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` on the API server.
- [x] Timing: launch is delayed until this ships.
- [x] Limits: 2-minute request expiry, 15-minute sessions, 5 requests per child per hour (defaults in `routes/screenShare.ts`; change if you want different values).
- [ ] Confirm the wording a child sees, e.g. "Mom wants to see your screen. Accept / Decline."
