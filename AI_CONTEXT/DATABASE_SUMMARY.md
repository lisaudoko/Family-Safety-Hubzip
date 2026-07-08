# Database Summary

PostgreSQL (Replit) + Drizzle ORM. Schema: `lib/db/src/schema/index.ts`. 19 tables.

## Tables

| Table | Purpose | Key relationships |
| --- | --- | --- |
| `profiles` | Users (parents & child logins). `role` ('parent' default), `subscription_tier` ('free'), `has_completed_onboarding`, `email_verified` | — |
| `sessions` | Auth. `token` PK, `expires_at` (90d) | → profiles (cascade) |
| `password_reset_codes` | Hashed reset codes with expiry/used_at | → profiles |
| `email_verification_codes` | Hashed verification codes | → profiles |
| `families` | Family group. `family_code` unique (child login) | `parent_id` → profiles |
| `children` | Child profiles. `age_band` (default '10-13') | → families |
| `devices` | Registered devices. `platform`, `capabilities` jsonb[], `permission_status` jsonb, `status` | `owner_id` → profiles, → families |
| `device_events` | Activity logs. `event_type`, `payload` jsonb, `occurred_at` | → devices, profiles, families |
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

## Conventions

- Text PKs (UUIDs generated in app code). `snake_case` columns, `camelCase` TS exports (`profilesTable`).
- `created_at`/`updated_at` timestamps with `defaultNow()` on most tables.
- jsonb columns typed with `.$type<T>()`.
- drizzle-zod `createInsertSchema`/`createSelectSchema` for nearly every table (insert schemas omit timestamps).

## Migrations

- Dev push: `cd lib/db && DATABASE_URL=$DATABASE_URL npx drizzle-kit push` (avoid the pnpm-filter push script — install check can fail).
- Server also runs idempotent startup migrations (`artifacts/api-server/src/lib/startup-migrate.ts`).
- After adding schema exports: `pnpm run typecheck:libs` before api-server typecheck.
