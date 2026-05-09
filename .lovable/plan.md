# Fix: broadcast / transactional emails not sending

## Problem

When sending a broadcast or any transactional email, the edge function returns 2xx but the email never arrives. The `send-transactional-email` log shows:

```
Failed to create unsubscribe token { code: "42P10",
  message: "there is no unique or exclusion constraint matching the ON CONFLICT specification" }
```

The function calls:
```ts
supabase.from('email_unsubscribe_tokens')
  .upsert({ ... }, { onConflict: 'email', ignoreDuplicates: true })
```
But `email_unsubscribe_tokens` only has a PK on `token`. There is no unique constraint on `email`, so Postgres rejects the upsert. The function swallows the error, returns 200, but the email is never enqueued downstream.

## Fix

Add a unique constraint on `email_unsubscribe_tokens.email` via migration:

```sql
-- Deduplicate any existing rows first (keep the oldest per email)
DELETE FROM public.email_unsubscribe_tokens a
USING public.email_unsubscribe_tokens b
WHERE a.email = b.email AND a.created_at > b.created_at;

ALTER TABLE public.email_unsubscribe_tokens
  ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);
```

That single change unblocks the upsert. The function code is already correct.

## Verification

1. Re-send the broadcast test email from the admin panel.
2. Check `email_send_log` — the row for that recipient should show `status = 'sent'` (or `pending` then `sent` after the queue dispatcher runs within ~5s).
3. Confirm the email arrives in the inbox.
