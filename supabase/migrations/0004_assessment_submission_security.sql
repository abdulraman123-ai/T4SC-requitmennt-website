-- Enforce one final submission per application/component and keep answer keys server-only.
alter table public.assessment_submissions
  add column if not exists objective_score integer,
  add column if not exists objective_max integer,
  add column if not exists scoring_status text not null default 'pending_rubric_scoring',
  add column if not exists scoring_version text,
  add column if not exists submission_idempotency_key uuid;

alter table public.assessment_submissions
  drop constraint if exists assessment_submissions_scoring_status_check;
alter table public.assessment_submissions
  add constraint assessment_submissions_scoring_status_check
  check (scoring_status in ('objective_only','pending_rubric_scoring','technical_review_required'));

alter table public.assessment_submissions
  drop constraint if exists assessment_submissions_objective_score_check;
alter table public.assessment_submissions
  add constraint assessment_submissions_objective_score_check
  check (
    (objective_score is null and objective_max is null)
    or (objective_score is not null and objective_max is not null
        and objective_score >= 0 and objective_max > 0 and objective_score <= objective_max)
  );

-- No assessment submissions currently exist; this protects future rows without
-- deleting or rewriting applicant data.
create unique index if not exists assessment_submissions_one_per_component_idx
  on public.assessment_submissions(application_id, pathway);
create unique index if not exists assessment_submissions_idempotency_idx
  on public.assessment_submissions(application_id, submission_idempotency_key)
  where submission_idempotency_key is not null;

create table if not exists public.assessment_answer_keys (
  pathway text not null check (pathway in ('general','department')),
  level text not null check (level in ('shared','Beginner','Developing','Advanced')),
  question_id text not null,
  correct_value text not null check (correct_value in ('0','1','2','3')),
  key_version text not null,
  created_at timestamptz not null default now(),
  primary key (pathway, level, question_id)
);
alter table public.assessment_answer_keys enable row level security;
revoke all on public.assessment_answer_keys from anon, authenticated;
grant select on public.assessment_answer_keys to service_role;
