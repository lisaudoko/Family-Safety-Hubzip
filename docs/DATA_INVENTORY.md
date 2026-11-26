# Data Inventory (draft for App Privacy, Data Safety and the Privacy Policy)

_Derived from the code on 2026-11-26 (`lib/db/src/schema/index.ts`, `artifacts/mobile/lib/*`, `artifacts/api-server/src/routes/*`). This is a factual inventory, not legal text. Re-check it whenever data handling changes, and have the privacy policy reviewed by someone qualified (COPPA applies because children sign in)._

## Collected and stored on our server

| Data | Whose | Purpose | Stored where | Notes |
| --- | --- | --- | --- | --- |
| Name, email, password (bcrypt hash) | Parent | Account, sign-in, password reset | `profiles` | Email is used to send reset and verification codes |
| Child first name, age band, PIN (bcrypt hash) | Child (entered by parent) | Child profile and sign-in | `children`, `profiles` | No child email. Children cannot self-register |
| Family name, family code | Family | Linking parent and children | `families` | |
| Learning progress (courses, lessons, quiz scores, badges, assessment, challenges) | Parent and child | App functionality | `user_progress` | |
| Family technology agreement | Family | App functionality | `family_agreements` | |
| Device name, platform, OS version, app version, capabilities, last sync time | Child/parent device | Showing parents which devices are linked and their status | `devices` | Device name may contain a person's name (e.g. "Sam's iPhone") |
| Digital Village foreground time, learning-completion events, heartbeats | Device | Parent dashboard, usage summaries | `device_events` | **Only the app's own usage.** No other apps, no browsing, no location |
| Restriction settings (bedtime, screen-time limit, web filter toggles, per-app rules) | Family / child / device | Parent controls | `family_policies`, `child_policies`, `device_restrictions`, `device_app_rules` | |
| Audit log (sign-ins, failed sign-ins, account changes) incl. IP address | Parent / child / support staff | Security and abuse prevention | `audit_log` | Deleted with the account |
| Subscription status, Stripe customer ID | Family | Billing | `subscriptions`, `profiles.subscription_tier` | |
| Coach message count per month | Family | Free-tier quota | `coach_usage` | **Message text is not stored on our server** |

## Kept only on the device

- AI Coach conversation history (AsyncStorage, per user).
- Cached account/progress data for offline use (AsyncStorage).
- Session token (iOS/Android keychain via SecureStore).
- Screen Time (Family Controls) selections and schedules (Apple's frameworks keep these on the device; they are not uploaded).

## Shared with third parties (processors)

| Service | What it receives | Why |
| --- | --- | --- |
| Anthropic (Claude API) | Text of AI Coach messages, sent from our server | Generating coach replies. No account identifiers are sent |
| RevenueCat | Family ID (as the app user ID), purchase receipts | In-app subscriptions |
| Apple App Store / Google Play | Purchase transactions | Payments |
| Stripe | Parent email, family ID (metadata) | Web subscriptions only |
| Email provider (SMTP) | Parent email address, reset/verification codes, weekly digest content | Transactional email |
| Hosting/database provider | All server data above | Infrastructure |

**Not used:** advertising SDKs, third-party analytics, tracking across apps or websites (answer "No tracking" in App Store Connect), location, contacts, photos, microphone, camera.

## Retention and deletion

- **Account deletion** (Profile → Delete Account, or on request) removes the parent, the family, every child profile, devices, events, policies, progress, agreement, subscription records, sessions and audit rows. It also cancels the Stripe subscription. App Store and Play subscriptions must be cancelled by the user in store settings.
- A parent can remove an individual child (and that child's data) from the Family tab.
- **No automatic retention limit exists yet.** Decide one (for example, purge `device_events` older than N months) and state it in the policy.

## Store questionnaire hints

**Apple App Privacy.** Data linked to the user:
- Contact Info: name, email
- User Content: agreement, coach messages processed but not retained by us
- Identifiers: user/family ID
- Usage Data: product interaction (learning progress, app time)
- Diagnostics: none collected beyond server logs
- Purchases: purchase history

Tracking: no.

**Google Data Safety:**
- Collected: personal info (name, email), app activity (app interactions), app info and performance (none beyond logs), device or other IDs (app-generated device ID).
- Encrypted in transit: yes (HTTPS).
- Users can request deletion: yes (in-app).
- Shared with third parties: only processors acting on our behalf, which Google does not count as "sharing". Confirm for Anthropic per Google's definitions.
