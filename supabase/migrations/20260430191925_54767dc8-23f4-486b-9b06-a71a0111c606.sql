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

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.attempted_at DESC), '[]'::jsonb)
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