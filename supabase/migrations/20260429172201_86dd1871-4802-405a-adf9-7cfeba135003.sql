CREATE OR REPLACE FUNCTION public.dispatch_content_notification_test(p_kind text, p_id uuid, p_test_email text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/dispatch-content-notification';
  v_key text;
  v_req bigint;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets
   WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN RAISE EXCEPTION 'vault secret missing'; END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('kind', p_kind, 'id', p_id::text, 'testEmail', p_test_email)
  ) INTO v_req;
  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_content_notification_test(text, uuid, text) FROM PUBLIC;