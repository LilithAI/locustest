
-- 1. Idempotency columns
ALTER TABLE public.vacancies ADD COLUMN IF NOT EXISTS notified_at timestamptz;
ALTER TABLE public.bar_challenges ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- 2. Helper to call the dispatch edge function via pg_net using the
--    vault-stored service-role key (same secret used by process-email-queue).
CREATE OR REPLACE FUNCTION public.dispatch_content_notification(p_kind text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- Project URL (kept inline so we don't depend on extra config tables).
  v_url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/dispatch-content-notification';

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE WARNING 'dispatch_content_notification: vault secret email_queue_service_role_key missing';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('kind', p_kind, 'id', p_id::text)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_content_notification failed: %', SQLERRM;
END;
$$;

-- 3. Vacancies trigger: fire when a row first becomes live and hasn't been notified.
CREATE OR REPLACE FUNCTION public.vacancies_notify_new_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'live' AND NEW.notified_at IS NULL THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.dispatch_content_notification('vacancy', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vacancies_notify_new_after_iu ON public.vacancies;
CREATE TRIGGER vacancies_notify_new_after_iu
AFTER INSERT OR UPDATE ON public.vacancies
FOR EACH ROW
EXECUTE FUNCTION public.vacancies_notify_new_fn();

-- 4. Bar challenges trigger: fire when a row becomes approved and hasn't been notified.
CREATE OR REPLACE FUNCTION public.bar_challenges_notify_new_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.notified_at IS NULL THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.dispatch_content_notification('bar_challenge', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bar_challenges_notify_new_after_iu ON public.bar_challenges;
CREATE TRIGGER bar_challenges_notify_new_after_iu
AFTER INSERT OR UPDATE ON public.bar_challenges
FOR EACH ROW
EXECUTE FUNCTION public.bar_challenges_notify_new_fn();
