-- Strip sensitive columns (cv_url, cv_uploaded_at) from public profiles reads.
-- SECURITY DEFINER RPCs (get_public_profile, get_app_dashboard, get_own_cv_ref) bypass these grants and continue to work.

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, display_name, avatar_url, bio, college, degree,
  graduation_year, cgpa, subjects_of_interest, open_to_opportunities,
  bar_leaderboard_opt_out, applications_count, created_at
) ON public.profiles TO anon, authenticated;

CREATE POLICY "Public can view profiles (column-scoped)"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
