-- Public RPC: returns daily activity counts for the last 365 days for a given user.
-- Counts are aggregated per UTC date. Only counts are exposed — no row contents.
CREATE OR REPLACE FUNCTION public.get_profile_activity(p_user_id uuid)
RETURNS TABLE (
  activity_date date,
  bar_count integer,
  application_count integer,
  total_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bar AS (
    SELECT (attempted_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
    FROM public.bar_attempts
    WHERE user_id = p_user_id
      AND attempted_at >= (now() - INTERVAL '365 days')
    GROUP BY 1
  ),
  apps AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
    FROM public.profile_applications
    WHERE user_id = p_user_id
      AND created_at >= (now() - INTERVAL '365 days')
    GROUP BY 1
  ),
  joined AS (
    SELECT COALESCE(bar.d, apps.d) AS d,
           COALESCE(bar.c, 0) AS bar_c,
           COALESCE(apps.c, 0) AS app_c
    FROM bar
    FULL OUTER JOIN apps ON bar.d = apps.d
  )
  SELECT d AS activity_date,
         bar_c AS bar_count,
         app_c AS application_count,
         (bar_c + app_c) AS total_count
  FROM joined
  ORDER BY d ASC;
$$;

-- Allow anyone (including anon) to call it — heatmap is public.
GRANT EXECUTE ON FUNCTION public.get_profile_activity(uuid) TO anon, authenticated;