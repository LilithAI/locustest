
-- Trigger function: fires send-vacancy-instant edge function for newly-live vacancies
CREATE OR REPLACE FUNCTION public.vacancies_notify_instant_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- Only fire when status is 'live' and not yet notified
  IF NEW.status <> 'live'::vacancy_status OR NEW.notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, only fire on a transition INTO live
  IF TG_OP = 'UPDATE' AND OLD.status = 'live'::vacancy_status THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/send-vacancy-instant';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('vacancyId', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block inserts/updates if the dispatch fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vacancies_notify_instant_ins ON public.vacancies;
CREATE TRIGGER vacancies_notify_instant_ins
AFTER INSERT ON public.vacancies
FOR EACH ROW
EXECUTE FUNCTION public.vacancies_notify_instant_fn();

DROP TRIGGER IF EXISTS vacancies_notify_instant_upd ON public.vacancies;
CREATE TRIGGER vacancies_notify_instant_upd
AFTER UPDATE OF status ON public.vacancies
FOR EACH ROW
EXECUTE FUNCTION public.vacancies_notify_instant_fn();

-- Retire the daily vacancy digest cron (if present)
DO $$
DECLARE v_id bigint;
BEGIN
  SELECT jobid INTO v_id FROM cron.job WHERE jobname IN ('send-vacancy-digest', 'vacancy-digest-daily', 'send-vacancy-digest-daily') LIMIT 1;
  IF v_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
