# Fix: emails stuck in `pending`, cron pointing at wrong URL

## Problem

`email_send_log` shows the broadcast emails enqueued successfully (`status = 'pending'`), but they never transition to `sent`. The Edge Function returns 200 because enqueueing worked — the actual send happens asynchronously via a cron job.

The `process-email-queue` cron job (jobid 4) is configured to POST to:

```
https://id-preview--7785818b-...lovable.app/lovable/email/queue/process
```

That URL is a **TanStack Start server route** — but this project is a **Vite SPA hosted on Cloudflare Pages** (custom domain `lexleaks.com`). That route does not exist. The cron job fires every 5s, gets nothing back, and the queue never drains.

The actual email dispatcher is the deployed Supabase Edge Function `process-email-queue` at:

```
https://wksqrdinlrgkjnncanui.supabase.co/functions/v1/process-email-queue
```

## Fix

Update the `process-email-queue` cron job to POST to the Supabase Edge Function URL instead of the non-existent TanStack route. Keep the same auth (service role key from vault) and same throttling guard.

Migration SQL:

```sql
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue'),
  command := $cmd$
    SELECT CASE
      WHEN (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now()
        THEN NULL
      WHEN EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
        OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)
        THEN net.http_post(
          url := 'https://wksqrdinlrgkjnncanui.supabase.co/functions/v1/process-email-queue',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              SELECT decrypted_secret FROM vault.decrypted_secrets
              WHERE name = 'email_queue_service_role_key'
            )
          ),
          body := '{}'::jsonb
        )
      ELSE NULL
    END;
  $cmd$
);
```

## Verification

1. Wait ~10 seconds for the next cron tick.
2. Re-query `email_send_log` — the two `pending` rows for `heyjeetttt@gmail.com` should flip to `sent`.
3. Check inbox.
4. Trigger a fresh broadcast test to confirm end-to-end.
