create table if not exists public.reviewer_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  previous_status text not null,
  new_status text not null check (new_status in (
    'needs_review', 'general_screening', 'department_assessment',
    'practical_task', 'clarification', 'under_review'
  )),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists reviewer_status_history_application_created_idx
  on public.reviewer_status_history (application_id, created_at desc);

alter table public.reviewer_status_history enable row level security;
revoke all on table public.reviewer_status_history from public, anon, authenticated;
grant select, insert, update, delete on table public.reviewer_status_history to service_role;

create or replace function public.t4sc_update_application_review_status(
  p_application_id uuid,
  p_reviewer_id uuid,
  p_new_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text;
  v_previous text;
  v_updated_at timestamptz;
  v_history_id uuid;
begin
  select rm.role into v_role
    from public.reviewer_memberships rm
   where rm.user_id = p_reviewer_id and rm.is_active = true;

  if v_role is distinct from 'admissions_admin' then
    raise exception 'admissions_admin role is required';
  end if;

  if p_new_status not in (
    'needs_review', 'general_screening', 'department_assessment',
    'practical_task', 'clarification', 'under_review'
  ) then
    raise exception 'invalid non-final review status';
  end if;

  if p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) < 1
     or pg_catalog.char_length(p_reason) > 1000 then
    raise exception 'a review reason of 1 to 1000 characters is required';
  end if;

  select a.status into v_previous
    from public.applications a where a.id = p_application_id for update;
  if not found then raise exception 'application not found'; end if;

  if v_previous in ('admitted', 'conditional_foundation', 'waitlisted', 'not_selected',
                    'withdrawn', 'onboarding', 'active_member') then
    raise exception 'final or closed application states cannot be changed by this review action';
  end if;

  update public.applications
     set status = p_new_status, updated_at = pg_catalog.now()
   where id = p_application_id returning updated_at into v_updated_at;

  insert into public.reviewer_status_history (
    application_id, previous_status, new_status, reviewer_id, reason
  ) values (
    p_application_id, v_previous, p_new_status, p_reviewer_id, pg_catalog.btrim(p_reason)
  ) returning id into v_history_id;

  return pg_catalog.jsonb_build_object(
    'application_id', p_application_id, 'previous_status', v_previous,
    'new_status', p_new_status, 'updated_at', v_updated_at, 'history_id', v_history_id
  );
end;
$function$;

revoke all on function public.t4sc_update_application_review_status(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.t4sc_update_application_review_status(uuid, uuid, text, text)
  to service_role;
