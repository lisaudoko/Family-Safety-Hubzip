// TypeScript types mirroring the Supabase schema in supabase/migrations/0001_init.sql.
// These describe the row shapes returned by the Supabase REST API.

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: "parent" | "child";
  subscription_tier: "free" | "premium";
  family_id: string | null;
  has_completed_onboarding: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FamilyRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
}

export interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  age_band: string;
  created_at?: string;
}

export interface UserProgressRow {
  user_id: string;
  completed_lessons: string[];
  completed_quizzes: string[];
  course_progress: Record<string, number>;
  completed_challenges: string[];
  active_challenges: string[];
  earned_badges: string[];
  assessment_score: number | null;
  assessment_completed_at: string | null;
  weekly_tip_index: number;
  updated_at?: string;
}

export interface AgreementRuleJson {
  id: string;
  category: string;
  rule: string;
  enabled: boolean;
}

export interface FamilyAgreementRow {
  id: string;
  family_id: string;
  rules: AgreementRuleJson[];
  custom_rules: string[];
  signed_at: string | null;
  created_at?: string;
}

export interface SupabaseSchema {
  profiles: ProfileRow;
  families: FamilyRow;
  children: ChildRow;
  user_progress: UserProgressRow;
  family_agreements: FamilyAgreementRow;
}
