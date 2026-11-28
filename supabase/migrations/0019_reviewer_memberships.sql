create table if not exists public.reviewer_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('reviewer', 'admissions_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists reviewer_memberships_active_role_idx
  on public.reviewer_memberships (role, is_active);

alter table public.reviewer_memberships enable row level security;
revoke all on table public.reviewer_memberships from public, anon, authenticated;
grant select, insert, update, delete on table public.reviewer_memberships to service_role;
