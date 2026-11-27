-- Link new application records to the verified Supabase Auth identity.
-- Nullable for legacy applications created before applicant accounts.
alter table public.applications
  add column if not exists auth_user_id uuid references auth.users(id) on delete restrict;

create index if not exists applications_auth_user_id_created_idx
  on public.applications(auth_user_id, created_at desc)
  where auth_user_id is not null;

comment on column public.applications.auth_user_id is
  'Verified Supabase Auth user who owns this application. Null only for legacy pre-account records until verified claim.';
