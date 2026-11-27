-- Adopt the current specification's "Experienced" route while retaining
-- "Advanced" as a legacy value for records created by the earlier website.
alter table public.applications
  drop constraint if exists applications_assessment_level_check;
alter table public.applications
  add constraint applications_assessment_level_check
  check (assessment_level in ('Beginner','Developing','Experienced','Advanced'));

alter table public.assessment_submissions
  drop constraint if exists assessment_submissions_level_check;
alter table public.assessment_submissions
  add constraint assessment_submissions_level_check
  check (level in ('Beginner','Developing','Experienced','Advanced'));

alter table public.assessment_attempts
  drop constraint if exists assessment_attempts_level_check;
alter table public.assessment_attempts
  add constraint assessment_attempts_level_check
  check (level in ('Beginner','Developing','Experienced','Advanced'));

alter table public.assessment_answer_keys
  drop constraint if exists assessment_answer_keys_check;
alter table public.assessment_answer_keys
  drop constraint if exists assessment_answer_keys_level_check;

alter table public.assessment_answer_keys
  add constraint assessment_answer_keys_level_check
  check (level in ('shared','Beginner','Developing','Experienced','Advanced'));
alter table public.assessment_answer_keys
  add constraint assessment_answer_keys_check
  check (
    (pathway = 'general' and department = '*' and level = 'shared')
    or
    (pathway = 'department' and department <> '*'
      and level in ('Beginner','Developing','Experienced','Advanced'))
  );

-- Move the current draft question keys to the new route label. No application
-- or assessment-attempt records are modified.
update public.assessment_answer_keys
set level = 'Experienced'
where pathway = 'department' and level = 'Advanced';
