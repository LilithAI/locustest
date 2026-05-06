
-- ============================================================
-- FINAL BATCH: missing tables (analytics, beta, cv, playbook, notifications, suppression)
-- ============================================================

-- analytics_events + analytics_salt
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL,
  user_id uuid NULL,
  anon_id text NULL,
  session_id text NULL,
  path text NULL,
  referrer text NULL,
  device text NULL,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text NULL,
  country text NULL,
  CONSTRAINT analytics_event_len CHECK (char_length(event) <= 64)
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created_at ON public.analytics_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created_at ON public.analytics_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_anon_created_at ON public.analytics_events (anon_id, created_at DESC) WHERE anon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON public.analytics_events (path) WHERE path IS NOT NULL;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can read analytics events" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.analytics_salt (
  day date PRIMARY KEY,
  salt text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_salt ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_analytics_salt()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_salt text;
BEGIN
  INSERT INTO public.analytics_salt (day) VALUES (current_date) ON CONFLICT (day) DO NOTHING;
  SELECT salt INTO v_salt FROM public.analytics_salt WHERE day = current_date;
  RETURN v_salt;
END; $$;
REVOKE ALL ON FUNCTION public.current_analytics_salt() FROM public;
GRANT EXECUTE ON FUNCTION public.current_analytics_salt() TO service_role;

-- analytics reporting RPCs
CREATE OR REPLACE FUNCTION public.analytics_summary(p_hours int DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_since timestamptz := now() - make_interval(hours => p_hours);
  v_prev_since timestamptz := now() - make_interval(hours => p_hours * 2); v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'active_users', (SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id)) FROM public.analytics_events WHERE created_at >= v_since),
    'active_users_prev', (SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id)) FROM public.analytics_events WHERE created_at >= v_prev_since AND created_at < v_since),
    'page_views', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'page_view' AND created_at >= v_since),
    'page_views_prev', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'page_view' AND created_at >= v_prev_since AND created_at < v_since),
    'signups', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'signup_completed' AND created_at >= v_since),
    'signups_prev', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'signup_completed' AND created_at >= v_prev_since AND created_at < v_since),
    'installs', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'app_installed' AND created_at >= v_since),
    'installs_prev', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'app_installed' AND created_at >= v_prev_since AND created_at < v_since),
    'standalone_sessions', (SELECT COUNT(*) FROM public.analytics_events WHERE event = 'pwa_session_start' AND created_at >= v_since),
    'profiles_total', (SELECT COUNT(*) FROM public.profiles)
  ) INTO v_result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_install_funnel(p_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_since timestamptz := now() - make_interval(days => p_days); v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'shown', COUNT(*) FILTER (WHERE event = 'install_prompt_shown'),
    'clicked', COUNT(*) FILTER (WHERE event = 'install_prompt_clicked'),
    'dismissed', COUNT(*) FILTER (WHERE event = 'install_prompt_dismissed'),
    'accepted', COUNT(*) FILTER (WHERE event = 'install_outcome_accepted'),
    'installed', COUNT(*) FILTER (WHERE event = 'app_installed'),
    'standalone_sessions', COUNT(*) FILTER (WHERE event = 'pwa_session_start'),
    'android', COUNT(*) FILTER (WHERE event = 'install_prompt_shown' AND props->>'platform' = 'android'),
    'ios', COUNT(*) FILTER (WHERE event = 'install_prompt_shown' AND props->>'platform' = 'ios')
  ) INTO v_result FROM public.analytics_events
  WHERE created_at >= v_since AND event IN ('install_prompt_shown','install_prompt_clicked','install_prompt_dismissed','install_outcome_accepted','install_outcome_dismissed','app_installed','pwa_session_start');
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_timeseries(p_days int DEFAULT 30)
RETURNS TABLE(day date, dau bigint, page_views bigint, signups bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY WITH days AS (
    SELECT generate_series((current_date - (p_days - 1))::date, current_date, '1 day'::interval)::date AS day
  ) SELECT d.day,
    COALESCE((SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id)) FROM public.analytics_events WHERE created_at::date = d.day), 0) AS dau,
    COALESCE((SELECT COUNT(*) FROM public.analytics_events WHERE created_at::date = d.day AND event = 'page_view'), 0) AS page_views,
    COALESCE((SELECT COUNT(*) FROM public.analytics_events WHERE created_at::date = d.day AND event = 'signup_completed'), 0) AS signups
  FROM days d ORDER BY d.day;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_top_paths(p_hours int DEFAULT 168, p_limit int DEFAULT 20)
RETURNS TABLE(path text, views bigint, uniques bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT e.path, COUNT(*) AS views, COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS uniques
  FROM public.analytics_events e
  WHERE e.event = 'page_view' AND e.created_at >= now() - make_interval(hours => p_hours) AND e.path IS NOT NULL
  GROUP BY e.path ORDER BY views DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_top_referrers(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE(referrer text, sessions bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT e.referrer, COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS sessions
  FROM public.analytics_events e
  WHERE e.created_at >= now() - make_interval(days => p_days) AND e.referrer IS NOT NULL
    AND e.referrer NOT ILIKE '%locus.legal%' AND e.referrer NOT ILIKE '%lovable.app%' AND e.referrer NOT ILIKE '%lovable.dev%' AND e.referrer <> ''
  GROUP BY e.referrer ORDER BY sessions DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_recent(p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, created_at timestamptz, event text, user_id uuid, anon_id text, path text, props jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT e.id, e.created_at, e.event, e.user_id, e.anon_id, e.path, e.props
  FROM public.analytics_events e ORDER BY e.created_at DESC LIMIT p_limit;
END; $$;

CREATE OR REPLACE FUNCTION public.analytics_devices(p_hours int DEFAULT 168)
RETURNS TABLE(device text, sessions bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT COALESCE(e.device, 'unknown') AS device, COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS sessions
  FROM public.analytics_events e WHERE e.created_at >= now() - make_interval(hours => p_hours)
  GROUP BY COALESCE(e.device, 'unknown') ORDER BY sessions DESC;
END; $$;

-- ============================================================
-- BETA TESTERS + FEEDBACK
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_name TEXT NOT NULL,
  tester_email TEXT,
  overall_score INTEGER,
  general_notes TEXT,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tester_id UUID,
  tester_code TEXT
);
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit beta feedback" ON public.beta_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view beta feedback" ON public.beta_feedback FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete beta feedback" ON public.beta_feedback FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON public.beta_feedback (created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('beta-screenshots', 'beta-screenshots', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Anyone can upload beta screenshots" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'beta-screenshots');
CREATE POLICY "Admins can view beta screenshots" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'beta-screenshots' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete beta screenshots" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'beta-screenshots' AND public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.beta_testers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number INTEGER NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 7),
  display_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  personal_note TEXT,
  submitted_at TIMESTAMPTZ,
  feedback_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read beta testers" ON public.beta_testers FOR SELECT USING (true);
CREATE POLICY "Anyone can mark tester submitted" ON public.beta_testers FOR UPDATE USING (submitted_at IS NULL) WITH CHECK (submitted_at IS NOT NULL);
CREATE POLICY "Admins manage beta testers" ON public.beta_testers FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.beta_feedback ADD CONSTRAINT beta_feedback_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public.beta_testers(id) ON DELETE SET NULL;

INSERT INTO public.beta_testers (slot_number, display_name, code) VALUES
  (1, 'Abhishek Rana', 'ABHISHEK-7K2X'),
  (2, 'Aditi Sharma',  'ADITI-9M4P'),
  (3, 'Anam',          'ANAM-3R8L'),
  (4, 'Asmi',          'ASMI-5J6Q'),
  (5, 'Khushbu Bhagchandani', 'KHUSHBU-2N9V'),
  (6, 'Reshad',        'RESHAD-8H4D'),
  (7, 'Indrajeet Singh','INDRAJEET-1F7Z')
ON CONFLICT (slot_number) DO NOTHING;

-- ============================================================
-- CV ANALYSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cv_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cv_storage_path TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  verdict TEXT NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cv_analyses_user_created ON public.cv_analyses(user_id, created_at DESC);
ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own cv analyses" ON public.cv_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own cv analyses" ON public.cv_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own cv analyses" ON public.cv_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PLAYBOOK PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_playbook_progress (
  user_id uuid NOT NULL,
  guide_slug text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  PRIMARY KEY (user_id, guide_slug)
);
ALTER TABLE public.profile_playbook_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own playbook progress" ON public.profile_playbook_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own playbook progress" ON public.profile_playbook_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own playbook progress" ON public.profile_playbook_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own playbook progress" ON public.profile_playbook_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_progress_user ON public.profile_playbook_progress(user_id);

-- ============================================================
-- NOTIFICATION + STREAM UNSUBSCRIBES + SUPPRESSED EMAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_stream_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  stream text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, stream)
);
ALTER TABLE public.email_stream_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages stream unsubs" ON public.email_stream_unsubscribes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_stream_unsubs_email_stream ON public.email_stream_unsubscribes (lower(email), stream);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient_email text NOT NULL,
  stream text NOT NULL,
  entity_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipient_email, stream, entity_id)
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages notification log" ON public.notification_log FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_notification_log_lookup ON public.notification_log (stream, entity_id);

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);
