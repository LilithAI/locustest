CREATE TABLE public.profile_playbook_progress (
  user_id uuid NOT NULL,
  guide_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  PRIMARY KEY (user_id, guide_slug)
);

ALTER TABLE public.profile_playbook_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own playbook progress"
  ON public.profile_playbook_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own playbook progress"
  ON public.profile_playbook_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own playbook progress"
  ON public.profile_playbook_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own playbook progress"
  ON public.profile_playbook_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_playbook_progress_user ON public.profile_playbook_progress(user_id);