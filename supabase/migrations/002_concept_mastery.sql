-- Concept mastery.
--
-- Run once in the Supabase SQL editor. Idempotent, and touches nothing else.
--
-- One row per user per concept. The five stages are stored; the
-- proficiency label is NOT — it is derived in
-- src/lib/progress/mastery.ts, so it cannot drift out of step with the
-- stages it summarises.

create table if not exists public.concept_mastery (
  user_id         uuid not null references auth.users(id) on delete cascade,
  concept_id      text not null,
  recognise       boolean not null default false,
  explain         boolean not null default false,
  predict         boolean not null default false,
  implement       boolean not null default false,
  reason          boolean not null default false,
  last_reviewed_at date,
  next_review_at   date,
  updated_at      timestamptz not null default now(),
  primary key (user_id, concept_id)
);

-- The review queue reads "what is due"; without this it is a full scan
-- of every concept the user has ever touched.
create index if not exists concept_mastery_due_idx
  on public.concept_mastery (user_id, next_review_at);

alter table public.concept_mastery enable row level security;

drop policy if exists concept_mastery_owner on public.concept_mastery;
create policy concept_mastery_owner on public.concept_mastery
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
