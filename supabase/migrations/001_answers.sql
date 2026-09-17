-- Saved answers.
--
-- Run this once in the Supabase SQL editor if your project was created
-- before this table existed. It is idempotent -- running it twice is
-- harmless, and it touches nothing else in the schema.

create table if not exists public.answers (
  user_id     uuid not null references auth.users(id) on delete cascade,
  ref         text not null,
  body        text not null,
  verdict     text check (verdict in ('strong', 'partial', 'off-track')),
  feedback    text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, ref)
);

alter table public.answers enable row level security;

drop policy if exists answers_owner on public.answers;
create policy answers_owner on public.answers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
