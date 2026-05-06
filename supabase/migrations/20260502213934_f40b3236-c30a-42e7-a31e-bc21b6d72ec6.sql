-- Per-stream opt-outs (separate from global suppressed_emails)
CREATE TABLE IF NOT EXISTS public.email_stream_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  stream text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, stream)
);

ALTER TABLE public.email_stream_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages stream unsubs"
  ON public.email_stream_unsubscribes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_stream_unsubs_email_stream
  ON public.email_stream_unsubscribes (lower(email), stream);

-- Notification dedupe log
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient_email text NOT NULL,
  stream text NOT NULL,
  entity_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipient_email, stream, entity_id)
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages notification log"
  ON public.notification_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_notification_log_lookup
  ON public.notification_log (stream, entity_id);

-- Helpful indexes for digests
CREATE INDEX IF NOT EXISTS idx_vacancies_live_unnotified
  ON public.vacancies (notified_at, status, posted_at)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_bar_challenges_approved_unnotified
  ON public.bar_challenges (notified_at, status, approved_at)
  WHERE status = 'approved';

-- Welcome email trigger via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_welcome_email_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  -- Look up service role key from vault (already stored by setup_email_infra)
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/send-transactional-email';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object(
      'templateName', 'welcome',
      'recipientEmail', NEW.email,
      'idempotencyKey', 'welcome-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'siteUrl', 'https://locus.legal'
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break signup if email enqueue fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_send_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email_fn();