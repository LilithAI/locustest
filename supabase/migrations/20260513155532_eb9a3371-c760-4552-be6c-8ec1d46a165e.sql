CREATE TABLE public.launch_notify (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'launch_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX launch_notify_email_unique ON public.launch_notify (lower(email));

ALTER TABLE public.launch_notify ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
ON public.launch_notify FOR INSERT
TO anon, authenticated
WITH CHECK (email IS NOT NULL AND length(email) > 3 AND length(email) < 255);

CREATE POLICY "Admins can read"
ON public.launch_notify FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));