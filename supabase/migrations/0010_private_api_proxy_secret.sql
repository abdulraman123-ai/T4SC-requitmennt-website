-- Private server-to-server credential for the Next.js API proxy.
-- The raw credential is stored only in Vercel Sensitive env; the database
-- stores only its SHA-256 digest. The Edge Function can read the digest
-- through its service role; browser roles cannot read this table.
create table if not exists public.private_system_secrets (
  secret_name text primary key,
  secret_sha256 text not null
    check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.private_system_secrets enable row level security;
revoke all on public.private_system_secrets from anon, authenticated;
grant select on public.private_system_secrets to service_role;
