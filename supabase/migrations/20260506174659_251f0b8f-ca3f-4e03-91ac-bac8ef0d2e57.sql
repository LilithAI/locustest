-- ============ has_admin_scope helper ============
CREATE OR REPLACE FUNCTION public.has_admin_scope(uid uuid, scope public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('admin'::public.app_role, scope)
  );
$$;

-- ============ Profile target preferences ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_to_opportunities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_tiers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_locations text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_practice_areas text[] NOT NULL DEFAULT '{}'::text[];

-- ============ Opportunities enums ============
DO $$ BEGIN CREATE TYPE public.opp_status AS ENUM ('live','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cfp_publication_type AS ENUM ('journal','blog','magazine','book','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.event_mode AS ENUM ('offline','online','hybrid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.competition_category AS ENUM ('essay','quiz','debate','negotiation','adr','hackathon','fellowship','scholarship','conference','workshop','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CFPS ============
CREATE TABLE public.cfps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_name TEXT NOT NULL,
  publication_type public.cfp_publication_type NOT NULL DEFAULT 'journal',
  theme TEXT, description TEXT,
  submission_deadline TIMESTAMPTZ NOT NULL,
  word_limit_min INTEGER, word_limit_max INTEGER,
  co_authorship_allowed BOOLEAN NOT NULL DEFAULT false,
  submission_fee TEXT, peer_reviewed BOOLEAN NOT NULL DEFAULT false,
  eligibility TEXT, submission_url TEXT, contact_email TEXT, source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cfps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live cfps" ON public.cfps FOR SELECT TO anon, authenticated USING (status='live' AND expires_at > now());
CREATE POLICY "Public can view recent archived cfps" ON public.cfps FOR SELECT TO anon, authenticated USING (status='archived' AND expires_at > (now() - INTERVAL '30 days'));
CREATE POLICY "Opp admins view all cfps" ON public.cfps FOR SELECT TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins insert cfps" ON public.cfps FOR INSERT TO authenticated WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin') AND created_by = auth.uid());
CREATE POLICY "Opp admins update cfps" ON public.cfps FOR UPDATE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin')) WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins delete cfps" ON public.cfps FOR DELETE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));

CREATE OR REPLACE FUNCTION public.cfps_validate_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN RAISE EXCEPTION 'expiry_must_be_after_posted'; END IF;
  IF NEW.submission_deadline <= NEW.posted_at THEN RAISE EXCEPTION 'deadline_must_be_after_posted'; END IF;
  IF NEW.contact_email IS NOT NULL AND btrim(NEW.contact_email) <> '' THEN
    IF NEW.contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'contact_email_invalid'; END IF;
    NEW.contact_email := lower(btrim(NEW.contact_email));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER cfps_validate_trg BEFORE INSERT OR UPDATE ON public.cfps FOR EACH ROW EXECUTE FUNCTION public.cfps_validate_fn();
CREATE INDEX cfps_status_posted_idx ON public.cfps (status, posted_at DESC);

-- ============ MOOTS ============
CREATE TABLE public.moots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_name TEXT NOT NULL, organiser TEXT NOT NULL, edition TEXT, area_of_law TEXT,
  mode public.event_mode NOT NULL DEFAULT 'offline',
  event_start_date DATE, event_end_date DATE,
  registration_deadline TIMESTAMPTZ NOT NULL,
  venue TEXT, prize_pool TEXT, eligibility TEXT, description TEXT, registration_url TEXT, source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live moots" ON public.moots FOR SELECT TO anon, authenticated USING (status='live' AND expires_at > now());
CREATE POLICY "Public can view recent archived moots" ON public.moots FOR SELECT TO anon, authenticated USING (status='archived' AND expires_at > (now() - INTERVAL '30 days'));
CREATE POLICY "Opp admins view all moots" ON public.moots FOR SELECT TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins insert moots" ON public.moots FOR INSERT TO authenticated WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin') AND created_by = auth.uid());
CREATE POLICY "Opp admins update moots" ON public.moots FOR UPDATE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin')) WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins delete moots" ON public.moots FOR DELETE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));

CREATE OR REPLACE FUNCTION public.moots_validate_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN RAISE EXCEPTION 'expiry_must_be_after_posted'; END IF;
  IF NEW.registration_deadline <= NEW.posted_at THEN RAISE EXCEPTION 'deadline_must_be_after_posted'; END IF;
  IF NEW.event_end_date IS NOT NULL AND NEW.event_start_date IS NOT NULL AND NEW.event_end_date < NEW.event_start_date THEN RAISE EXCEPTION 'event_end_before_start'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER moots_validate_trg BEFORE INSERT OR UPDATE ON public.moots FOR EACH ROW EXECUTE FUNCTION public.moots_validate_fn();
CREATE INDEX moots_status_posted_idx ON public.moots (status, posted_at DESC);

-- ============ COMPETITIONS ============
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.competition_category NOT NULL DEFAULT 'other',
  organiser TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  event_date DATE,
  mode public.event_mode,
  prize_or_stipend TEXT, fee TEXT, eligibility TEXT, description TEXT,
  application_url TEXT, source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live competitions" ON public.competitions FOR SELECT TO anon, authenticated USING (status='live' AND expires_at > now());
CREATE POLICY "Public can view recent archived competitions" ON public.competitions FOR SELECT TO anon, authenticated USING (status='archived' AND expires_at > (now() - INTERVAL '30 days'));
CREATE POLICY "Opp admins view all competitions" ON public.competitions FOR SELECT TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins insert competitions" ON public.competitions FOR INSERT TO authenticated WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin') AND created_by = auth.uid());
CREATE POLICY "Opp admins update competitions" ON public.competitions FOR UPDATE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin')) WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins delete competitions" ON public.competitions FOR DELETE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));

CREATE OR REPLACE FUNCTION public.competitions_validate_fn() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN RAISE EXCEPTION 'expiry_must_be_after_posted'; END IF;
  IF NEW.deadline <= NEW.posted_at THEN RAISE EXCEPTION 'deadline_must_be_after_posted'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER competitions_validate_trg BEFORE INSERT OR UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.competitions_validate_fn();
CREATE INDEX competitions_status_posted_idx ON public.competitions (status, posted_at DESC);

-- ============ Lifecycle ============
CREATE OR REPLACE FUNCTION public.opportunities_lifecycle_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.cfps SET status='archived', updated_at=now() WHERE status='live' AND expires_at <= now();
  DELETE FROM public.cfps WHERE status='archived' AND expires_at < (now() - INTERVAL '30 days');
  UPDATE public.moots SET status='archived', updated_at=now() WHERE status='live' AND expires_at <= now();
  DELETE FROM public.moots WHERE status='archived' AND expires_at < (now() - INTERVAL '30 days');
  UPDATE public.competitions SET status='archived', updated_at=now() WHERE status='live' AND expires_at <= now();
  DELETE FROM public.competitions WHERE status='archived' AND expires_at < (now() - INTERVAL '30 days');
END; $$;

-- ============ FIRM SUGGESTIONS ============
CREATE TABLE public.firm_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id text NOT NULL,
  firm_name_snapshot text NOT NULL,
  firm_city_snapshot text,
  user_id uuid,
  field text NOT NULL CHECK (field IN ('email','tier','phone')),
  current_value text,
  suggested_value text NOT NULL CHECK (length(suggested_value) BETWEEN 1 AND 200),
  evidence text CHECK (evidence IS NULL OR length(evidence) <= 280),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_note text CHECK (admin_note IS NULL OR length(admin_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_suggestions_status_created ON public.firm_suggestions (status, created_at DESC);
CREATE INDEX idx_firm_suggestions_firm_id ON public.firm_suggestions (firm_id);
CREATE INDEX idx_firm_suggestions_user_id ON public.firm_suggestions (user_id);

ALTER TABLE public.firm_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own suggestions" ON public.firm_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own suggestions" ON public.firm_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Waitlist admins view all suggestions" ON public.firm_suggestions FOR SELECT TO authenticated USING (public.has_admin_scope(auth.uid(),'waitlist_admin'));
CREATE POLICY "Waitlist admins update suggestions" ON public.firm_suggestions FOR UPDATE TO authenticated USING (public.has_admin_scope(auth.uid(),'waitlist_admin')) WITH CHECK (public.has_admin_scope(auth.uid(),'waitlist_admin'));
CREATE POLICY "Waitlist admins delete suggestions" ON public.firm_suggestions FOR DELETE TO authenticated USING (public.has_admin_scope(auth.uid(),'waitlist_admin'));

CREATE OR REPLACE FUNCTION public.firm_suggestions_rate_limit_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count int;
BEGIN
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'user_id_required'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.firm_suggestions WHERE user_id = NEW.user_id AND created_at > (now() - INTERVAL '24 hours');
  IF v_count >= 5 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER firm_suggestions_rate_limit BEFORE INSERT ON public.firm_suggestions FOR EACH ROW EXECUTE FUNCTION public.firm_suggestions_rate_limit_fn();

-- ============ VACANCY REVIEW QUEUE ============
CREATE TYPE public.vacancy_queue_status AS ENUM ('pending','approved','rejected','duplicate');
CREATE TYPE public.vacancy_queue_source AS ENUM ('lawctopus','linkedin','firm_careers','manual');

CREATE TABLE public.vacancy_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.vacancy_queue_source NOT NULL,
  source_url text NOT NULL,
  source_firm text, source_title text, raw_text text,
  ai_extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.vacancy_queue_status NOT NULL DEFAULT 'pending',
  dedupe_hash text NOT NULL,
  duplicate_of uuid,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz, reviewed_by uuid,
  promoted_vacancy_id uuid, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vrq_status_discovered ON public.vacancy_review_queue (status, discovered_at DESC);
CREATE INDEX idx_vrq_source_url ON public.vacancy_review_queue(source_url);
CREATE UNIQUE INDEX idx_vrq_dedupe_hash_unique ON public.vacancy_review_queue(dedupe_hash);

ALTER TABLE public.vacancy_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opp admins view queue" ON public.vacancy_review_queue FOR SELECT TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins update queue" ON public.vacancy_review_queue FOR UPDATE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin')) WITH CHECK (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Opp admins delete queue" ON public.vacancy_review_queue FOR DELETE TO authenticated USING (public.has_admin_scope(auth.uid(),'opportunities_admin'));
CREATE POLICY "Service role inserts queue" ON public.vacancy_review_queue FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER set_vrq_updated_at BEFORE UPDATE ON public.vacancy_review_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FIRM CAREERS SOURCES ============
CREATE TABLE public.firm_careers_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  selector_hints JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  last_status TEXT, last_error TEXT,
  scrape_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fcs_active ON public.firm_careers_sources(active) WHERE active = true;
CREATE INDEX idx_fcs_firm_slug ON public.firm_careers_sources(firm_slug);

ALTER TABLE public.firm_careers_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opps admins read sources" ON public.firm_careers_sources FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'opportunities_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "opps admins insert sources" ON public.firm_careers_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'opportunities_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "opps admins update sources" ON public.firm_careers_sources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'opportunities_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "opps admins delete sources" ON public.firm_careers_sources FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'opportunities_admin') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_fcs_updated_at BEFORE UPDATE ON public.firm_careers_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Profile read tightening ============
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, display_name, avatar_url, bio, college, degree,
  graduation_year, cgpa, subjects_of_interest, open_to_opportunities,
  bar_leaderboard_opt_out, applications_count, created_at,
  target_tiers, target_locations, target_practice_areas
) ON public.profiles TO anon, authenticated;
CREATE POLICY "Public can view profiles (column-scoped)" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can view own full profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.get_profile_activity(p_user_id uuid)
RETURNS TABLE (activity_date date, bar_count integer, application_count integer, total_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bar AS (
    SELECT (attempted_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
    FROM public.bar_attempts WHERE user_id = p_user_id AND attempted_at >= (now() - INTERVAL '365 days') GROUP BY 1
  ),
  apps AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
    FROM public.profile_applications WHERE user_id = p_user_id AND created_at >= (now() - INTERVAL '365 days') GROUP BY 1
  ),
  joined AS (
    SELECT COALESCE(bar.d, apps.d) AS d, COALESCE(bar.c,0) AS bar_c, COALESCE(apps.c,0) AS app_c
    FROM bar FULL OUTER JOIN apps ON bar.d = apps.d
  )
  SELECT d, bar_c, app_c, (bar_c + app_c) FROM joined ORDER BY d ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_activity(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_own_cv_ref()
RETURNS TABLE(cv_url text, cv_uploaded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cv_url, cv_uploaded_at FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_own_cv_ref() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_cv_ref() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_app_dashboard(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile jsonb; v_internships_count int; v_moots_count int; v_pubs_count int; v_bar_stats jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT to_jsonb(p.*) INTO v_profile FROM public.profiles p WHERE p.id = p_user_id;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('profile', NULL); END IF;
  SELECT COUNT(*)::int INTO v_internships_count FROM public.profile_internships WHERE user_id = p_user_id;
  SELECT COUNT(*)::int INTO v_moots_count FROM public.profile_moots WHERE user_id = p_user_id;
  SELECT COUNT(*)::int INTO v_pubs_count FROM public.profile_publications WHERE user_id = p_user_id;
  SELECT to_jsonb(s.*) INTO v_bar_stats FROM public.bar_user_stats s WHERE s.user_id = p_user_id;
  RETURN jsonb_build_object('profile', v_profile, 'internships_count', v_internships_count, 'moots_count', v_moots_count, 'publications_count', v_pubs_count, 'bar_stats', v_bar_stats);
END; $$;
REVOKE ALL ON FUNCTION public.get_app_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_dashboard(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_row public.profiles; v_profile jsonb; v_internships jsonb; v_moots jsonb; v_publications jsonb;
  v_stats public.bar_user_stats; v_opted_out boolean; v_rank int; v_bar jsonb; v_viewer uuid := auth.uid();
BEGIN
  SELECT * INTO v_profile_row FROM public.profiles WHERE username = p_username LIMIT 1;
  IF v_profile_row.id IS NULL THEN RETURN jsonb_build_object('profile', NULL); END IF;
  v_profile := jsonb_build_object('id', v_profile_row.id, 'username', v_profile_row.username, 'display_name', v_profile_row.display_name, 'avatar_url', v_profile_row.avatar_url, 'bio', v_profile_row.bio, 'college', v_profile_row.college, 'degree', v_profile_row.degree, 'graduation_year', v_profile_row.graduation_year, 'cgpa', v_profile_row.cgpa, 'subjects_of_interest', v_profile_row.subjects_of_interest, 'created_at', v_profile_row.created_at, 'open_to_opportunities', v_profile_row.open_to_opportunities);
  SELECT COALESCE(jsonb_agg(t ORDER BY t.start_date DESC), '[]'::jsonb) INTO v_internships FROM (SELECT id, firm_name, role, start_date, end_date, description FROM public.profile_internships WHERE user_id = v_profile_row.id) t;
  SELECT COALESCE(jsonb_agg(t ORDER BY t.year DESC), '[]'::jsonb) INTO v_moots FROM (SELECT id, competition_name, year, role, result FROM public.profile_moots WHERE user_id = v_profile_row.id) t;
  SELECT COALESCE(jsonb_agg(t ORDER BY t.publication_date DESC), '[]'::jsonb) INTO v_publications FROM (SELECT id, title, publisher, url, publication_date FROM public.profile_publications WHERE user_id = v_profile_row.id) t;
  v_opted_out := COALESCE(v_profile_row.bar_leaderboard_opt_out, false);
  SELECT * INTO v_stats FROM public.bar_user_stats WHERE user_id = v_profile_row.id;
  IF v_stats.user_id IS NULL OR v_stats.total_attempts = 0 THEN v_bar := NULL;
  ELSE
    v_rank := NULL;
    IF NOT v_opted_out OR v_viewer = v_profile_row.id THEN
      SELECT COUNT(*)::int + 1 INTO v_rank FROM public.bar_user_stats WHERE total_points > v_stats.total_points;
    END IF;
    v_bar := jsonb_build_object('designation', v_stats.designation, 'total_points', v_stats.total_points, 'accuracy_pct', v_stats.accuracy_pct, 'current_streak', v_stats.current_streak, 'total_attempts', v_stats.total_attempts, 'rank_position', v_rank, 'opted_out', v_opted_out);
  END IF;
  RETURN jsonb_build_object('profile', v_profile, 'internships', v_internships, 'moots', v_moots, 'publications', v_publications, 'bar', v_bar);
END; $$;
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_bar_dashboard(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stats public.bar_user_stats; v_stats_json jsonb; v_recent jsonb; v_opted_out boolean; v_rank int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_stats FROM public.bar_user_stats WHERE user_id = p_user_id;
  IF v_stats.user_id IS NULL THEN
    v_stats_json := jsonb_build_object('total_points',0,'accuracy_pct',0,'current_streak',0,'longest_streak',0,'total_attempts',0,'designation','trainee');
  ELSE
    v_stats_json := jsonb_build_object('total_points', v_stats.total_points, 'accuracy_pct', v_stats.accuracy_pct, 'current_streak', v_stats.current_streak, 'longest_streak', v_stats.longest_streak, 'total_attempts', v_stats.total_attempts, 'designation', v_stats.designation);
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.attempted_at DESC), '[]'::jsonb) INTO v_recent
  FROM (SELECT a.id, a.is_correct, a.points_awarded, a.attempted_at, c.title AS challenge_title, c.question_type FROM public.bar_attempts a LEFT JOIN public.bar_challenges c ON c.id = a.challenge_id WHERE a.user_id = p_user_id ORDER BY a.attempted_at DESC LIMIT 10) t;
  SELECT COALESCE(bar_leaderboard_opt_out, false) INTO v_opted_out FROM public.profiles WHERE id = p_user_id;
  v_rank := NULL;
  IF v_stats.user_id IS NOT NULL AND v_stats.total_points > 0 THEN
    SELECT COUNT(*)::int + 1 INTO v_rank FROM public.bar_user_stats WHERE total_points > v_stats.total_points;
  END IF;
  RETURN jsonb_build_object('stats', v_stats_json, 'recent', v_recent, 'opted_out', COALESCE(v_opted_out,false), 'overall_rank', v_rank);
END; $$;
REVOKE ALL ON FUNCTION public.get_bar_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bar_dashboard(uuid) TO authenticated;