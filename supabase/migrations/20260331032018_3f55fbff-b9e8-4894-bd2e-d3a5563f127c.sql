
-- 1. Fix user_roles: restrict SELECT to authenticated users reading own roles
DROP POLICY "Anyone can read roles" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Fix bar_questions: revoke UPDATE on sensitive columns
REVOKE UPDATE (votes, answer_count) ON public.bar_questions FROM authenticated;
REVOKE UPDATE (votes, answer_count) ON public.bar_questions FROM anon;

-- 3. Fix bar_answers: revoke UPDATE on sensitive columns
REVOKE UPDATE (votes, is_top) ON public.bar_answers FROM authenticated;
REVOKE UPDATE (votes, is_top) ON public.bar_answers FROM anon;

-- 4. Fix feature_votes: replace public SELECT with own-votes-only policy
DROP POLICY "Anyone can read feature votes" ON public.feature_votes;
CREATE POLICY "Users can read own votes" ON public.feature_votes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Create RPC for aggregate vote counts (public, no user data exposed)
CREATE OR REPLACE FUNCTION public.get_feature_vote_counts()
RETURNS TABLE(feature_key text, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT feature_key, COUNT(*)::bigint as vote_count
  FROM public.feature_votes
  GROUP BY feature_key;
$$;
