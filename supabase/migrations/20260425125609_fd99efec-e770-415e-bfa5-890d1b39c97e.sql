-- ===========================================================================
-- Batch B: Bundled-fetch RPCs to collapse multi-query pages into 1 round-trip.
-- All functions are STABLE SECURITY DEFINER with locked search_path.
-- They return only data the caller could already read via direct table access.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- a) get_app_dashboard(p_user_id) — powers /app
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_app_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_internships_count int;
  v_moots_count int;
  v_pubs_count int;
  v_bar_stats jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT to_jsonb(p.*) INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('profile', NULL);
  END IF;

  SELECT COUNT(*)::int INTO v_internships_count
  FROM public.profile_internships WHERE user_id = p_user_id;

  SELECT COUNT(*)::int INTO v_moots_count
  FROM public.profile_moots WHERE user_id = p_user_id;

  SELECT COUNT(*)::int INTO v_pubs_count
  FROM public.profile_publications WHERE user_id = p_user_id;

  SELECT to_jsonb(s.*) INTO v_bar_stats
  FROM public.bar_user_stats s
  WHERE s.user_id = p_user_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'internships_count', v_internships_count,
    'moots_count', v_moots_count,
    'publications_count', v_pubs_count,
    'bar_stats', v_bar_stats
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_dashboard(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- b) get_public_profile(p_username) — powers /u/:username
-- Public read, mirrors what the page can already fetch via RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_row public.profiles;
  v_profile jsonb;
  v_internships jsonb;
  v_moots jsonb;
  v_publications jsonb;
  v_stats public.bar_user_stats;
  v_opted_out boolean;
  v_rank int;
  v_bar jsonb;
  v_viewer uuid := auth.uid();
BEGIN
  SELECT * INTO v_profile_row
  FROM public.profiles
  WHERE username = p_username
  LIMIT 1;

  IF v_profile_row.id IS NULL THEN
    RETURN jsonb_build_object('profile', NULL);
  END IF;

  v_profile := jsonb_build_object(
    'id', v_profile_row.id,
    'username', v_profile_row.username,
    'display_name', v_profile_row.display_name,
    'avatar_url', v_profile_row.avatar_url,
    'bio', v_profile_row.bio,
    'college', v_profile_row.college,
    'degree', v_profile_row.degree,
    'graduation_year', v_profile_row.graduation_year,
    'cgpa', v_profile_row.cgpa,
    'subjects_of_interest', v_profile_row.subjects_of_interest,
    'created_at', v_profile_row.created_at,
    'open_to_opportunities', v_profile_row.open_to_opportunities
  );

  SELECT COALESCE(jsonb_agg(t ORDER BY t.start_date DESC), '[]'::jsonb)
    INTO v_internships
  FROM (
    SELECT id, firm_name, role, start_date, end_date, description
    FROM public.profile_internships
    WHERE user_id = v_profile_row.id
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.year DESC), '[]'::jsonb)
    INTO v_moots
  FROM (
    SELECT id, competition_name, year, role, result
    FROM public.profile_moots
    WHERE user_id = v_profile_row.id
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.publication_date DESC), '[]'::jsonb)
    INTO v_publications
  FROM (
    SELECT id, title, publisher, url, publication_date
    FROM public.profile_publications
    WHERE user_id = v_profile_row.id
  ) t;

  v_opted_out := COALESCE(v_profile_row.bar_leaderboard_opt_out, false);

  SELECT * INTO v_stats
  FROM public.bar_user_stats
  WHERE user_id = v_profile_row.id;

  IF v_stats.user_id IS NULL OR v_stats.total_attempts = 0 THEN
    v_bar := NULL;
  ELSE
    v_rank := NULL;
    IF NOT v_opted_out OR v_viewer = v_profile_row.id THEN
      SELECT COUNT(*)::int + 1 INTO v_rank
      FROM public.bar_user_stats
      WHERE total_points > v_stats.total_points;
    END IF;

    v_bar := jsonb_build_object(
      'designation', v_stats.designation,
      'total_points', v_stats.total_points,
      'accuracy_pct', v_stats.accuracy_pct,
      'current_streak', v_stats.current_streak,
      'total_attempts', v_stats.total_attempts,
      'rank_position', v_rank,
      'opted_out', v_opted_out
    );
  END IF;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'internships', v_internships,
    'moots', v_moots,
    'publications', v_publications,
    'bar', v_bar
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- c) get_bar_dashboard(p_user_id) — powers /the-bar
-- Owner-only; returns stats + last 10 attempts + opt-out + overall rank.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bar_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.bar_user_stats;
  v_stats_json jsonb;
  v_recent jsonb;
  v_opted_out boolean;
  v_rank int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_stats
  FROM public.bar_user_stats
  WHERE user_id = p_user_id;

  IF v_stats.user_id IS NULL THEN
    v_stats_json := jsonb_build_object(
      'total_points', 0,
      'accuracy_pct', 0,
      'current_streak', 0,
      'longest_streak', 0,
      'total_attempts', 0,
      'designation', 'trainee'
    );
  ELSE
    v_stats_json := jsonb_build_object(
      'total_points', v_stats.total_points,
      'accuracy_pct', v_stats.accuracy_pct,
      'current_streak', v_stats.current_streak,
      'longest_streak', v_stats.longest_streak,
      'total_attempts', v_stats.total_attempts,
      'designation', v_stats.designation
    );
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.attempted_at DESC), '[]'::jsonb)
    INTO v_recent
  FROM (
    SELECT a.id,
           a.is_correct,
           a.points_awarded,
           a.attempted_at,
           c.title AS challenge_title,
           c.question_type
    FROM public.bar_attempts a
    LEFT JOIN public.bar_challenges c ON c.id = a.challenge_id
    WHERE a.user_id = p_user_id
    ORDER BY a.attempted_at DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(bar_leaderboard_opt_out, false) INTO v_opted_out
  FROM public.profiles
  WHERE id = p_user_id;

  v_rank := NULL;
  IF v_stats.user_id IS NOT NULL AND v_stats.total_points > 0 THEN
    SELECT COUNT(*)::int + 1 INTO v_rank
    FROM public.bar_user_stats
    WHERE total_points > v_stats.total_points;
  END IF;

  RETURN jsonb_build_object(
    'stats', v_stats_json,
    'recent', v_recent,
    'opted_out', COALESCE(v_opted_out, false),
    'overall_rank', v_rank
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_bar_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bar_dashboard(uuid) TO authenticated;