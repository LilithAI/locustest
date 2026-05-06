-- 1) Create student-facing view that strips correct-answer fields from payload
CREATE OR REPLACE VIEW public.bar_challenges_student
WITH (security_invoker = true) AS
SELECT
  id,
  source_id,
  source_page,
  source_citation,
  question_type,
  area_of_law,
  difficulty,
  title,
  prompt,
  explanation,
  status,
  points_base,
  created_by,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  ai_generation_id,
  CASE question_type
    WHEN 'mcq' THEN jsonb_build_object('options', payload->'options')
    WHEN 'issue_spotter' THEN jsonb_build_object('issue_options', payload->'issue_options')
    WHEN 'speed_round' THEN jsonb_build_object(
      'time_limit_seconds', payload->'time_limit_seconds',
      'questions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', q->'id', 'prompt', q->'prompt'))
        FROM jsonb_array_elements(payload->'questions') q
      ), '[]'::jsonb)
    )
    WHEN 'jurisdiction' THEN jsonb_build_object('options', payload->'options')
    ELSE '{}'::jsonb
  END AS payload
FROM public.bar_challenges
WHERE status = 'approved';

-- Grant SELECT to authenticated users (view inherits underlying RLS via security_invoker,
-- so we also need to allow the SELECT on the underlying table for these rows — handled below)
GRANT SELECT ON public.bar_challenges_student TO authenticated;

-- 2) Tighten bar_challenges SELECT policy: drop the broad "approved or admin" policy
-- and replace with admin-only + creator + already-attempted users
DROP POLICY IF EXISTS "View approved or admin all" ON public.bar_challenges;

-- Admins can still read everything
CREATE POLICY "Admins can read all challenges"
ON public.bar_challenges
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Creators can read their own challenges (drafts, pending, etc.)
CREATE POLICY "Creators can read own challenges"
ON public.bar_challenges
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Users who have already attempted a challenge can read the full row
-- (needed for the post-attempt review dialog so they see the correct answer)
CREATE POLICY "Users can read attempted challenges"
ON public.bar_challenges
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.bar_attempts a
    WHERE a.challenge_id = bar_challenges.id
      AND a.user_id = auth.uid()
  )
);

-- The view itself uses security_invoker, so reads through it require the underlying RLS
-- to allow access. We need an additional policy so authenticated users can read approved
-- challenges *through the view path*. Since the view filters status='approved' and only
-- exposes safe fields, we allow authenticated users to SELECT approved challenges.
-- This is safe because the view strips the correct-answer fields; clients should never
-- query bar_challenges directly for unattempted challenges (RLS doesn't prevent it, but
-- the policies above + UI conventions ensure the view is the only path).
-- Actually for stronger guarantee: the policy below would re-open the leak. So instead,
-- we make the view SECURITY DEFINER style by switching to security_invoker = false.

-- Recreate view without security_invoker so it bypasses caller RLS and uses owner's perms
DROP VIEW public.bar_challenges_student;

CREATE VIEW public.bar_challenges_student AS
SELECT
  id,
  source_id,
  source_page,
  source_citation,
  question_type,
  area_of_law,
  difficulty,
  title,
  prompt,
  explanation,
  status,
  points_base,
  created_by,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  ai_generation_id,
  CASE question_type
    WHEN 'mcq' THEN jsonb_build_object('options', payload->'options')
    WHEN 'issue_spotter' THEN jsonb_build_object('issue_options', payload->'issue_options')
    WHEN 'speed_round' THEN jsonb_build_object(
      'time_limit_seconds', payload->'time_limit_seconds',
      'questions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', q->'id', 'prompt', q->'prompt'))
        FROM jsonb_array_elements(payload->'questions') q
      ), '[]'::jsonb)
    )
    WHEN 'jurisdiction' THEN jsonb_build_object('options', payload->'options')
    ELSE '{}'::jsonb
  END AS payload
FROM public.bar_challenges
WHERE status = 'approved';

GRANT SELECT ON public.bar_challenges_student TO authenticated, anon;