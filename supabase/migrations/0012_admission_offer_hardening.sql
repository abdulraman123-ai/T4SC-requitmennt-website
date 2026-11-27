-- Harden offer issuance: constrain privileged routines to a trusted search path
-- and require the cycle and applicant recommendation to use the same ruleset.
alter function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb)
  set search_path = public, pg_temp;
alter function public.t4sc_respond_to_admission_offer(uuid,uuid,text)
  set search_path = public, pg_temp;
alter function public.t4sc_expire_admission_offers(uuid)
  set search_path = public, pg_temp;

create or replace function public.t4sc_issue_admission_offer(
  p_application_id uuid,p_cycle_id uuid,p_department text,p_ruleset_version text,
  p_score_snapshot jsonb default '{}'::jsonb
)
returns public.admission_offers
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cycle public.admission_cycles%rowtype;
  v_state public.application_admissions%rowtype;
  v_offer public.admission_offers%rowtype;
  v_now timestamptz := now();
  v_local_day date;
  v_cycle_day integer;
  v_expiry timestamptz;
  v_cycle_end timestamptz;
begin
  if p_department not in (
    'AI & Machine Learning','Game Development',
    'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
  ) then raise exception 'Invalid offer department.'; end if;

  select * into v_cycle from public.admission_cycles where id=p_cycle_id for update;
  if not found or v_cycle.status <> 'active' then raise exception 'The admissions cycle is not active.'; end if;

  v_local_day := (v_now at time zone v_cycle.cycle_timezone)::date;
  v_cycle_day := (v_local_day - v_cycle.starts_on) + 1;
  if v_cycle_day < 1 or v_cycle_day > 13 then
    raise exception 'Formal offers must be issued by the end of Day 13.';
  end if;

  v_expiry := v_now + interval '48 hours';
  v_cycle_end := ((v_cycle.ends_on + 1)::timestamp at time zone v_cycle.cycle_timezone);
  if v_expiry > v_cycle_end then
    raise exception 'The full 48-hour response window must fit inside the 15-day cycle.';
  end if;

  select * into v_state from public.application_admissions
  where application_id=p_application_id for update;
  if not found
    or v_state.status <> 'recommended_for_admission'
    or v_state.active_department is distinct from p_department
    or v_state.cycle_id is distinct from p_cycle_id
    or v_state.ruleset_version is distinct from p_ruleset_version
    or v_cycle.ruleset_version is distinct from p_ruleset_version then
    raise exception 'A matching Recommended for Admission record and cycle ruleset are required before an offer can be issued.';
  end if;

  insert into public.admission_offers(
    application_id,cycle_id,department,status,ruleset_version,issued_cycle_day,
    issued_at,expires_at,score_snapshot
  ) values (
    p_application_id,p_cycle_id,p_department,'offered',p_ruleset_version,v_cycle_day,
    v_now,v_expiry,coalesce(p_score_snapshot,'{}'::jsonb)
  ) returning * into v_offer;

  update public.application_admissions
  set status='admission_given',reason_codes=array['formal_offer_issued'],
      last_evaluated_at=v_now,updated_at=v_now
  where application_id=p_application_id;

  insert into public.admissions_decision_events(
    application_id,cycle_id,previous_status,new_status,department,reason_codes,
    ruleset_version,score_snapshot,actor_type
  ) values (
    p_application_id,p_cycle_id,'recommended_for_admission','admission_given',
    p_department,array['formal_offer_issued'],p_ruleset_version,
    coalesce(p_score_snapshot,'{}'::jsonb),'system'
  );
  return v_offer;
end;
$$;

revoke all on function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.t4sc_expire_admission_offers(uuid) from public,anon,authenticated;
grant execute on function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) to service_role;
grant execute on function public.t4sc_expire_admission_offers(uuid) to service_role;
