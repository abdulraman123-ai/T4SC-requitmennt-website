create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  't4sc-expire-admission-offers',
  '* * * * *',
  'select public.t4sc_expire_admission_offers(NULL);'
);
