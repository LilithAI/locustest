CREATE OR REPLACE FUNCTION public.find_round2_tester(p_email text)
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  submitted_at timestamptz,
  round2_submitted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.display_name, t.email, t.submitted_at, t.round2_submitted_at
  FROM public.beta_testers t
  WHERE p_email IS NOT NULL
    AND btrim(p_email) <> ''
    AND lower(t.email) = lower(btrim(p_email))
    AND t.submitted_at IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_round2_tester(text) TO anon, authenticated;