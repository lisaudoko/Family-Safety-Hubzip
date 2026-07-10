import { pool } from "@workspace/db";
import { logger } from "./logger.js";

/**
 * Runs idempotent ALTER TABLE statements to bring the live database
 * in sync with the current Drizzle schema without requiring drizzle-kit.
 * Safe to run on every startup — all statements are IF NOT EXISTS / IF EXISTS guarded.
 */
export async function runStartupMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const statements = [
      // ── profiles ────────────────────────────────────────────────────────────
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`,

      // ── families ────────────────────────────────────────────────────────────
      `ALTER TABLE families ADD COLUMN IF NOT EXISTS family_code TEXT`,
      // Populate family_code for existing rows that don't have one
      `UPDATE families SET family_code = 'FC-' || UPPER(SUBSTRING(id, 1, 8)) WHERE family_code IS NULL`,
      // Now make it NOT NULL + UNIQUE (idempotent — index creation is handled separately)
      `ALTER TABLE families ALTER COLUMN family_code SET NOT NULL`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'families_family_code_unique'
         ) THEN
           ALTER TABLE families ADD CONSTRAINT families_family_code_unique UNIQUE (family_code);
         END IF;
       END $$`,

      // ── password_reset_codes ─────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS password_reset_codes (
         id TEXT PRIMARY KEY,
         user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         code_hash TEXT NOT NULL,
         expires_at TIMESTAMP NOT NULL,
         used_at TIMESTAMP,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS password_reset_codes_user_id_idx ON password_reset_codes(user_id)`,

      // ── email_verification_codes ─────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS email_verification_codes (
         id TEXT PRIMARY KEY,
         user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         code_hash TEXT NOT NULL,
         expires_at TIMESTAMP NOT NULL,
         used_at TIMESTAMP,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS email_verification_codes_user_id_idx ON email_verification_codes(user_id)`,

      // ── devices ──────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS devices (
         id TEXT PRIMARY KEY,
         owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         name TEXT NOT NULL,
         platform TEXT NOT NULL,
         os_version TEXT,
         app_version TEXT,
         capabilities JSONB NOT NULL DEFAULT '[]',
         permission_status JSONB NOT NULL DEFAULT '{}',
         status TEXT NOT NULL DEFAULT 'active',
         last_synced_at TIMESTAMP,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS devices_owner_id_idx ON devices(owner_id)`,
      `CREATE INDEX IF NOT EXISTS devices_family_id_idx ON devices(family_id)`,

      // ── device_events ─────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS device_events (
         id TEXT PRIMARY KEY,
         device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
         owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         event_type TEXT NOT NULL,
         payload JSONB NOT NULL DEFAULT '{}',
         occurred_at TIMESTAMP NOT NULL,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS device_events_device_id_idx ON device_events(device_id)`,
      `CREATE INDEX IF NOT EXISTS device_events_owner_id_occurred_at_idx ON device_events(owner_id, occurred_at)`,
      `CREATE INDEX IF NOT EXISTS device_events_family_id_event_type_idx ON device_events(family_id, event_type)`,

      // ── device_restrictions ───────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS device_restrictions (
         id TEXT PRIMARY KEY,
         device_id TEXT NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         screen_time_limit_minutes INTEGER,
         bedtime_start TEXT,
         bedtime_end TEXT,
         block_new_app_installs BOOLEAN NOT NULL DEFAULT FALSE,
         block_safari BOOLEAN NOT NULL DEFAULT FALSE,
         block_explicit_content BOOLEAN NOT NULL DEFAULT FALSE,
         require_parent_approval BOOLEAN NOT NULL DEFAULT FALSE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS device_restrictions_family_idx ON device_restrictions(family_id)`,

      // ── device_app_rules ──────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS device_app_rules (
         id TEXT PRIMARY KEY,
         restriction_id TEXT NOT NULL REFERENCES device_restrictions(id) ON DELETE CASCADE,
         app_bundle_id TEXT NOT NULL,
         app_name TEXT NOT NULL,
         blocked BOOLEAN NOT NULL DEFAULT FALSE,
         bedtime_locked BOOLEAN NOT NULL DEFAULT FALSE,
         daily_limit_minutes INTEGER,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS device_app_rules_restriction_idx ON device_app_rules(restriction_id)`,

      // ── blocked_app_events ─────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS blocked_app_events (
         id TEXT PRIMARY KEY,
         device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         app_name TEXT NOT NULL,
         blocked_reason TEXT NOT NULL,
         attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS blocked_app_events_device_idx ON blocked_app_events(device_id)`,
      `CREATE INDEX IF NOT EXISTS blocked_app_events_family_idx ON blocked_app_events(family_id)`,

      // ── support_codes ─────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS support_codes (
         id TEXT PRIMARY KEY,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         created_by TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         code_hash TEXT NOT NULL,
         expires_at TIMESTAMP NOT NULL,
         used_at TIMESTAMP,
         used_by TEXT REFERENCES profiles(id),
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS support_codes_family_id_idx ON support_codes(family_id)`,

      // ── support_sessions ──────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS support_sessions (
         id TEXT PRIMARY KEY,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         admin_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
         code_id TEXT NOT NULL REFERENCES support_codes(id) ON DELETE CASCADE,
         started_at TIMESTAMP NOT NULL DEFAULT NOW(),
         expires_at TIMESTAMP NOT NULL,
         ended_at TIMESTAMP
       )`,
      `CREATE INDEX IF NOT EXISTS support_sessions_family_id_idx ON support_sessions(family_id)`,
      `CREATE INDEX IF NOT EXISTS support_sessions_admin_id_idx ON support_sessions(admin_id)`,

      // ── sessions.support_session_id (added after support_sessions exists) ──────
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS support_session_id TEXT REFERENCES support_sessions(id) ON DELETE CASCADE`,

      // ── audit_log ─────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS audit_log (
         id TEXT PRIMARY KEY,
         actor_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
         actor_role TEXT NOT NULL,
         family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
         action TEXT NOT NULL,
         target_type TEXT,
         target_id TEXT,
         metadata JSONB NOT NULL DEFAULT '{}',
         ip TEXT,
         is_support_session BOOLEAN NOT NULL DEFAULT FALSE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS audit_log_family_id_created_at_idx ON audit_log(family_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS audit_log_actor_id_created_at_idx ON audit_log(actor_id, created_at)`,

      // ── badges ────────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS badges (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         description TEXT NOT NULL,
         icon_name TEXT NOT NULL,
         color TEXT NOT NULL,
         condition TEXT NOT NULL,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,

      // ── weekly_tips ───────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS weekly_tips (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         content TEXT NOT NULL,
         category TEXT NOT NULL,
         icon_name TEXT NOT NULL,
         sort_order INTEGER NOT NULL DEFAULT 0,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS weekly_tips_sort_order_idx ON weekly_tips(sort_order)`,

      // ── courses ───────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS courses (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         category TEXT NOT NULL,
         description TEXT NOT NULL,
         duration TEXT NOT NULL,
         level TEXT NOT NULL DEFAULT 'beginner',
         icon_name TEXT NOT NULL,
         color TEXT NOT NULL,
         is_premium BOOLEAN NOT NULL DEFAULT FALSE,
         audience TEXT NOT NULL DEFAULT 'parent',
         sort_order INTEGER NOT NULL DEFAULT 0,
         is_published BOOLEAN NOT NULL DEFAULT TRUE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON courses(sort_order)`,

      // ── lessons ───────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS lessons (
         id TEXT PRIMARY KEY,
         course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
         sort_order INTEGER NOT NULL DEFAULT 0,
         title TEXT NOT NULL,
         module TEXT,
         audience TEXT NOT NULL DEFAULT 'parent',
         age_range TEXT,
         difficulty TEXT NOT NULL DEFAULT 'beginner',
         learning_objectives JSONB NOT NULL DEFAULT '[]',
         content TEXT NOT NULL,
         sections JSONB,
         interactive_activity JSONB,
         scenarios JSONB NOT NULL DEFAULT '[]',
         parent_discussion_prompts JSONB NOT NULL DEFAULT '[]',
         action_steps JSONB NOT NULL DEFAULT '[]',
         completion_criteria TEXT,
         badge_id TEXT REFERENCES badges(id),
         estimated_minutes INTEGER NOT NULL DEFAULT 10,
         key_takeaways JSONB NOT NULL DEFAULT '[]',
         has_quiz BOOLEAN NOT NULL DEFAULT FALSE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS lessons_course_id_idx ON lessons(course_id)`,
      `CREATE INDEX IF NOT EXISTS lessons_sort_order_idx ON lessons(sort_order)`,

      // ── quizzes ───────────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS quizzes (
         id TEXT PRIMARY KEY,
         lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS quizzes_lesson_id_idx ON quizzes(lesson_id)`,

      // ── quiz_questions ────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS quiz_questions (
         id TEXT PRIMARY KEY,
         quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
         sort_order INTEGER NOT NULL DEFAULT 0,
         question TEXT NOT NULL,
         options JSONB NOT NULL DEFAULT '[]',
         correct_index INTEGER NOT NULL,
         explanation TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS quiz_questions_quiz_id_idx ON quiz_questions(quiz_id)`,
      `CREATE INDEX IF NOT EXISTS quiz_questions_sort_order_idx ON quiz_questions(sort_order)`,

      // ── subscriptions ─────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS subscriptions (
         id TEXT PRIMARY KEY,
         family_id TEXT NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
         stripe_customer_id TEXT NOT NULL,
         stripe_subscription_id TEXT,
         stripe_price_id TEXT,
         status TEXT NOT NULL DEFAULT 'none',
         plan TEXT,
         current_period_end TIMESTAMP,
         cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions(stripe_customer_id)`,

      // ── coach_usage ───────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS coach_usage (
         id TEXT PRIMARY KEY,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         period TEXT NOT NULL,
         message_count INTEGER NOT NULL DEFAULT 0,
         created_at TIMESTAMP NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT coach_usage_family_period_unique UNIQUE (family_id, period)
       )`,

      // ── family_reports ────────────────────────────────────────────────────────
      `CREATE TABLE IF NOT EXISTS family_reports (
         id TEXT PRIMARY KEY,
         family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
         period TEXT NOT NULL,
         generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
         summary_json JSONB NOT NULL DEFAULT '{}'
       )`,
      `CREATE INDEX IF NOT EXISTS family_reports_family_period_idx ON family_reports(family_id, period)`,
    ];

    for (const sql of statements) {
      await client.query(sql);
    }

    await client.query("COMMIT");
    logger.info("Startup migrations applied successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Startup migration failed");
    throw err;
  } finally {
    client.release();
  }
}
