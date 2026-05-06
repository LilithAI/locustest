
-- Enums
DO $$ BEGIN CREATE TYPE public.vacancy_opportunity_type AS ENUM ('internship', 'job'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.vacancy_application_mode AS ENUM ('email', 'external_url'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.vacancy_tier AS ENUM ('tier_1','tier_2','tier_3','boutique','in_house','psu','big_4','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE public.application_method ADD VALUE IF NOT EXISTS 'external';

-- Vacancies columns
ALTER TABLE public.vacancies
  ADD COLUMN IF NOT EXISTS opportunity_type public.vacancy_opportunity_type NOT NULL DEFAULT 'internship',
  ADD COLUMN IF NOT EXISTS application_mode public.vacancy_application_mode NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS tier public.vacancy_tier,
  ADD COLUMN IF NOT EXISTS practice_area text;
ALTER TABLE public.vacancies ALTER COLUMN application_email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.vacancies_validate_fn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF NEW.application_mode = 'email'::public.vacancy_application_mode THEN
    IF NEW.application_email IS NULL OR btrim(NEW.application_email) = '' THEN RAISE EXCEPTION 'application_email_required'; END IF;
    IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'application_email_invalid'; END IF;
    NEW.application_email := lower(btrim(NEW.application_email));
    NEW.application_url := NULL;
  ELSIF NEW.application_mode = 'external_url'::public.vacancy_application_mode THEN
    IF NEW.application_url IS NULL OR btrim(NEW.application_url) = '' THEN RAISE EXCEPTION 'application_url_required'; END IF;
    IF NEW.application_url !~* '^https?://' THEN RAISE EXCEPTION 'application_url_invalid'; END IF;
    IF length(NEW.application_url) > 2000 THEN RAISE EXCEPTION 'application_url_too_long'; END IF;
    NEW.application_url := btrim(NEW.application_url);
    IF NEW.application_email IS NOT NULL AND btrim(NEW.application_email) <> '' THEN
      IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'application_email_invalid'; END IF;
      NEW.application_email := lower(btrim(NEW.application_email));
    ELSE
      NEW.application_email := NULL;
    END IF;
  END IF;
  IF NEW.expires_at <= NEW.posted_at THEN RAISE EXCEPTION 'expiry_must_be_after_posted'; END IF;
  IF NEW.practice_area IS NOT NULL THEN NEW.practice_area := NULLIF(btrim(NEW.practice_area), ''); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $fn$;

-- Update broadcasts columns
ALTER TABLE public.update_broadcasts
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS preheader text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Beta testers columns
ALTER TABLE public.beta_testers
  ALTER COLUMN code DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intro_line_index smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS round2_submitted_at timestamptz;
UPDATE public.beta_testers SET is_public = true WHERE code IS NOT NULL AND is_public = false;

-- Lock down beta_testers SELECT
DROP POLICY IF EXISTS "Anyone can read beta testers" ON public.beta_testers;
DROP POLICY IF EXISTS "Anyone can mark tester submitted" ON public.beta_testers;
CREATE POLICY "Public can view opted-in testers" ON public.beta_testers FOR SELECT TO anon, authenticated USING (is_public = true);
CREATE POLICY "Users can view own beta tester row" ON public.beta_testers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Beta feedback round 2
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
CREATE POLICY "Anyone can submit round 2 feedback" ON public.beta_feedback_round2 FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view round 2 feedback" ON public.beta_feedback_round2 FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete round 2 feedback" ON public.beta_feedback_round2 FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Beta RPCs
CREATE OR REPLACE FUNCTION public.mark_beta_tester_submitted(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.beta_testers SET submitted_at = now() WHERE id = p_id AND submitted_at IS NULL; END; $$;
GRANT EXECUTE ON FUNCTION public.mark_beta_tester_submitted(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_beta_tester_round2_submitted(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.beta_testers SET round2_submitted_at = now() WHERE id = p_id AND round2_submitted_at IS NULL; END; $$;
GRANT EXECUTE ON FUNCTION public.mark_beta_tester_round2_submitted(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_beta_tester_self(p_id uuid)
RETURNS public.beta_testers LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.beta_testers WHERE id = p_id LIMIT 1; $$;
GRANT EXECUTE ON FUNCTION public.get_beta_tester_self(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_beta_tester_totals()
RETURNS TABLE(total_claimed int, total_submitted int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (SELECT COUNT(*)::int FROM public.beta_testers), (SELECT COUNT(*)::int FROM public.beta_testers WHERE submitted_at IS NOT NULL); $$;
GRANT EXECUTE ON FUNCTION public.get_beta_tester_totals() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_beta_slot(p_name text, p_email text, p_user_id uuid, p_is_public boolean)
RETURNS public.beta_testers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text; v_slot int; v_intro smallint; v_row public.beta_testers;
BEGIN
  v_name := NULLIF(btrim(coalesce(p_name, '')), '');
  IF v_name IS NULL THEN RAISE EXCEPTION 'name_required'; END IF;
  IF length(v_name) > 80 THEN v_name := substr(v_name, 1, 80); END IF;
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO v_slot FROM public.beta_testers;
  v_intro := (floor(random() * 8))::smallint;
  INSERT INTO public.beta_testers (slot_number, display_name, code, email, user_id, is_public, intro_line_index, claimed_at)
  VALUES (v_slot, v_name, NULL, NULLIF(btrim(coalesce(p_email, '')), ''), p_user_id, COALESCE(p_is_public, false), v_intro, now())
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_beta_slot(text, text, uuid, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.find_round2_tester(p_email text)
RETURNS TABLE (id uuid, display_name text, email text, submitted_at timestamptz, round2_submitted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.display_name, t.email, t.submitted_at, t.round2_submitted_at FROM public.beta_testers t
  WHERE p_email IS NOT NULL AND btrim(p_email) <> '' AND lower(t.email) = lower(btrim(p_email)) AND t.submitted_at IS NOT NULL LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_round2_tester(text) TO anon, authenticated;

-- Admin RPCs (overload-safe: drop old single-sig versions first)
DROP FUNCTION IF EXISTS public.list_admins();
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[], is_self boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.username, p.display_name, u.email::text,
    array_agg(r.role::text ORDER BY r.role::text) AS roles,
    (p.id = auth.uid()) AS is_self
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role IN ('admin','opportunities_admin','waitlist_admin','bar_admin','broadcast_admin')
  GROUP BY p.id, p.username, p.display_name, u.email
  ORDER BY p.username;
END; $$;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

DROP FUNCTION IF EXISTS public.find_user_for_admin(text);
CREATE OR REPLACE FUNCTION public.find_user_for_admin(p_query text)
RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_q text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_q := lower(btrim(coalesce(p_query, '')));
  IF v_q IS NULL OR length(v_q) < 2 THEN RETURN; END IF;
  RETURN QUERY SELECT p.id, p.username, p.display_name, u.email::text,
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_roles r
      WHERE r.user_id = p.id AND r.role IN ('admin','opportunities_admin','waitlist_admin','bar_admin','broadcast_admin')), ARRAY[]::text[])
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) LIKE '%'||v_q||'%' OR lower(coalesce(p.display_name,'')) LIKE '%'||v_q||'%' OR lower(coalesce(u.email,'')) LIKE '%'||v_q||'%'
  ORDER BY (lower(p.username) = v_q) DESC, (lower(coalesce(u.email,'')) = v_q) DESC, p.username LIMIT 10;
END; $$;
GRANT EXECUTE ON FUNCTION public.find_user_for_admin(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_role(p_user_id uuid, p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role) ON CONFLICT (user_id, role) DO NOTHING;
END; $$;
GRANT EXECUTE ON FUNCTION public.grant_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_role(p_user_id uuid, p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = auth.uid() AND p_role = 'admin'::public.app_role THEN RAISE EXCEPTION 'cannot_revoke_self'; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
END; $$;
GRANT EXECUTE ON FUNCTION public.revoke_role(uuid, public.app_role) TO authenticated;
