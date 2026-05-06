
CREATE TABLE public.feature_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature votes"
  ON public.feature_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Auth users can insert own votes"
  ON public.feature_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth users can delete own votes"
  ON public.feature_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
