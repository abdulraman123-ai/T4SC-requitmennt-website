-- T4SC admissions runtime ledger. Additive migration; no applicant rows are backfilled.
-- Every table is service-role-only. New admission decisions remain gated in the
-- application layer until rubric evaluators and experience-route calibration pass validation.

create table if not exists public.admission_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_name text not null,
  cycle_timezone text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','closed')),
  ruleset_version text not null,
  schedule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(cycle_name)) between 1 and 120),
  check (length(trim(cycle_timezone)) between 1 and 80),
  check (ends_on = starts_on + 14),
  check (pg_column_size(schedule_config) <= 50000)
);
create unique index if not exists admission_cycles_one_active_idx
  on public.admission_cycles(status) where status = 'active';
alter table public.admission_cycles enable row level security;
revoke all on public.admission_cycles from anon, authenticated;
grant select, insert, update, delete on public.admission_cycles to service_role;

create table if not exists public.assessment_score_records (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  pathway text not null,
  department text,
  experience_route text,
  score_status text not null default 'pending'
    check (score_status in ('pending','scored','technical_review_required')),
  raw_score numeric(8,3),
  raw_maximum numeric(8,3),
  weighted_score numeric(9,5),
  weighted_maximum numeric(9,5),
  criterion_scores jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(8,7),
  bank_version text,
  rubric_version text,
  evaluator_version text,
  ruleset_version text,
  failure_code text,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pathway in ('general','learning_potential') or pathway like 'department:%' or pathway like 'practical:%'),
  check (experience_route is null or experience_route in ('Beginner','Developing','Experienced','Advanced')),
  check (confidence is null or confidence between 0 and 1),
  check (pg_column_size(criterion_scores) <= 100000 and pg_column_size(evidence) <= 100000),
  check (
    (score_status = 'scored'
      and raw_score is not null and raw_maximum is not null
      and weighted_score is not null and weighted_maximum is not null
      and raw_score >= 0 and raw_maximum > 0 and raw_score <= raw_maximum
      and weighted_score >= 0 and weighted_maximum > 0 and weighted_score <= weighted_maximum
      and evaluator_version is not null and rubric_version is not null and scored_at is not null)
    or
    (score_status <> 'scored'
      and raw_score is null and raw_maximum is null
      and weighted_score is null and weighted_maximum is null and scored_at is null)
  ),
  unique (application_id, pathway)
);
create index if not exists assessment_score_records_status_updated_idx
  on public.assessment_score_records(score_status, updated_at);
alter table public.assessment_score_records enable row level security;
revoke all on public.assessment_score_records from anon, authenticated;
grant select, insert, update, delete on public.assessment_score_records to service_role;

create table if not exists public.application_admissions (
  application_id uuid primary key references public.applications(id) on delete cascade,
  cycle_id uuid references public.admission_cycles(id) on delete restrict,
  status text not null default 'application_received'
    check (status in (
      'application_received','initial_screening','automated_scoring_pending',
      'technical_review_required','validation_pending','initial_gate_not_met',
      'admission_in_progress','screening_in_progress','primary_department_not_qualified',
      'alternative_assessment_pending','alternative_department_transfer_opportunity',
      'recommended_for_admission','admission_given','offer_accepted','offer_declined',
      'offer_expired','not_admitted'
    )),
  primary_department text not null,
  alternative_department text,
  active_department text,
  experience_route text not null check (experience_route in ('Beginner','Developing','Experienced','Advanced')),
  ruleset_version text not null,
  primary_score_snapshot jsonb not null default '{}'::jsonb,
  alternative_score_snapshot jsonb not null default '{}'::jsonb,
  reason_codes text[] not null default '{}',
  evaluator_validation_version text,
  route_calibration_version text,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (primary_department in (
    'AI & Machine Learning','Game Development',
    'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
  )),
  check (alternative_department is null or (
    alternative_department in (
      'AI & Machine Learning','Game Development',
      'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
    ) and alternative_department <> primary_department
  )),
  check (active_department is null or active_department in (
    'AI & Machine Learning','Game Development',
    'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
  )),
  check (pg_column_size(primary_score_snapshot) <= 50000 and pg_column_size(alternative_score_snapshot) <= 50000)
);
create index if not exists application_admissions_cycle_status_idx
  on public.application_admissions(cycle_id, status, updated_at);
alter table public.application_admissions enable row level security;
revoke all on public.application_admissions from anon, authenticated;
grant select, insert, update, delete on public.application_admissions to service_role;

create table if not exists public.admissions_decision_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  cycle_id uuid references public.admission_cycles(id) on delete restrict,
  previous_status text,
  new_status text not null,
  department text,
  reason_codes text[] not null default '{}',
  ruleset_version text not null,
  bank_versions jsonb not null default '{}'::jsonb,
  evaluator_versions jsonb not null default '{}'::jsonb,
  score_snapshot jsonb not null default '{}'::jsonb,
  actor_type text not null default 'system'
    check (actor_type in ('system','scheduled_job','authorized_authority','technical_administrator')),
  actor_id uuid,
  correction_of_event_id uuid references public.admissions_decision_events(id) on delete restrict,
  correction_evidence text,
  created_at timestamptz not null default now(),
  check (department is null or department in (
    'AI & Machine Learning','Game Development',
    'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
  )),
  check (pg_column_size(bank_versions) <= 30000 and pg_column_size(evaluator_versions) <= 30000 and pg_column_size(score_snapshot) <= 50000),
  check (
    (correction_of_event_id is null and correction_evidence is null)
    or (correction_of_event_id is not null and length(trim(correction_evidence)) >= 20)
  )
);
create index if not exists admissions_decision_events_application_created_idx
  on public.admissions_decision_events(application_id, created_at desc);
alter table public.admissions_decision_events enable row level security;
revoke all on public.admissions_decision_events from anon, authenticated;
grant select, insert on public.admissions_decision_events to service_role;

create or replace function public.prevent_admissions_event_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Admissions decision events are append-only; write a correction event instead.';
end;
$$;
drop trigger if exists admissions_decision_events_immutable on public.admissions_decision_events;
create trigger admissions_decision_events_immutable
before update or delete on public.admissions_decision_events
for each row execute function public.prevent_admissions_event_mutation();

create table if not exists public.admission_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  cycle_id uuid not null references public.admission_cycles(id) on delete restrict,
  department text not null,
  status text not null default 'offered' check (status in ('offered','accepted','declined','expired')),
  ruleset_version text not null,
  issued_cycle_day smallint not null check (issued_cycle_day between 1 and 13),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  responded_at timestamptz,
  resolved_at timestamptz,
  score_snapshot jsonb not null default '{}'::jsonb,
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (department in (
    'AI & Machine Learning','Game Development',
    'Full Stack Development & System Architecture','Cybersecurity & Systems Security'
  )),
  check (expires_at = issued_at + interval '48 hours' and expires_at > issued_at),
  check (pg_column_size(score_snapshot) <= 50000),
  check (
    (status = 'offered' and responded_at is null and resolved_at is null)
    or (status in ('accepted','declined') and responded_at is not null and resolved_at is not null)
    or (status = 'expired' and responded_at is null and resolved_at is not null)
  ),
  unique (application_id)
);
create index if not exists admission_offers_pending_expiry_idx
  on public.admission_offers(expires_at) where status = 'offered';
alter table public.admission_offers enable row level security;
revoke all on public.admission_offers from anon, authenticated;
grant select, insert, update on public.admission_offers to service_role;

create or replace function public.t4sc_issue_admission_offer(
  p_application_id uuid,p_cycle_id uuid,p_department text,p_ruleset_version text,
  p_score_snapshot jsonb default '{}'::jsonb
)
returns public.admission_offers
language plpgsql security definer set search_path = public
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

create or replace function public.t4sc_respond_to_admission_offer(
  p_offer_id uuid,p_application_id uuid,p_response text
)
returns public.admission_offers
language plpgsql security definer set search_path = public
as $$
declare
  v_offer public.admission_offers%rowtype;
  v_state public.application_admissions%rowtype;
  v_now timestamptz := now();
  v_new_status text;
begin
  if p_response not in ('accept','decline') then raise exception 'Offer response must be accept or decline.'; end if;

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

  v_new_status := case when p_response='accept' then 'accepted' else 'declined' end;
  update public.admission_offers
  set status=v_new_status,responded_at=v_now,resolved_at=v_now,updated_at=v_now
  where id=v_offer.id returning * into v_offer;

  update public.application_admissions
  set status=case when p_response='accept' then 'offer_accepted' else 'offer_declined' end,
      reason_codes=array[case when p_response='accept' then 'applicant_accepted_offer' else 'applicant_declined_offer' end],
      last_evaluated_at=v_now,updated_at=v_now
  where application_id=p_application_id;

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

create or replace function public.t4sc_expire_admission_offers(p_cycle_id uuid default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_offer public.admission_offers%rowtype;
  v_count integer := 0;
  v_now timestamptz := now();
begin
  for v_offer in
    select * from public.admission_offers
    where status='offered' and expires_at <= v_now
      and (p_cycle_id is null or cycle_id=p_cycle_id)
    order by expires_at for update skip locked
  loop
    update public.admission_offers
    set status='expired',resolved_at=v_now,updated_at=v_now
    where id=v_offer.id;

    update public.application_admissions
    set status='offer_expired',reason_codes=array['offer_response_deadline_elapsed'],
        last_evaluated_at=v_now,updated_at=v_now
    where application_id=v_offer.application_id;

    insert into public.admissions_decision_events(
      application_id,cycle_id,previous_status,new_status,department,reason_codes,
      ruleset_version,score_snapshot,actor_type
    ) values (
      v_offer.application_id,v_offer.cycle_id,'admission_given','offer_expired',
      v_offer.department,array['offer_response_deadline_elapsed'],
      v_offer.ruleset_version,v_offer.score_snapshot,'scheduled_job'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.t4sc_expire_admission_offers(uuid) from public,anon,authenticated;
grant execute on function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.t4sc_respond_to_admission_offer(uuid,uuid,text) to service_role;
grant execute on function public.t4sc_expire_admission_offers(uuid) to service_role;

comment on table public.assessment_score_records is
  'Server-only raw and weighted assessment scores with evaluator, rubric, bank and confidence provenance. Scoring failures remain pending/technical, never zero.';
comment on table public.application_admissions is
  'Server-only current admissions progression state; no row is created until the verified admissions worker evaluates an applicant.';
comment on table public.admissions_decision_events is
  'Append-only admissions decisions and audited correction history.';
comment on table public.admission_offers is
  'Private formal offers. Database enforces 48 hours, Day 13 issuance and cycle-end expiry through the issue RPC.';
