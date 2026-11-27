-- Keep the legacy application status aligned with a formal offer acceptance.
-- This lets the existing private community-access gate recognize the accepted member.
create or replace function public.t4sc_respond_to_admission_offer(
  p_offer_id uuid,
  p_application_id uuid,
  p_response text
)
returns public.admission_offers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offer public.admission_offers%rowtype;
  v_state public.application_admissions%rowtype;
  v_now timestamptz := now();
begin
  if p_response not in ('accept','decline') then
    raise exception 'Offer response must be accept or decline.';
  end if;

  select * into v_offer from public.admission_offers
  where id=p_offer_id and application_id=p_application_id for update;
  if not found then raise exception 'Offer not found.'; end if;
  if v_offer.status <> 'offered' then raise exception 'This offer has already been resolved.'; end if;

  select * into v_state from public.application_admissions
  where application_id=p_application_id for update;
  if not found then raise exception 'Admissions state not found.'; end if;

  if v_now >= v_offer.expires_at then
    update public.admission_offers
    set status='expired',resolved_at=v_now,updated_at=v_now
    where id=v_offer.id returning * into v_offer;

    update public.application_admissions
    set status='offer_expired',reason_codes=array['offer_response_deadline_elapsed'],
        last_evaluated_at=v_now,updated_at=v_now
    where application_id=p_application_id;

    insert into public.admissions_decision_events(
      application_id,cycle_id,previous_status,new_status,department,reason_codes,
      ruleset_version,score_snapshot,actor_type
    ) values (
      p_application_id,v_offer.cycle_id,'admission_given','offer_expired',
      v_offer.department,array['offer_response_deadline_elapsed'],
      v_offer.ruleset_version,v_offer.score_snapshot,'system'
    );
    return v_offer;
  end if;

  update public.admission_offers
  set status=case when p_response='accept' then 'accepted' else 'declined' end,
      responded_at=v_now,resolved_at=v_now,updated_at=v_now
  where id=v_offer.id returning * into v_offer;

  update public.application_admissions
  set status=case when p_response='accept' then 'offer_accepted' else 'offer_declined' end,
      reason_codes=array[case when p_response='accept' then 'applicant_accepted_offer' else 'applicant_declined_offer' end],
      last_evaluated_at=v_now,updated_at=v_now
  where application_id=p_application_id;

  if p_response='accept' then
    update public.applications
    set status='admitted',updated_at=v_now
    where id=p_application_id;
  end if;

  insert into public.admissions_decision_events(
    application_id,cycle_id,previous_status,new_status,department,reason_codes,
    ruleset_version,score_snapshot,actor_type
  ) values (
    p_application_id,v_offer.cycle_id,'admission_given',
    case when p_response='accept' then 'offer_accepted' else 'offer_declined' end,
    v_offer.department,
    array[case when p_response='accept' then 'applicant_accepted_offer' else 'applicant_declined_offer' end],
    v_offer.ruleset_version,v_offer.score_snapshot,'system'
  );

  return v_offer;
end;
$$;

revoke all on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) to service_role;
