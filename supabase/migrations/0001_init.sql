-- Digital Village — Supabase schema
-- Safe to run multiple times (IF NOT EXISTS guards).
-- RLS is intentionally left disabled on these tables (RLS policies are out of
-- scope for this migration). The app authenticates users via Supabase Auth and
-- accesses these tables with the anon key.
--
-- Note on id types: family / children / agreement ids are TEXT so the mobile
-- app can use the same client-generated id scheme in both Supabase mode and the
-- offline AsyncStorage fallback. profiles.id and user_progress.user_id are uuids
-- because they mirror auth.users.id.

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user (id == auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'parent',
  subscription_tier text not null default 'free',
  family_id text,
  has_completed_onboarding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- families: a family unit, created by a parent (parent_id == auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id text primary key,
  name text not null default 'My Family',
  parent_id text,
  created_at timestamptz not null default now()
);

create index if not exists families_parent_id_idx on public.families (parent_id);

-- ---------------------------------------------------------------------------
-- children: children belonging to a family (age band only, no exact age)
-- ---------------------------------------------------------------------------
create table if not exists public.children (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  name text not null default '',
  age_band text not null default '10-13',
  created_at timestamptz not null default now()
);

create index if not exists children_family_id_idx on public.children (family_id);

-- ---------------------------------------------------------------------------
-- user_progress: learning + engagement progress, one row per user
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completed_lessons text[] not null default '{}',
  completed_quizzes text[] not null default '{}',
  course_progress jsonb not null default '{}'::jsonb,
  completed_challenges text[] not null default '{}',
  active_challenges text[] not null default '{}',
  earned_badges text[] not null default '{}',
  assessment_score integer,
  assessment_completed_at timestamptz,
  weekly_tip_index integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- family_agreements: the family technology agreement, one row per family
-- ---------------------------------------------------------------------------
create table if not exists public.family_agreements (
  id text primary key,
  family_id text not null references public.families (id) on delete cascade,
  rules jsonb not null default '[]'::jsonb,
  custom_rules text[] not null default '{}',
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id)
);

-- Ensure PostgREST picks up the new tables immediately.
notify pgrst, 'reload schema';
