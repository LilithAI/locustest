-- 1) Update trigger to use points_awarded > 0 for accuracy/streak instead of strict is_correct
CREATE OR REPLACE FUNCTION public.bar_attempts_after_insert_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_area public.bar_area_of_law;
  v_today date := (NEW.attempted_at AT TIME ZONE 'UTC')::date;
  v_total_points integer;
  v_total_attempts integer;
  v_correct integer;
  v_accuracy numeric(5,2);
  v_current_streak integer;
  v_longest_streak integer;
  v_old_designation public.bar_designation;
  v_new_designation public.bar_designation;
  v_silk_rank integer;
  v_scored boolean := (NEW.points_awarded > 0);
BEGIN
  SELECT area_of_law INTO v_area FROM public.bar_challenges WHERE id = NEW.challenge_id;

  INSERT INTO public.bar_user_stats (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, longest_streak, designation
    INTO v_current_streak, v_longest_streak, v_old_designation
    FROM public.bar_user_stats WHERE user_id = NEW.user_id;

  IF v_scored THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN v_longest_streak := v_current_streak; END IF;
  ELSE
    v_current_streak := 0;
  END IF;

  UPDATE public.bar_user_stats
     SET total_points = total_points + NEW.points_awarded,
         total_attempts = total_attempts + 1,
         correct_attempts = correct_attempts + (CASE WHEN v_scored THEN 1 ELSE 0 END),
         current_streak = v_current_streak,
         longest_streak = v_longest_streak,
         last_attempt_at = NEW.attempted_at,
         updated_at = now()
   WHERE user_id = NEW.user_id
   RETURNING total_points, total_attempts, correct_attempts INTO v_total_points, v_total_attempts, v_correct;

  v_accuracy := CASE WHEN v_total_attempts = 0 THEN 0 ELSE ROUND(v_correct * 100.0 / v_total_attempts, 2) END;
  UPDATE public.bar_user_stats SET accuracy_pct = v_accuracy WHERE user_id = NEW.user_id;

  v_new_designation :=
    CASE
      WHEN v_total_points >= 50000 AND v_accuracy >= 90 THEN 'silk'::public.bar_designation
      WHEN v_total_points >= 15000 AND v_accuracy >= 85 THEN 'senior_partner'::public.bar_designation
      WHEN v_total_points >= 5000  AND v_accuracy >= 80 THEN 'partner'::public.bar_designation
      WHEN v_total_points >= 1500  AND v_accuracy >= 75 THEN 'senior_associate'::public.bar_designation
      WHEN v_total_points >= 500   AND v_accuracy >= 70 THEN 'associate'::public.bar_designation
      WHEN v_total_points >= 100   AND v_accuracy >= 60 THEN 'junior_associate'::public.bar_designation
      ELSE 'trainee'::public.bar_designation
    END;

  IF v_new_designation = 'silk' THEN
    SELECT COUNT(*) INTO v_silk_rank
    FROM public.bar_user_stats s
    WHERE s.total_points >= 50000
      AND s.accuracy_pct >= 90
      AND s.user_id <> NEW.user_id
      AND (
        s.total_points > v_total_points
        OR (s.total_points = v_total_points AND s.last_attempt_at < NEW.attempted_at)
      );
    IF v_silk_rank >= 50 THEN
      v_new_designation := 'senior_partner';
    END IF;
  END IF;

  IF v_new_designation IS DISTINCT FROM v_old_designation THEN
    UPDATE public.bar_user_stats SET designation = v_new_designation WHERE user_id = NEW.user_id;
  END IF;

  -- Per-area stats: also count any-points as correct for that area
  INSERT INTO public.bar_user_stats_by_area (user_id, area_of_law, total_points, total_attempts, correct_attempts)
  VALUES (NEW.user_id, v_area, NEW.points_awarded, 1, CASE WHEN v_scored THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, area_of_law) DO UPDATE
    SET total_points = public.bar_user_stats_by_area.total_points + EXCLUDED.total_points,
        total_attempts = public.bar_user_stats_by_area.total_attempts + 1,
        correct_attempts = public.bar_user_stats_by_area.correct_attempts + EXCLUDED.correct_attempts,
        updated_at = now();

  INSERT INTO public.bar_daily_attempts (user_id, attempt_date, attempt_count)
  VALUES (NEW.user_id, v_today, 1)
  ON CONFLICT (user_id, attempt_date) DO UPDATE
    SET attempt_count = public.bar_daily_attempts.attempt_count + 1;

  RETURN NEW;
END;
$function$;

-- 2) Backfill bar_user_stats from bar_attempts using points_awarded > 0 semantics
WITH agg AS (
  SELECT
    user_id,
    COUNT(*)::int AS total_attempts,
    COUNT(*) FILTER (WHERE points_awarded > 0)::int AS correct_attempts,
    COALESCE(SUM(points_awarded), 0)::int AS total_points,
    MAX(attempted_at) AS last_attempt_at
  FROM public.bar_attempts
  GROUP BY user_id
),
ordered AS (
  SELECT
    user_id,
    attempted_at,
    (points_awarded > 0) AS scored,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY attempted_at) AS rn
  FROM public.bar_attempts
),
grp AS (
  SELECT
    user_id,
    attempted_at,
    scored,
    rn,
    rn - ROW_NUMBER() OVER (PARTITION BY user_id, scored ORDER BY attempted_at) AS grp_id
  FROM ordered
),
runs AS (
  SELECT
    user_id,
    scored,
    grp_id,
    COUNT(*)::int AS run_len,
    MAX(attempted_at) AS run_end
  FROM grp
  GROUP BY user_id, scored, grp_id
),
longest AS (
  SELECT user_id, COALESCE(MAX(run_len), 0)::int AS longest_streak
  FROM runs
  WHERE scored = true
  GROUP BY user_id
),
last_run AS (
  SELECT DISTINCT ON (user_id)
    user_id, scored, run_len
  FROM runs
  ORDER BY user_id, run_end DESC
),
current AS (
  SELECT user_id, CASE WHEN scored THEN run_len ELSE 0 END AS current_streak
  FROM last_run
)
UPDATE public.bar_user_stats s
SET
  total_attempts = agg.total_attempts,
  correct_attempts = agg.correct_attempts,
  total_points = agg.total_points,
  last_attempt_at = agg.last_attempt_at,
  accuracy_pct = CASE WHEN agg.total_attempts = 0 THEN 0
                      ELSE ROUND(agg.correct_attempts * 100.0 / agg.total_attempts, 2) END,
  current_streak = COALESCE(current.current_streak, 0),
  longest_streak = COALESCE(longest.longest_streak, 0),
  updated_at = now()
FROM agg
LEFT JOIN current ON current.user_id = agg.user_id
LEFT JOIN longest ON longest.user_id = agg.user_id
WHERE s.user_id = agg.user_id;

-- 3) Recompute designation based on backfilled accuracy/points
UPDATE public.bar_user_stats
SET designation = CASE
  WHEN total_points >= 50000 AND accuracy_pct >= 90 THEN 'silk'::public.bar_designation
  WHEN total_points >= 15000 AND accuracy_pct >= 85 THEN 'senior_partner'::public.bar_designation
  WHEN total_points >= 5000  AND accuracy_pct >= 80 THEN 'partner'::public.bar_designation
  WHEN total_points >= 1500  AND accuracy_pct >= 75 THEN 'senior_associate'::public.bar_designation
  WHEN total_points >= 500   AND accuracy_pct >= 70 THEN 'associate'::public.bar_designation
  WHEN total_points >= 100   AND accuracy_pct >= 60 THEN 'junior_associate'::public.bar_designation
  ELSE 'trainee'::public.bar_designation
END;