-- ============ 1. beta_testers SELECT lockdown ============
DROP POLICY IF EXISTS "Anyone can read beta testers" ON public.beta_testers;

CREATE POLICY "Public can view opted-in testers"
  ON public.beta_testers FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Users can view own beta tester row"
  ON public.beta_testers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ 2. beta_testers UPDATE lockdown ============
DROP POLICY IF EXISTS "Anyone can mark tester submitted" ON public.beta_testers;

CREATE OR REPLACE FUNCTION public.mark_beta_tester_submitted(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.beta_testers
    SET submitted_at = now()
    WHERE id = p_id AND submitted_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_beta_tester_submitted(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_beta_tester_submitted(uuid) TO anon, authenticated;

-- Self-fetch RPC (id is unguessable uuid, stored in localStorage by claimant)
CREATE OR REPLACE FUNCTION public.get_beta_tester_self(p_id uuid)
RETURNS public.beta_testers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.beta_testers WHERE id = p_id LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.get_beta_tester_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_beta_tester_self(uuid) TO anon, authenticated;

-- Aggregate counts RPC (replaces head:exact queries that would now under-count)
CREATE OR REPLACE FUNCTION public.get_beta_tester_totals()
RETURNS TABLE(total_claimed int, total_submitted int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.beta_testers),
    (SELECT COUNT(*)::int FROM public.beta_testers WHERE submitted_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.get_beta_tester_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_beta_tester_totals() TO anon, authenticated;

-- ============ 3. profiles: protect cv_url + cv_uploaded_at ============
-- Keep existing "Anyone can view profiles" RLS policy, but revoke column-level
-- SELECT on the sensitive CV columns so they can never be returned to clients.
REVOKE SELECT (cv_url, cv_uploaded_at) ON public.profiles FROM anon, authenticated;

-- RPC for owner to fetch their own CV reference
CREATE OR REPLACE FUNCTION public.get_own_cv_ref()
RETURNS TABLE(cv_url text, cv_uploaded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cv_url, cv_uploaded_at FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_own_cv_ref() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_cv_ref() TO authenticated;