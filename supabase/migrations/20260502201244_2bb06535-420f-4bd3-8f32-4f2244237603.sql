SELECT cron.schedule(
  'process-email-queue',
  '5 seconds'::text,
  $cron$
  SELECT net.http_post(
    url := 'https://kasyrononwksnjykgldt.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);