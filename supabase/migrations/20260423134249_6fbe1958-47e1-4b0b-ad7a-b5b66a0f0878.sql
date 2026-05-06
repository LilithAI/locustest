
CREATE TABLE public.bar_rit_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.bar_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bar_rit_messages_attempt_created
  ON public.bar_rit_messages (attempt_id, created_at);

ALTER TABLE public.bar_rit_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rit messages"
  ON public.bar_rit_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bar_attempts a
      WHERE a.id = bar_rit_messages.attempt_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own rit messages"
  ON public.bar_rit_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bar_attempts a
      WHERE a.id = bar_rit_messages.attempt_id
        AND a.user_id = auth.uid()
    )
  );
