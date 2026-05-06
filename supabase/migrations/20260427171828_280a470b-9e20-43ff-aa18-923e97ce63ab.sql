-- Beta feedback table
CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_name TEXT NOT NULL,
  tester_email TEXT,
  overall_score INTEGER,
  general_notes TEXT,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) with the link can submit
CREATE POLICY "Anyone can submit beta feedback"
ON public.beta_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read submissions
CREATE POLICY "Admins can view beta feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can delete submissions
CREATE POLICY "Admins can delete beta feedback"
ON public.beta_feedback
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_beta_feedback_created_at ON public.beta_feedback (created_at DESC);

-- Private storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('beta-screenshots', 'beta-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload screenshots (link-only flow, no auth required)
CREATE POLICY "Anyone can upload beta screenshots"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'beta-screenshots');

-- Only admins can view screenshots
CREATE POLICY "Admins can view beta screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'beta-screenshots' AND public.is_admin(auth.uid()));

-- Only admins can delete screenshots
CREATE POLICY "Admins can delete beta screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'beta-screenshots' AND public.is_admin(auth.uid()));