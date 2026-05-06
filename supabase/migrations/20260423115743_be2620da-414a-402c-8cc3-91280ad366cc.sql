-- 1. Opt-out column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bar_leaderboard_opt_out boolean NOT NULL DEFAULT false;

-- 2. bar_user_colleges denormalized table
CREATE TABLE IF NOT EXISTS public.bar_user_colleges (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_normalized text NOT NULL,
  college_display text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_user_colleges_normalized
  ON public.bar_user_colleges (college_normalized);

ALTER TABLE public.bar_user_colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view colleges" ON public.bar_user_colleges;
CREATE POLICY "Public can view colleges"
  ON public.bar_user_colleges
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies — trigger-managed only.

-- 3. Sync trigger
CREATE OR REPLACE FUNCTION public.profiles_sync_college_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display text;
  v_normalized text;
BEGIN
  v_display := NULLIF(btrim(COALESCE(NEW.college, '')), '');
  IF v_display IS NULL THEN
    DELETE FROM public.bar_user_colleges WHERE user_id = NEW.id;
    RETURN NEW;
  END IF;

  v_normalized := regexp_replace(btrim(lower(v_display)), '\s+', ' ', 'g');

  INSERT INTO public.bar_user_colleges (user_id, college_normalized, college_display, updated_at)
  VALUES (NEW.id, v_normalized, v_display, now())
  ON CONFLICT (user_id) DO UPDATE
    SET college_normalized = EXCLUDED.college_normalized,
        college_display = EXCLUDED.college_display,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_college_ins ON public.profiles;
CREATE TRIGGER profiles_sync_college_ins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_sync_college_fn();

DROP TRIGGER IF EXISTS profiles_sync_college_upd ON public.profiles;
CREATE TRIGGER profiles_sync_college_upd
  AFTER UPDATE OF college ON public.profiles
  FOR EACH ROW
  WHEN (NEW.college IS DISTINCT FROM OLD.college)
  EXECUTE FUNCTION public.profiles_sync_college_fn();

-- 4. Backfill from existing profiles
INSERT INTO public.bar_user_colleges (user_id, college_normalized, college_display, updated_at)
SELECT
  p.id,
  regexp_replace(btrim(lower(p.college)), '\s+', ' ', 'g'),
  btrim(p.college),
  now()
FROM public.profiles p
WHERE p.college IS NOT NULL
  AND btrim(p.college) <> ''
ON CONFLICT (user_id) DO UPDATE
  SET college_normalized = EXCLUDED.college_normalized,
      college_display = EXCLUDED.college_display,
      updated_at = now();

-- 5. Weekly stats view (Monday 00:00 UTC reset; Postgres week starts Monday)
DROP VIEW IF EXISTS public.bar_weekly_stats;
CREATE VIEW public.bar_weekly_stats AS
SELECT
  user_id,
  SUM(points_awarded)::integer AS weekly_points,
  COUNT(*)::integer AS weekly_attempts,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::integer AS weekly_correct,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
    ELSE 0
  END AS weekly_accuracy_pct
FROM public.bar_attempts
WHERE attempted_at >= date_trunc('week', (now() AT TIME ZONE 'UTC'))
GROUP BY user_id;

GRANT SELECT ON public.bar_weekly_stats TO authenticated, anon;

-- 6. Performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_bar_user_stats_points_desc
  ON public.bar_user_stats (total_points DESC, last_attempt_at ASC);

CREATE INDEX IF NOT EXISTS idx_bar_user_stats_by_area_area_points
  ON public.bar_user_stats_by_area (area_of_law, total_points DESC);

CREATE INDEX IF NOT EXISTS idx_bar_attempts_attempted_at
  ON public.bar_attempts (attempted_at);
