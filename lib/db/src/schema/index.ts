import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── profiles (users) ───────────────────────────────────────────────────────────
export const profilesTable = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    full_name: text("full_name").notNull(),
    password_hash: text("password_hash").notNull(),
    role: text("role").notNull().default("parent"),
    subscription_tier: text("subscription_tier").notNull().default("free"),
    family_id: text("family_id"),
    has_completed_onboarding: boolean("has_completed_onboarding")
      .notNull()
      .default(false),
    email_verified: boolean("email_verified").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("profiles_email_idx").on(t.email)],
);

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectProfileSchema = createSelectSchema(profilesTable);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;

// ── sessions ───────────────────────────────────────────────────────────────────
export const sessionsTable = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.user_id)],
);

export type Session = typeof sessionsTable.$inferSelect;

// ── password_reset_codes ────────────────────────────────────────────────────────
export const passwordResetCodesTable = pgTable(
  "password_reset_codes",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    code_hash: text("code_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    used_at: timestamp("used_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("password_reset_codes_user_id_idx").on(t.user_id)],
);

export type PasswordResetCode = typeof passwordResetCodesTable.$inferSelect;

// ── email_verification_codes ────────────────────────────────────────────────────
export const emailVerificationCodesTable = pgTable(
  "email_verification_codes",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    code_hash: text("code_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    used_at: timestamp("used_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("email_verification_codes_user_id_idx").on(t.user_id)],
);

export type EmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;

// ── families ───────────────────────────────────────────────────────────────────
export const familiesTable = pgTable(
  "families",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parent_id: text("parent_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("families_parent_id_idx").on(t.parent_id)],
);

export const insertFamilySchema = createInsertSchema(familiesTable).omit({
  created_at: true,
});
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof familiesTable.$inferSelect;

// ── children ───────────────────────────────────────────────────────────────────
export const childrenTable = pgTable(
  "children",
  {
    id: text("id").primaryKey(),
    family_id: text("family_id")
      .notNull()
      .references(() => familiesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    age_band: text("age_band").notNull().default("10-13"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("children_family_id_idx").on(t.family_id)],
);

export const insertChildSchema = createInsertSchema(childrenTable).omit({
  created_at: true,
});
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof childrenTable.$inferSelect;

// ── user_progress ──────────────────────────────────────────────────────────────
export const userProgressTable = pgTable("user_progress", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  completed_lessons: text("completed_lessons").array().notNull().default([]),
  completed_quizzes: text("completed_quizzes").array().notNull().default([]),
  course_progress: jsonb("course_progress").$type<Record<string, number>>().notNull().default({}),
  completed_challenges: text("completed_challenges").array().notNull().default([]),
  active_challenges: text("active_challenges").array().notNull().default([]),
  earned_badges: text("earned_badges").array().notNull().default([]),
  assessment_score: integer("assessment_score"),
  assessment_completed_at: text("assessment_completed_at"),
  assessment_results: jsonb("assessment_results").$type<Record<string, unknown>>().notNull().default({}),
  challenge_steps: jsonb("challenge_steps").$type<Record<string, number[]>>().notNull().default({}),
  weekly_tip_index: integer("weekly_tip_index").notNull().default(0),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type UserProgress = typeof userProgressTable.$inferSelect;

// ── family_agreements ──────────────────────────────────────────────────────────
export const familyAgreementsTable = pgTable("family_agreements", {
  id: text("id").primaryKey(),
  family_id: text("family_id")
    .notNull()
    .unique()
    .references(() => familiesTable.id, { onDelete: "cascade" }),
  rules: jsonb("rules").$type<unknown[]>().notNull().default([]),
  custom_rules: text("custom_rules").array().notNull().default([]),
  signed_at: text("signed_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type FamilyAgreement = typeof familyAgreementsTable.$inferSelect;

// ── badges ─────────────────────────────────────────────────────────────────────
export const badgesTable = pgTable("badges", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon_name: text("icon_name").notNull(),
  color: text("color").notNull(),
  condition: text("condition").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBadgeSchema = createInsertSchema(badgesTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectBadgeSchema = createSelectSchema(badgesTable);
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badgesTable.$inferSelect;

// ── weekly tips ──────────────────────────────────────────────────────────────
export const weeklyTipsTable = pgTable(
  "weekly_tips",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(),
    icon_name: text("icon_name").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("weekly_tips_sort_order_idx").on(t.sort_order)],
);

export const insertWeeklyTipSchema = createInsertSchema(weeklyTipsTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectWeeklyTipSchema = createSelectSchema(weeklyTipsTable);
export type InsertWeeklyTip = z.infer<typeof insertWeeklyTipSchema>;
export type WeeklyTipRow = typeof weeklyTipsTable.$inferSelect;

// ── courses ────────────────────────────────────────────────────────────────────
export const coursesTable = pgTable(
  "courses",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    duration: text("duration").notNull(),
    level: text("level").notNull().default("beginner"),
    icon_name: text("icon_name").notNull(),
    color: text("color").notNull(),
    is_premium: boolean("is_premium").notNull().default(false),
    audience: text("audience").notNull().default("parent"),
    sort_order: integer("sort_order").notNull().default(0),
    is_published: boolean("is_published").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("courses_sort_order_idx").on(t.sort_order)],
);

export const insertCourseSchema = createInsertSchema(coursesTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectCourseSchema = createSelectSchema(coursesTable);
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;

// ── lessons ────────────────────────────────────────────────────────────────────
export const lessonsTable = pgTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    course_id: text("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    sort_order: integer("sort_order").notNull().default(0),
    title: text("title").notNull(),
    module: text("module"),
    audience: text("audience").notNull().default("parent"),
    age_range: text("age_range"),
    difficulty: text("difficulty").notNull().default("beginner"),
    learning_objectives: jsonb("learning_objectives").$type<string[]>().notNull().default([]),
    content: text("content").notNull(),
    sections: jsonb("sections").$type<unknown[]>(),
    interactive_activity: jsonb("interactive_activity").$type<{
      type: string;
      prompt: string;
      instructions: string;
    } | null>(),
    scenarios: jsonb("scenarios")
      .$type<
        {
          title: string;
          situation: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }[]
      >()
      .notNull()
      .default([]),
    parent_discussion_prompts: jsonb("parent_discussion_prompts").$type<string[]>().notNull().default([]),
    action_steps: jsonb("action_steps").$type<string[]>().notNull().default([]),
    completion_criteria: text("completion_criteria"),
    badge_id: text("badge_id").references(() => badgesTable.id),
    estimated_minutes: integer("estimated_minutes").notNull().default(10),
    key_takeaways: jsonb("key_takeaways").$type<string[]>().notNull().default([]),
    has_quiz: boolean("has_quiz").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("lessons_course_id_idx").on(t.course_id),
    index("lessons_sort_order_idx").on(t.sort_order),
  ],
);

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectLessonSchema = createSelectSchema(lessonsTable);
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;

// ── quizzes ────────────────────────────────────────────────────────────────────
export const quizzesTable = pgTable(
  "quizzes",
  {
    id: text("id").primaryKey(),
    lesson_id: text("lesson_id")
      .notNull()
      .unique()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("quizzes_lesson_id_idx").on(t.lesson_id)],
);

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({
  created_at: true,
  updated_at: true,
});
export const selectQuizSchema = createSelectSchema(quizzesTable);
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

// ── quiz_questions ─────────────────────────────────────────────────────────────
export const quizQuestionsTable = pgTable(
  "quiz_questions",
  {
    id: text("id").primaryKey(),
    quiz_id: text("quiz_id")
      .notNull()
      .references(() => quizzesTable.id, { onDelete: "cascade" }),
    sort_order: integer("sort_order").notNull().default(0),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    correct_index: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
  },
  (t) => [
    index("quiz_questions_quiz_id_idx").on(t.quiz_id),
    index("quiz_questions_sort_order_idx").on(t.sort_order),
  ],
);

export const insertQuizQuestionSchema = createInsertSchema(quizQuestionsTable);
export const selectQuizQuestionSchema = createSelectSchema(quizQuestionsTable);
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestionsTable.$inferSelect;
