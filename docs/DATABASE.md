# Database

PostgreSQL (Replit) + Drizzle ORM. Schema source of truth: `lib/db/src/schema/index.ts`. Connection: `pg` Pool via `DATABASE_URL` (`lib/db/src/index.ts`).

## Conventions

- Text primary keys; UUIDs generated in application code (works offline — client can mint IDs pre-sync).
- Column/table names `snake_case`; TS exports `camelCase` (e.g. `profilesTable`).
- `created_at` / `updated_at`: `timestamp().notNull().defaultNow()` on most tables.
- Complex data in `jsonb` typed via `.$type<T>()`.
- drizzle-zod: `createInsertSchema` / `createSelectSchema` generated for nearly all tables; insert schemas omit timestamps.

## Tables

### Identity & Auth
- **profiles** — users (parents and child-login identities). `id` PK text, `email` unique, `full_name` not null, `role` default `'parent'`, `subscription_tier` default `'free'`, `has_completed_onboarding` bool default false, `email_verified` bool default false, timestamps.
- **sessions** — `token` PK text, `user_id` FK → profiles.id (cascade delete), `expires_at` timestamp (90-day TTL set by app).
- **password_reset_codes** — `id` PK, `user_id` FK → profiles, `code_hash`, `expires_at`, `used_at`.
- **email_verification_codes** — same shape as reset codes.

### Family
- **families** — `id` PK, `name`, `parent_id` FK → profiles, `family_code` unique text (used for child login).
- **children** — `id` PK, `family_id` FK → families, `name`, `age_band` default `'10-13'`.
- **family_agreements** — `id` PK, `family_id` unique FK → families, `rules` jsonb array, `custom_rules` text array.

### Content
- **courses** — `id` PK, `title`, `category`, `level` default `'beginner'`, `is_premium` default false, `is_published` default true.
- **lessons** — `id` PK, `course_id` FK → courses, content fields incl. `learning_objectives` jsonb, `interactive_activity` jsonb, `scenarios` jsonb, `badge_id` FK → badges.
- **quizzes** — `id` PK, `lesson_id` unique FK → lessons.
- **quiz_questions** — `id` PK, `quiz_id` FK → quizzes, `options` jsonb array, `correct_index` int.
- **badges** — `id` PK, `title`, `description`, `icon_name`, `color`, `condition`.
- **weekly_tips** — `id` PK, `title`, `content`, `category`, `sort_order` int default 0.

### Progress
- **user_progress** — `user_id` PK + FK → profiles, `completed_lessons` text array, `course_progress` jsonb, `weekly_tip_index` int default 0.

### Devices
- **devices** — `id` PK, `owner_id` FK → profiles, `family_id` FK → families, `platform`, `capabilities` jsonb array, `permission_status` jsonb object, `status` default `'active'`.
- **device_events** — `id` PK, `device_id` FK → devices, `owner_id` FK → profiles, `family_id` FK → families, `event_type`, `payload` jsonb, `occurred_at`.

### Monetization & Reporting
- **subscriptions** — `id` PK, `family_id` unique FK → families, `stripe_customer_id`, `status` default `'none'`, `current_period_end`.
- **coach_usage** — `id` PK, `family_id` FK → families, `period` text, `message_count` int default 0; unique `(family_id, period)`.
- **family_reports** — `id` PK, `family_id` FK → families, `period`, `summary_json` jsonb.

## Migrations

Two mechanisms:

1. **drizzle-kit** — config in `lib/db/drizzle.config.ts` (dialect postgresql, schema `./src/schema/index.ts`, out `./drizzle`). Dev push: `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push`.
2. **Startup migrations** — `artifacts/api-server/src/lib/startup-migrate.ts` runs idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) before the server listens, keeping deployed environments in sync without manual steps.

After adding schema exports, always run `pnpm run typecheck:libs` before typechecking api-server.
