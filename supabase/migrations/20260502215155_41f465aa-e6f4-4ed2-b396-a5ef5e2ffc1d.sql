
-- Trigger: on application status change, enqueue an app-status email
CREATE OR REPLACE FUNCTION public.send_application_status_email_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
  v_email text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify on meaningful transitions
  IF NEW.status NOT IN ('interview_scheduled','interviewed','offer','rejected','accepted','acknowledged') THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN RETURN NEW; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email IS NULL OR btrim(v_email) = '' THEN RETURN NEW; END IF;

  v_url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/send-transactional-email';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'templateName','app-status',
      'recipientEmail', v_email,
      'idempotencyKey', 'app-status-' || NEW.id::text || '-' || NEW.status::text,
      'templateData', jsonb_build_object(
        'firmName', NEW.firm_name_snapshot,
        'role', NEW.role,
        'status', NEW.status::text,
        'siteUrl','https://locus.legal'
      )
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_applications_status_email ON public.profile_applications;
CREATE TRIGGER trg_profile_applications_status_email
AFTER UPDATE OF status ON public.profile_applications
FOR EACH ROW EXECUTE FUNCTION public.send_application_status_email_fn();
