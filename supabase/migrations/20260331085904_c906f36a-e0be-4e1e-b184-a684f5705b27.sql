
CREATE TABLE public.waitlist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('student', 'firm', 'institution')),
  email text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form, no auth required)
CREATE POLICY "Anyone can submit waitlist" ON public.waitlist_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Admins can view submissions" ON public.waitlist_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
