-- Sift schema. Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

create table if not exists public.tracked_repos (
  workspace  text        not null,
  repo       text        not null check (repo ~ '^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$'),
  added_at   timestamptz not null default now(),
  primary key (workspace, repo)
);

create table if not exists public.digests (
  id             uuid        primary key default gen_random_uuid(),
  workspace      text        not null,
  generated_at   timestamptz not null default now(),
  items_count    int         not null default 0,
  critical_count int         not null default 0,
  payload        jsonb       not null
);

create index if not exists digests_workspace_generated_idx
  on public.digests (workspace, generated_at desc);

-- Lock both tables down: with RLS on and no policies, the public anon key can read/write nothing.
-- Sift only accesses them from the server with the service-role key, which bypasses RLS.
alter table public.tracked_repos enable row level security;
alter table public.digests       enable row level security;
