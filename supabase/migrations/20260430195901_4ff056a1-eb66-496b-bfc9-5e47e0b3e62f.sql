-- Add opportunity_type to vacancies
DO $$ BEGIN
  CREATE TYPE public.vacancy_opportunity_type AS ENUM ('internship', 'job');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.vacancies
  ADD COLUMN IF NOT EXISTS opportunity_type public.vacancy_opportunity_type;

UPDATE public.vacancies
   SET opportunity_type = CASE
     WHEN role ILIKE '%intern%'
       OR role ILIKE '%clerk%'
       OR role ILIKE '%trainee%'
       OR role ILIKE '%assessment%'
       OR role ILIKE '%summer%'
       THEN 'internship'::public.vacancy_opportunity_type
     ELSE 'job'::public.vacancy_opportunity_type
   END
 WHERE opportunity_type IS NULL;

ALTER TABLE public.vacancies
  ALTER COLUMN opportunity_type SET DEFAULT 'internship'::public.vacancy_opportunity_type,
  ALTER COLUMN opportunity_type SET NOT NULL;