ALTER TABLE public.cv_analyses
  ADD COLUMN IF NOT EXISTS cv_hash text;

CREATE INDEX IF NOT EXISTS cv_analyses_user_hash_idx
  ON public.cv_analyses (user_id, cv_hash, created_at DESC);