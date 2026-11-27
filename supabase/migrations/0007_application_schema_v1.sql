-- Fields and version markers for the founder-approved application schema.
alter table public.applications
  add column if not exists learning_goals text,
  add column if not exists work_sample_url text,
  add column if not exists application_schema_version text,
  add column if not exists declaration_version text,
  add column if not exists privacy_notice_version text;

alter table public.applications
  drop constraint if exists applications_work_sample_https_check;
alter table public.applications
  add constraint applications_work_sample_https_check
  check (
    work_sample_url is null
    or (
      length(work_sample_url) <= 2048
      and work_sample_url ~* '^https://[^[:space:]]+$'
    )
  );
