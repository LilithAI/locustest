DELETE FROM public.email_unsubscribe_tokens a
USING public.email_unsubscribe_tokens b
WHERE a.email = b.email AND a.created_at > b.created_at;

ALTER TABLE public.email_unsubscribe_tokens
  ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);