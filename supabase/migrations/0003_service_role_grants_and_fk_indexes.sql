grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.applications,
  public.assessment_submissions,
  public.reviewer_notes
to service_role;

create index if not exists assessment_submissions_application_id_idx
  on public.assessment_submissions(application_id);
create index if not exists reviewer_notes_application_id_idx
  on public.reviewer_notes(application_id);
create index if not exists reviewer_notes_reviewer_id_idx
  on public.reviewer_notes(reviewer_id);
