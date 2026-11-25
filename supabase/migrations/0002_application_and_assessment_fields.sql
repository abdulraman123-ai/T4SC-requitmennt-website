alter table public.applications
 add column if not exists preferred_name text,
 add column if not exists region text,
 add column if not exists alternative_contact text,
 add column if not exists secondary_interest text,
 add column if not exists why_department text,
 add column if not exists tools_topics text,
 add column if not exists problem_to_solve text,
 add column if not exists weekly_availability text,
 add column if not exists session_availability text,
 add column if not exists session_details text,
 add column if not exists device_access text,
 add column if not exists internet_access text,
 add column if not exists rules_accepted boolean not null default false,
 add column if not exists honesty_accepted boolean not null default false,
 add column if not exists accessibility_needs text;
update public.applications set preferred_name=full_name where preferred_name is null;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status in (
 'submitted','needs_review','general_screening','department_assessment','practical_task',
 'clarification','under_review','admitted','conditional_foundation','waitlisted',
 'not_selected','withdrawn','onboarding','active_member'
));
create index if not exists applications_reference_email_idx on public.applications(reference,email);
create index if not exists applications_department_level_idx on public.applications(department,assessment_level);
create index if not exists applications_status_created_idx on public.applications(status,created_at desc);

alter table public.applications add column if not exists privacy_accepted boolean not null default false;
