# Launch Checklist — Triage (App Store + Google Play)

_Triage of the product owner's launch checklist against the codebase, 2026-11-26. Update the status column as items close._

**Status key**
- **Built** — implemented in code; *not* yet verified on a device or in a production build unless noted.
- **Code** — needs code work (Claude can do it).
- **You** — needs the product owner: a console, a dashboard, legal text, a device, or a decision.
- **Decide** — a scope decision is needed before anything else happens.

> Nothing in the app has been run on a physical iPhone or Android device, and the ~20 newest api-server tests have never run (Vitest can't run on the Windows dev machine). Run `pnpm --filter @workspace/api-server run test` on Replit/Linux first.

## 1. Application functionality

| Item | Status | Notes |
| --- | --- | --- |
| Parent registration and login | Built | Lockout after 8 failed logins / 15 min |
| Child account creation and login | Built | Parent creates child; child signs in with family code + PIN |
| Family creation and family code generation | Built | |
| Child joining a family using the family code | Built | Code lists the family's children; child picks self + PIN. Children cannot self-register |
| Parent dashboard | Built | `routes/dashboard.ts`, Home/Family tabs |
| Child dashboard | Built | Same tabs, role-aware rendering |
| Password reset and email delivery | Built / **You** | Needs real SMTP creds in production; without them no email is sent |
| Profile management | Built | Name only; email cannot be changed |
| Device registration | Built | Automatic on app launch |
| Device synchronization and heartbeat | Built | Foreground-only (no background sync) |
| Screen-time or activity tracking | Built (limited) | Measures **Digital Village's own** foreground time only, not system-wide usage. See section 3 |
| Monitoring permissions and capability status | Built (iOS) | Screen Time authorization card on child profile (iOS 16+). Android has no equivalent |
| Parent notifications and alerts | **Decide** | **No push notifications exist.** Only a weekly digest email that a parent triggers by hand. Either build push (expo-notifications + APNs/FCM) or remove the claim from listings |
| Subscription and payment functionality | Built / **You** | RevenueCat IAP, server-verified. Needs RevenueCat + store setup |
| Subscription restoration | Built | "Restore Purchases" on the subscription screen |
| Account deletion | Built | Profile → Delete Account (parents) |
| Logout and session expiration | Built | 90-day sessions; expired sessions rejected |
| Error handling and offline behavior | Built (partial) | Offline-first local cache; no crash reporting (see section 2) |

## 2. Backend and database readiness

| Item | Status | Notes |
| --- | --- | --- |
| Production API URL / `EXPO_PUBLIC_DOMAIN` | **You** | Create in each EAS environment (`eas env:create`) |
| Production database configured | **You** | |
| All database migrations completed | Built | Run automatically at server start (`startup-migrate.ts`) |
| Authentication and authorization tested | Built | Tests exist; newest ones unrun |
| Parent and child role permissions verified | Built | Cross-family isolation tests |
| Password reset email delivery tested | **You** | Needs SMTP + a real send |
| SMTP credentials in env vars | **You** | `SMTP_*` |
| API rate limiting | Built | Global + per-account auth limits |
| Input validation | Built | |
| Error logging configured | Built (partial) / **Decide** | Server logs via Pino. No crash reporting on mobile; add Sentry (needs a DSN) |
| Production backups configured | **You** | Database provider setting |
| Database access restricted | **You** | |
| No development credentials exposed | Built | Keys removed from logs; only public `EXPO_PUBLIC_*` values ship in the app |
| Backend tested outside dev | **You** | |

## 3. Privacy, security, and child safety

| Item | Status | Notes |
| --- | --- | --- |
| Privacy Policy / Terms published online | **You** | Then set `EXPO_PUBLIC_PRIVACY_POLICY_URL` / `EXPO_PUBLIC_TERMS_URL` in each EAS environment. Links are already wired into Profile, Welcome and the subscription screen |
| Support page or email | Built (email) | `admin@nexgenoptimize.com` is in the app. A support URL is still required by both stores |
| Children's privacy disclosures / parental consent | **You** | COPPA: the parent creates all child profiles. Needs a consent statement at child creation and in the policy (legal review) |
| Data collected / purpose / sharing documented | Drafted | See `docs/DATA_INVENTORY.md` (verify before submitting) |
| Data retention policy | **You** | Decide; the code deletes on request but has no automatic expiry |
| Account and child-data deletion | Built | |
| Monitoring functionality accurately described | Built | Fixed 2026-11-26: false "does not monitor / data stays on your device" claims removed from Profile, Welcome and Register; replaced with accurate text (`lib/legal.ts`) |
| Permissions requested only when necessary | Built | Screen Time is the only sensitive permission; it is requested from the child's profile card |
| Location / sensitive capabilities | Built | No location (`expo-location` removed) |
| Third-party SDKs reviewed | Drafted | RevenueCat (app), Anthropic (coach, server), Stripe (web billing, server). See inventory |
| Disclosures consistent with behavior | **You** | In-app text now matches the code; keep store answers and the published policy matched to `DATA_INVENTORY.md` |

**What monitoring actually does (use this wording in listings and review notes):**
- Digital Village records *its own* time in the foreground, plus basic device info (name, platform, OS and app version) and the last sync time.
- On iOS 16+, with the parent's approval through Apple's Screen Time (Family Controls) framework, it can enforce bedtime (blocking apps on a schedule) and web content filters on the child's device. Apple's framework does not give the app usage data it can upload.
- It does **not** read messages, browsing history, location, photos or keystrokes, and it does not report system-wide app usage.
- There is no equivalent enforcement on Android.

## 4. Apple App Store

| Item | Status | Notes |
| --- | --- | --- |
| Developer membership / app in App Store Connect | **You** | |
| Bundle ID | Built | `com.iriemom.digitalvillage` |
| App name / version / build number | Built | "Digital Village" 1.0.0; build number auto-increments (EAS remote) |
| App icon | **You** | `assets/images/icon.png` exists; confirm it is final 1024×1024 with no transparency |
| Launch screen | Built | Icon on cream background; replace if you want a designed splash |
| iOS permission descriptions | Built | No usage-description strings needed: unused `expo-location` and `expo-image-picker` removed |
| Required entitlements | **You** | Family Controls for 3 extension IDs, App Group, real `appleTeamId` in `app.json` |
| Privacy manifest | Built | `ios.privacyManifests` in `app.json` (UserDefaults, file timestamp, boot time, disk space; no tracking). Export compliance: `usesNonExemptEncryption: false` (HTTPS only) |
| EAS production profile / env vars | Built / **You** | Profiles wired to EAS environments; values still to set |
| Listing (description, keywords, screenshots, category, age rating) | **You** | Category suggestion: Education or Lifestyle |
| Support / Privacy Policy URLs | **You** | |
| Review contact + notes | **You** (draft available) | Give reviewers a parent demo account, plus a child profile with a known family code + PIN |
| App Privacy questionnaire | **You** | Answer from `DATA_INVENTORY.md` |
| In-app purchases | **You** | Products + `premium` entitlement in RevenueCat |
| Paywall legal links | Built | Terms of Use + Privacy Policy links on the subscription screen (Apple 3.1.2); Terms falls back to Apple's standard EULA |
| TestFlight / physical-device tests / submission | **You** | |

## 5. Google Play

| Item | Status | Notes |
| --- | --- | --- |
| Developer account / app in Play Console | **You** | |
| Application ID | Built | `com.iriemom.digitalvillage` |
| Version / version code | Built | EAS remote versioning |
| Adaptive icon | **You** + **Code** | Needs a foreground PNG with safe-zone padding; Claude can wire it into `app.json` |
| Android permissions | Built | None sensitive requested |
| Target SDK | Built | Expo SDK 54 targets the current Play requirement |
| EAS Android production profile | Built | Same profiles; produces `.aab` by default |
| Listing, feature graphic, Data Safety, content rating, ads declaration | **You** | Ads: none |
| Target audience / Families Policy | **Decide** | Parents are the audience, but children sign in. If any target age is under 13, Families Policy applies, and RevenueCat and Anthropic must be compatible. Simplest: target adults (parents) and describe child sign-in as a parent-managed feature |
| Reviewer access instructions | **You** | Same demo accounts as Apple |
| Testing tracks | **You** | New personal accounts need a closed test with 12+ testers for 14 days |

## 6. Subscriptions (RevenueCat)

Code side is built: purchase, restore, server-side verification (`POST /api/billing/sync-purchases`), webhook (`/api/billing/revenuecat-webhook`), expiration/cancellation via RevenueCat re-sync, and Manage Subscription opening the store page. Everything else in this section is **You**: products in both stores, matching identifiers, entitlement `premium`, the offering, the webhook, server secrets, and sandbox/test purchases.

## 7. Testing and QA

All items are **You** (device testing), except automated coverage, which exists for registration, login, child login, wrong PIN, cross-family access, expired sessions, deletion and billing. Wrong family code returns a not-found error. Run the full suite on Linux first.

## 8. Branding

All **You**. Support email exists. A landing page template lives in `artifacts/mobile/server/templates/landing-page.html` if useful.
