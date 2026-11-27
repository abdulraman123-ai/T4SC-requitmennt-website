-- These routines are invoked only by the authenticated server proxy/service role
-- or by the database-owned scheduler. They do not need SECURITY DEFINER: the
-- intended callers already have the required table privileges and bypass RLS.
-- An empty search_path plus fully-qualified relations protects name resolution.

alter function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb)
  security invoker;
alter function public.t4sc_issue_admission_offer(uuid,uuid,text,text,jsonb)
  set search_path = '';

alter function public.t4sc_respond_to_admission_offer(uuid,uuid,text)
  security invoker;
alter function public.t4sc_respond_to_admission_offer(uuid,uuid,text)
  set search_path = '';

alter function public.t4sc_expire_admission_offers(uuid)
  security invoker;
alter function public.t4sc_expire_admission_offers(uuid)
  set search_path = '';

alter function public.prevent_admissions_event_mutation()
  set search_path = '';
