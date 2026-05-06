DROP TRIGGER IF EXISTS vacancies_notify_new_after_iu ON public.vacancies;
DROP TRIGGER IF EXISTS bar_challenges_notify_new_after_iu ON public.bar_challenges;

DROP FUNCTION IF EXISTS public.vacancies_notify_new_fn();
DROP FUNCTION IF EXISTS public.bar_challenges_notify_new_fn();
DROP FUNCTION IF EXISTS public.dispatch_content_notification(text, uuid);

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-email-queue';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END
$$;