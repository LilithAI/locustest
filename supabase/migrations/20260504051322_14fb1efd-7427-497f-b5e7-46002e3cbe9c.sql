
DO $$
DECLARE
  v_key text;
  v_id uuid;
  ids uuid[] := ARRAY[
    '52c22c2a-c906-4ccb-acf8-c7d9e031fe00'::uuid,
    '2318b5e6-3152-4eb2-835f-4b91796f04b5'::uuid,
    '098c7c4c-b79c-44fb-b629-921763954967'::uuid
  ];
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NULL THEN RAISE NOTICE 'no service key in vault'; RETURN; END IF;
  FOREACH v_id IN ARRAY ids LOOP
    PERFORM net.http_post(
      url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/send-vacancy-instant',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
      body := jsonb_build_object('vacancyId', v_id)
    );
  END LOOP;
END $$;
