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
