CREATE POLICY "Authenticated can read approved bar_challenges"
  ON public.bar_challenges
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "Users can read attempted challenges" ON public.bar_challenges;