-- ===================================================================
-- Android Academy — Supabase schema
--
-- Mirrors src/lib/types.ts one for one, so implementing the three
-- methods in SupabaseProgressRepository is the whole integration.
--
-- Content (questions, lessons, modules, the study plan) stays in the
-- repository as typed TypeScript: it is versioned with the code,
-- reviewable in a pull request, and needs no round trip to render.
-- Only per-user state lives here.
-- ===================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------
-- Profiles
-- -------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null default 'Engineer',
  handle                text unique,
  role                  text,
  goal                  text,
  daily_target_minutes  int  not null default 120,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      -- Email/password sign-up carries no name, so derive one from the
      -- local part rather than greeting everybody as "Engineer".
      initcap(split_part(coalesce(new.email, ''), '@', 1)),
      'Engineer'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------
-- Question attempts
-- -------------------------------------------------------------------
create table if not exists public.question_attempts (
  user_id         uuid not null references auth.users(id) on delete cascade,
  question_slug   text not null,
  attempts        int  not null default 1,
  solved          boolean not null default false,
  last_correct    boolean,
  passed_tests    int,
  total_tests     int,
  last_runtime_ms int,
  code            text,
  updated_at      timestamptz not null default now(),
  primary key (user_id, question_slug)
);

create index if not exists question_attempts_user_solved_idx
  on public.question_attempts (user_id, solved);

-- -------------------------------------------------------------------
-- Bookmarks
-- -------------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  ref         text not null,
  kind        text not null check (kind in ('question', 'lesson')),
  created_at  timestamptz not null default now(),
  primary key (user_id, ref)
);

-- -------------------------------------------------------------------
-- Notes
-- -------------------------------------------------------------------
create table if not exists public.notes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  ref         text not null,
  body        text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, ref)
);

-- -------------------------------------------------------------------
-- Saved answers
--
-- The learner's own words for a free-text prompt, plus the cached grade
-- if they asked for one. Separate from `notes` because a note is
-- something you choose to write; this is the work itself.
-- -------------------------------------------------------------------
create table if not exists public.answers (
  user_id     uuid not null references auth.users(id) on delete cascade,
  ref         text not null,
  body        text not null,
  verdict     text check (verdict in ('strong', 'partial', 'off-track')),
  feedback    text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, ref)
);

-- -------------------------------------------------------------------
-- Concept mastery
--
-- The five stages are stored. The proficiency label is not: it is
-- derived in src/lib/progress/mastery.ts so the two cannot disagree.
-- -------------------------------------------------------------------
create table if not exists public.concept_mastery (
  user_id          uuid not null references auth.users(id) on delete cascade,
  concept_id       text not null,
  recognise        boolean not null default false,
  explain          boolean not null default false,
  predict          boolean not null default false,
  implement        boolean not null default false,
  reason           boolean not null default false,
  last_reviewed_at date,
  next_review_at   date,
  updated_at       timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create index if not exists concept_mastery_due_idx
  on public.concept_mastery (user_id, next_review_at);

-- -------------------------------------------------------------------
-- Lesson progress
-- -------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  lesson_id        text not null,
  completed_blocks text[] not null default '{}',
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- -------------------------------------------------------------------
-- Study sessions — one row per user per day
-- -------------------------------------------------------------------
create table if not exists public.study_sessions (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null,
  minutes  int  not null default 0 check (minutes >= 0),
  primary key (user_id, day)
);

create index if not exists study_sessions_user_day_idx
  on public.study_sessions (user_id, day desc);

-- -------------------------------------------------------------------
-- Streaks
--
-- Derivable from study_sessions, and stored anyway: the dashboard reads
-- it on every load, and recomputing a year of rows for that is waste.
-- Recompute it on write, not on read.
-- -------------------------------------------------------------------
create table if not exists public.streaks (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  current_streak    int  not null default 0,
  longest_streak    int  not null default 0,
  last_active_date  date,
  updated_at        timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- Row level security — every table is per-user and nothing is shared.
-- -------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.question_attempts enable row level security;
alter table public.bookmarks         enable row level security;
alter table public.notes             enable row level security;
alter table public.answers           enable row level security;
alter table public.concept_mastery   enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.study_sessions    enable row level security;
alter table public.streaks           enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'question_attempts', 'bookmarks', 'notes', 'answers', 'concept_mastery',
    'lesson_progress', 'study_sessions', 'streaks'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I', t || '_owner', t
    );
    execute format(
      'create policy %I on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t || '_owner', t
    );
  end loop;
end;
$$;

drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -------------------------------------------------------------------
-- Convenience: topic mastery is computed client-side from the seeded
-- question bank plus question_attempts, so there is no table for it.
-- Keeping derived values out of the database is what stops two figures
-- on the same screen disagreeing.
-- -------------------------------------------------------------------
