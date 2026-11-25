create extension if not exists pgcrypto;
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('T4SC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
 full_name text not null,
 email text not null,
 country text not null,
 department text not null check (department in ('AI & Machine Learning','Game Development','Full Stack Development & System Architecture','Cybersecurity & Systems Security')),
 assessment_level text not null check (assessment_level in ('Beginner','Developing','Advanced')),
 motivation text not null,
 experience text not null default '',
 weekly_commitment text,
 status text not null default 'submitted' check (status in ('submitted','assessment_pending','under_review','admitted','conditional','waitlisted','not_selected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.assessment_submissions (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.applications(id) on delete cascade,
 pathway text not null,
 level text not null check (level in ('Beginner','Developing','Advanced')),
 answers jsonb not null default '{}'::jsonb,
 score numeric(5,2),
 reviewer_feedback text,
 submitted_at timestamptz not null default now()
);
create table if not exists public.reviewer_notes (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.applications(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id) on delete cascade,
 note text not null,
 created_at timestamptz not null default now()
);
alter table public.applications enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.reviewer_notes enable row level security;
revoke all on public.applications from anon, authenticated;
revoke all on public.assessment_submissions from anon, authenticated;
revoke all on public.reviewer_notes from anon, authenticated;
-- Public application inserts are performed by the server route using a dedicated server-side key.
-- Reviewer access must be granted only after an explicit reviewer-role policy is installed.
