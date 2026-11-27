-- Private, versioned applicant-facing assessment bank content.
-- Bank records are never readable directly by anon/authenticated roles.
create table if not exists public.assessment_bank_content (
  pathway text not null,
  bank_version text not null,
  approval_status text not null default 'draft_not_approved'
    check (approval_status in ('draft_not_approved','approved','retired')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pathway, bank_version),
  constraint assessment_bank_content_size_check
    check (pg_column_size(content) <= 300000)
);
alter table public.assessment_bank_content enable row level security;
revoke all on public.assessment_bank_content from anon, authenticated;
grant select, insert, update, delete on public.assessment_bank_content to service_role;
