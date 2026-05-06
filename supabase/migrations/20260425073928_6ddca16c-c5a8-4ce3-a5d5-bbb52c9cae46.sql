
CREATE TABLE public.cv_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cv_storage_path TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  verdict TEXT NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cv_analyses_user_created ON public.cv_analyses(user_id, created_at DESC);

ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cv analyses"
  ON public.cv_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own cv analyses"
  ON public.cv_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own cv analyses"
  ON public.cv_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
