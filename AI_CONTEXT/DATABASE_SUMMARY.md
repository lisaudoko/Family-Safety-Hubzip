# Database Summary

PostgreSQL (Replit) + Drizzle ORM. Schema: `lib/db/src/schema/index.ts`. 25 tables.

## Tables

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `profiles` | Users (parents & child logins). `role` ('parent' default), `subscription_tier` ('free'), `has_completed_onboarding`, `email_verified` | — |
| `sessions` | Auth. `token` PK, `expires_at` (90d, 60min for support sessions), nullable `support_session_id` | → profiles (cascade), → support_sessions |
| `password_reset_codes` | Hashed reset codes with expiry/used_at | → profiles |
| `email_verification_codes` | Hashed verification codes | → profiles |
| `families` | Family group. `family_code` unique (child login) | `parent_id` → profiles |
| `children` | Child profiles. `age_band` (default '10-13') | → families |
| `devices` | Registered devices. `platform`, `capabilities` jsonb[], `permission_status` jsonb, `status` | `owner_id` → profiles, → families |
| `device_events` | Activity logs. `event_type`, `payload` jsonb, `occurred_at` | → devices, profiles, families |
| `device_restrictions` | Parent-set restrictions per device (2026-07-10, Priority 5 groundwork): `screen_time_limit_minutes`, `bedtime_start`/`end`, `block_new_app_installs`/`block_safari`/`block_explicit_content`, `require_parent_approval`. `device_id` unique | → devices, families |
| `device_app_rules` | Per-app rule rows (block/bedtime-lock/daily-limit) scoped to a `device_restrictions` row. Schema exists but **unused** — no route/service reads or writes it yet | → device_restrictions |
| `blocked_app_events` | Log of blocked app-launch attempts (`app_name`, `blocked_reason`). Schema exists but **unused** — no ingestion path yet | → devices, families |
| `user_progress` | `user_id` PK. `completed_lessons` text[], `course_progress` jsonb, `weekly_tip_index` | → profiles |
| `family_agreements` | `family_id` unique. `rules` jsonb[], `custom_rules` text[] | → families |
| `badges` | Achievement defs: title, icon_name, color, condition | — |
| `weekly_tips` | Tips with category + sort_order | — |
| `courses` | `category`, `level`, `is_premium`, `is_published` | — |
| `lessons` | Content: `learning_objectives`/`interactive_activity`/`scenarios` jsonb | → courses, badge_id → badges |
| `quizzes` | `lesson_id` unique | → lessons |
| `quiz_questions` | `options` jsonb[], `correct_index` | → quizzes |
| `subscriptions` | `family_id` unique, `stripe_customer_id`, `status` ('none'), `current_period_end` | → families |
| `coach_usage` | AI usage: unique (family_id, period), `message_count` | → families |
| `family_reports` | Monthly reports: `period`, `summary_json` | → families |
| `support_codes` | Hashed single-use codes a parent mints for admin support access, `expires_at` (~30min), `used_at`/`used_by` | → families, → profiles (created_by/used_by) |
| `support_sessions` | Redeemed support-code session: `admin_id`, `started_at`/`expires_at`/`ended_at` | → families, → profiles (admin_id), → support_codes |
| `audit_log` | Security/account event log: `actor_id` (nullable), `actor_role`, `family_id` (nullable), `action`, `target_type`/`target_id`, `metadata` jsonb, `is_support_session`. Indexes: (family_id, created_at), (actor_id, created_at) | → profiles (nullable), → families (nullable) |

## Conventions

- Text PKs (UUIDs generated in app code). `snake_case` columns, `camelCase` TS exports (`profilesTable`).
- `created_at`/`updated_at` timestamps with `defaultNow()` on most tables.
- jsonb columns typed with `.$type<T>()`.
- drizzle-zod `createInsertSchema`/`createSelectSchema` for nearly every table (insert schemas omit timestamps).

## Migrations

- Dev push: `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push` (avoid the pnpm-filter push script — install check can fail).
- Server also runs idempotent startup migrations (`artifacts/api-server/src/lib/startup-migrate.ts`).
- After adding schema exports: `pnpm run typecheck:libs` before api-server typecheck.
