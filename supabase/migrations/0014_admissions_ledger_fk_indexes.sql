create index if not exists admission_offers_cycle_id_idx
  on public.admission_offers(cycle_id);

create index if not exists admissions_decision_events_cycle_id_idx
  on public.admissions_decision_events(cycle_id);

create index if not exists admissions_decision_events_correction_event_id_idx
  on public.admissions_decision_events(correction_of_event_id)
  where correction_of_event_id is not null;
