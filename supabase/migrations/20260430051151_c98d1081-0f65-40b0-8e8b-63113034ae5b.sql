
-- Round 2 beta feedback table + completion timestamp on beta_testers

ALTER TABLE public.beta_testers
  ADD COLUMN IF NOT EXISTS round2_submitted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.beta_feedback_round2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_id uuid,
  tester_name text NOT NULL,
  tester_email text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  nps_score integer,
  general_notes text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback_round2 ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or auth) can insert — eligibility is enforced in app code
-- via the existing tester_id (only Round 1 finishers see the form).
CREATE POLICY "Anyone can submit round 2 feedback"
  ON public.beta_feedback_round2
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view round 2 feedback"
  ON public.beta_feedback_round2
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete round 2 feedback"
  ON public.beta_feedback_round2
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- RPC to mark round 2 submitted (parallels mark_beta_tester_submitted)
CREATE OR REPLACE FUNCTION public.mark_beta_tester_round2_submitted(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.beta_testers
    SET round2_submitted_at = now()
    WHERE id = p_id AND round2_submitted_at IS NULL;
END;
$$;
