-- Crowdsourced firm corrections from students
CREATE TABLE public.firm_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id text NOT NULL,
  firm_name_snapshot text NOT NULL,
  firm_city_snapshot text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field text NOT NULL CHECK (field IN ('email','tier','phone')),
  current_value text,
  suggested_value text NOT NULL CHECK (length(suggested_value) BETWEEN 1 AND 200),
  evidence text CHECK (evidence IS NULL OR length(evidence) <= 280),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_note text CHECK (admin_note IS NULL OR length(admin_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_firm_suggestions_status_created ON public.firm_suggestions (status, created_at DESC);
CREATE INDEX idx_firm_suggestions_firm_id ON public.firm_suggestions (firm_id);
CREATE INDEX idx_firm_suggestions_user_id ON public.firm_suggestions (user_id);

ALTER TABLE public.firm_suggestions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit suggestions about themselves
CREATE POLICY "Users insert own suggestions"
  ON public.firm_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own submissions
CREATE POLICY "Users view own suggestions"
  ON public.firm_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins view all suggestions"
  ON public.firm_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can update (accept/reject)
CREATE POLICY "Admins update suggestions"
  ON public.firm_suggestions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete
CREATE POLICY "Admins delete suggestions"
  ON public.firm_suggestions
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Rate limit: max 5 pending suggestions per user per 24h
CREATE OR REPLACE FUNCTION public.firm_suggestions_rate_limit_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  SELECT COUNT(*) INTO v_count
    FROM public.firm_suggestions
    WHERE user_id = NEW.user_id
      AND created_at > (now() - INTERVAL '24 hours');
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER firm_suggestions_rate_limit
  BEFORE INSERT ON public.firm_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.firm_suggestions_rate_limit_fn();