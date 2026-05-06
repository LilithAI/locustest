DROP POLICY IF EXISTS "Anyone can submit round 2 feedback" ON public.beta_feedback_round2;

CREATE POLICY "Anyone can submit round 2 feedback"
ON public.beta_feedback_round2
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';