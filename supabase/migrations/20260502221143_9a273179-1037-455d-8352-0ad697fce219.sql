CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT * INTO v_profile_row FROM public.profiles WHERE username = p_username LIMIT 1;
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
    'open_to_opportunities', v_profile_row.open_to_opportunities,
    'is_pace_setter', COALESCE(v_profile_row.is_pace_setter, false)
  );

  IF COALESCE(v_profile_row.is_pace_setter, false) THEN
    v_internships := '[]'::jsonb;
    v_moots := '[]'::jsonb;
    v_publications := '[]'::jsonb;
  ELSE
    SELECT COALESCE(jsonb_agg(t ORDER BY t.start_date DESC), '[]'::jsonb) INTO v_internships
    FROM (SELECT id, firm_name, role, start_date, end_date, description FROM public.profile_internships WHERE user_id = v_profile_row.id) t;
    SELECT COALESCE(jsonb_agg(t ORDER BY t.year DESC), '[]'::jsonb) INTO v_moots
    FROM (SELECT id, competition_name, year, role, result FROM public.profile_moots WHERE user_id = v_profile_row.id) t;
    SELECT COALESCE(jsonb_agg(t ORDER BY t.publication_date DESC), '[]'::jsonb) INTO v_publications
    FROM (SELECT id, title, publisher, url, publication_date FROM public.profile_publications WHERE user_id = v_profile_row.id) t;
  END IF;

  v_opted_out := COALESCE(v_profile_row.bar_leaderboard_opt_out, false);
  SELECT * INTO v_stats FROM public.bar_user_stats WHERE user_id = v_profile_row.id;

  IF v_stats.user_id IS NULL OR v_stats.total_attempts = 0 THEN
    v_bar := NULL;
  ELSE
    v_rank := NULL;
    IF NOT v_opted_out OR v_viewer = v_profile_row.id THEN
      SELECT COUNT(*)::int + 1 INTO v_rank FROM public.bar_user_stats WHERE total_points > v_stats.total_points;
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
$function$;