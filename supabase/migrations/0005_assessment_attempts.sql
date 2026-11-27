-- Server-owned assessment attempt lifecycle and confirmed response checkpoints.
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  pathway text not null,
  level text not null check (level in ('Beginner','Developing','Advanced')),
  attempt_number smallint not null default 1 check (attempt_number = 1),
  status text not null default 'active'
    check (status in ('active','submitted','expired','technical_review','voided')),
  idempotency_key uuid not null,
  attempt_token_hash text not null,
  response jsonb not null default '{}'::jsonb,
  response_version bigint not null default 0 check (response_version >= 0),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_token_hash_length check (length(attempt_token_hash) = 64),
  constraint assessment_attempts_response_size check (pg_column_size(response) <= 200000)
);

create unique index if not exists assessment_attempts_one_official_attempt_idx
  on public.assessment_attempts(application_id, pathway);
create unique index if not exists assessment_attempts_idempotency_idx
  on public.assessment_attempts(application_id, idempotency_key);

create index if not exists assessment_attempts_status_started_idx
  on public.assessment_attempts(status, started_at);

alter table public.assessment_attempts enable row level security;
revoke all on public.assessment_attempts from anon, authenticated;
grant select, insert, update, delete on public.assessment_attempts to service_role;
