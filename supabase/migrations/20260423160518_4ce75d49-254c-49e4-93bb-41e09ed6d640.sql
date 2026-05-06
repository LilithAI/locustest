ALTER TABLE public.bar_challenges
  ADD COLUMN IF NOT EXISTS grading_config jsonb NOT NULL DEFAULT '{}'::jsonb;