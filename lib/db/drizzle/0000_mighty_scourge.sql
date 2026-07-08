CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon_name" text NOT NULL,
	"color" text NOT NULL,
	"condition" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"age_band" text DEFAULT '10-13' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"duration" text NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"icon_name" text NOT NULL,
	"color" text NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"audience" text DEFAULT 'parent' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_rules" text[] DEFAULT '{}' NOT NULL,
	"signed_at" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "family_agreements_family_id_unique" UNIQUE("family_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"module" text,
	"audience" text DEFAULT 'parent' NOT NULL,
	"age_range" text,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text NOT NULL,
	"sections" jsonb,
	"interactive_activity" jsonb,
	"scenarios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parent_discussion_prompts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"action_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completion_criteria" text,
	"badge_id" text,
	"estimated_minutes" integer DEFAULT 10 NOT NULL,
	"key_takeaways" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"has_quiz" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'parent' NOT NULL,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"family_id" text,
	"has_completed_onboarding" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"question" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"completed_lessons" text[] DEFAULT '{}' NOT NULL,
	"completed_quizzes" text[] DEFAULT '{}' NOT NULL,
	"course_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_challenges" text[] DEFAULT '{}' NOT NULL,
	"active_challenges" text[] DEFAULT '{}' NOT NULL,
	"earned_badges" text[] DEFAULT '{}' NOT NULL,
	"assessment_score" integer,
	"assessment_completed_at" text,
	"assessment_results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"challenge_steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"weekly_tip_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_parent_id_profiles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_agreements" ADD CONSTRAINT "family_agreements_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "children_family_id_idx" ON "children" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "courses_sort_order_idx" ON "courses" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "families_parent_id_idx" ON "families" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "lessons_course_id_idx" ON "lessons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "lessons_sort_order_idx" ON "lessons" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "password_reset_codes_user_id_idx" ON "password_reset_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_sort_order_idx" ON "quiz_questions" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "quizzes_lesson_id_idx" ON "quizzes" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");