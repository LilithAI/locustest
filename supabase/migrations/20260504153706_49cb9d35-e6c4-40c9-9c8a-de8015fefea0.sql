
-- =========================================================================
-- ANALYTICS EVENTS TABLE
-- =========================================================================
CREATE TABLE public.analytics_events (
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

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_event_created_at ON public.analytics_events (event, created_at DESC);
CREATE INDEX idx_analytics_events_user_created_at ON public.analytics_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_anon_created_at ON public.analytics_events (anon_id, created_at DESC) WHERE anon_id IS NOT NULL;
CREATE INDEX idx_analytics_events_path ON public.analytics_events (path) WHERE path IS NOT NULL;

-- =========================================================================
-- DAILY ROTATING SALT FOR IP HASHING
-- =========================================================================
CREATE TABLE public.analytics_salt (
  day date PRIMARY KEY,
  salt text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_salt ENABLE ROW LEVEL SECURITY;
-- Nobody reads/writes via API; only SECURITY DEFINER fns and edge fns w/ service role

CREATE OR REPLACE FUNCTION public.current_analytics_salt()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salt text;
BEGIN
  INSERT INTO public.analytics_salt (day)
  VALUES (current_date)
  ON CONFLICT (day) DO NOTHING;

  SELECT salt INTO v_salt FROM public.analytics_salt WHERE day = current_date;
  RETURN v_salt;
END;
$$;

REVOKE ALL ON FUNCTION public.current_analytics_salt() FROM public;
GRANT EXECUTE ON FUNCTION public.current_analytics_salt() TO service_role;

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (edge fn uses service role anyway, but this future-proofs)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No update/delete from clients (cleanup is via cron, not API)

-- =========================================================================
-- REPORTING FUNCTIONS (admin-only via internal check)
-- =========================================================================

-- Headline KPIs for a time window
CREATE OR REPLACE FUNCTION public.analytics_summary(p_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(hours => p_hours);
  v_prev_since timestamptz := now() - make_interval(hours => p_hours * 2);
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'active_users', (
      SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id))
      FROM public.analytics_events WHERE created_at >= v_since
    ),
    'active_users_prev', (
      SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id))
      FROM public.analytics_events WHERE created_at >= v_prev_since AND created_at < v_since
    ),
    'page_views', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'page_view' AND created_at >= v_since
    ),
    'page_views_prev', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'page_view' AND created_at >= v_prev_since AND created_at < v_since
    ),
    'signups', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'signup_completed' AND created_at >= v_since
    ),
    'signups_prev', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'signup_completed' AND created_at >= v_prev_since AND created_at < v_since
    ),
    'installs', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'app_installed' AND created_at >= v_since
    ),
    'installs_prev', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'app_installed' AND created_at >= v_prev_since AND created_at < v_since
    ),
    'standalone_sessions', (
      SELECT COUNT(*) FROM public.analytics_events
      WHERE event = 'pwa_session_start' AND created_at >= v_since
    ),
    'profiles_total', (SELECT COUNT(*) FROM public.profiles)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Install funnel
CREATE OR REPLACE FUNCTION public.analytics_install_funnel(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => p_days);
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'shown', COUNT(*) FILTER (WHERE event = 'install_prompt_shown'),
    'clicked', COUNT(*) FILTER (WHERE event = 'install_prompt_clicked'),
    'dismissed', COUNT(*) FILTER (WHERE event = 'install_prompt_dismissed'),
    'accepted', COUNT(*) FILTER (WHERE event = 'install_outcome_accepted'),
    'installed', COUNT(*) FILTER (WHERE event = 'app_installed'),
    'standalone_sessions', COUNT(*) FILTER (WHERE event = 'pwa_session_start'),
    'android', COUNT(*) FILTER (WHERE event = 'install_prompt_shown' AND props->>'platform' = 'android'),
    'ios', COUNT(*) FILTER (WHERE event = 'install_prompt_shown' AND props->>'platform' = 'ios')
  )
  INTO v_result
  FROM public.analytics_events
  WHERE created_at >= v_since
    AND event IN (
      'install_prompt_shown','install_prompt_clicked','install_prompt_dismissed',
      'install_outcome_accepted','install_outcome_dismissed','app_installed','pwa_session_start'
    );

  RETURN v_result;
END;
$$;

-- Daily timeseries (DAU + page views + signups)
CREATE OR REPLACE FUNCTION public.analytics_timeseries(p_days int DEFAULT 30)
RETURNS TABLE(day date, dau bigint, page_views bigint, signups bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (current_date - (p_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date AS day
  )
  SELECT
    d.day,
    COALESCE((
      SELECT COUNT(DISTINCT COALESCE(user_id::text, anon_id))
      FROM public.analytics_events
      WHERE created_at::date = d.day
    ), 0) AS dau,
    COALESCE((
      SELECT COUNT(*) FROM public.analytics_events
      WHERE created_at::date = d.day AND event = 'page_view'
    ), 0) AS page_views,
    COALESCE((
      SELECT COUNT(*) FROM public.analytics_events
      WHERE created_at::date = d.day AND event = 'signup_completed'
    ), 0) AS signups
  FROM days d
  ORDER BY d.day;
END;
$$;

-- Top paths
CREATE OR REPLACE FUNCTION public.analytics_top_paths(p_hours int DEFAULT 168, p_limit int DEFAULT 20)
RETURNS TABLE(path text, views bigint, uniques bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    e.path,
    COUNT(*) AS views,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS uniques
  FROM public.analytics_events e
  WHERE e.event = 'page_view'
    AND e.created_at >= now() - make_interval(hours => p_hours)
    AND e.path IS NOT NULL
  GROUP BY e.path
  ORDER BY views DESC
  LIMIT p_limit;
END;
$$;

-- Top referrers
CREATE OR REPLACE FUNCTION public.analytics_top_referrers(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE(referrer text, sessions bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    e.referrer,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS sessions
  FROM public.analytics_events e
  WHERE e.created_at >= now() - make_interval(days => p_days)
    AND e.referrer IS NOT NULL
    AND e.referrer NOT ILIKE '%locus.legal%'
    AND e.referrer NOT ILIKE '%lovable.app%'
    AND e.referrer NOT ILIKE '%lovable.dev%'
    AND e.referrer <> ''
  GROUP BY e.referrer
  ORDER BY sessions DESC
  LIMIT p_limit;
END;
$$;

-- Live tail
CREATE OR REPLACE FUNCTION public.analytics_recent(p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, created_at timestamptz, event text, user_id uuid, anon_id text, path text, props jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT e.id, e.created_at, e.event, e.user_id, e.anon_id, e.path, e.props
  FROM public.analytics_events e
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Device breakdown
CREATE OR REPLACE FUNCTION public.analytics_devices(p_hours int DEFAULT 168)
RETURNS TABLE(device text, sessions bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(e.device, 'unknown') AS device,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id)) AS sessions
  FROM public.analytics_events e
  WHERE e.created_at >= now() - make_interval(hours => p_hours)
  GROUP BY COALESCE(e.device, 'unknown')
  ORDER BY sessions DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_summary(int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_install_funnel(int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_timeseries(int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_top_paths(int,int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_top_referrers(int,int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_recent(int) FROM public;
REVOKE ALL ON FUNCTION public.analytics_devices(int) FROM public;

GRANT EXECUTE ON FUNCTION public.analytics_summary(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_install_funnel(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_timeseries(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_paths(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_referrers(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_recent(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_devices(int) TO authenticated;

-- =========================================================================
-- DAILY RETENTION CLEANUP (180 days)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.purge_old_analytics_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.analytics_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.analytics_salt WHERE day < current_date - interval '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_analytics_events() FROM public;

-- Schedule daily cleanup at 03:30 UTC
SELECT cron.schedule(
  'purge-old-analytics-events',
  '30 3 * * *',
  $$ SELECT public.purge_old_analytics_events(); $$
);
