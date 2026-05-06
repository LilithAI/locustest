
-- Recreate beta_testers_public to silence security definer view warning (explicit invoker)
DROP VIEW IF EXISTS public.beta_testers_public;
CREATE VIEW public.beta_testers_public
WITH (security_invoker = on) AS
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

GRANT SELECT ON public.beta_testers_public TO anon, authenticated;
