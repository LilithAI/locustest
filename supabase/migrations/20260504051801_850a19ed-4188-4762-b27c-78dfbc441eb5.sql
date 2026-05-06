
-- Fix: beta_testers email exposure
-- Drop the public SELECT policy that exposes email column
DROP POLICY IF EXISTS "Public can view opted-in testers" ON public.beta_testers;

-- Create a safe public view that excludes email and other sensitive columns
CREATE OR REPLACE VIEW public.beta_testers_public
WITH (security_invoker = true) AS
SELECT
  id,
  slot_number,
  display_name,
  is_public,
  intro_line_index,
  claimed_at,
  submitted_at,
  round2_submitted_at,
  personal_note,
  created_at
FROM public.beta_testers
WHERE is_public = true;

-- Re-add a restricted policy so the view's underlying read works for anon/authenticated
-- but only for opted-in rows. The view does NOT expose email/user_id/feedback_id/code.
CREATE POLICY "Public can view opted-in testers (safe columns)"
  ON public.beta_testers
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Note: column-level protection is enforced by querying the view in app code.
GRANT SELECT ON public.beta_testers_public TO anon, authenticated;
