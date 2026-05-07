CREATE OR REPLACE FUNCTION public.bar_browse_challenges(
  p_type text DEFAULT NULL,
  p_area text DEFAULT NULL,
  p_diff text DEFAULT NULL,
  p_sort text DEFAULT 'newest',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int;
  v_rows jsonb;
BEGIN
  WITH base AS (
    SELECT c.id, c.question_type, c.area_of_law, c.difficulty,
           c.prompt, c.points_base, c.source_citation, c.created_at
    FROM public.bar_challenges c
    WHERE c.status = 'approved'
      AND (p_type IS NULL OR p_type = 'all' OR c.question_type::text = p_type)
      AND (p_area IS NULL OR p_area = 'all' OR c.area_of_law::text = p_area)
      AND (p_diff IS NULL OR p_diff = 'all' OR c.difficulty::text = p_diff)
      AND (v_uid IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.bar_attempts a
        WHERE a.challenge_id = c.id AND a.user_id = v_uid
      ))
  ),
  ordered AS (
    SELECT * FROM base
    ORDER BY
      CASE WHEN p_sort = 'points_desc' THEN points_base END DESC NULLS LAST,
      CASE WHEN p_sort = 'diff_asc' THEN
        CASE difficulty::text WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END
      END ASC NULLS LAST,
      created_at DESC NULLS LAST
  )
  SELECT COUNT(*)::int INTO v_total FROM base;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM public.bar_challenges c
    WHERE c.status = 'approved'
      AND (p_type IS NULL OR p_type = 'all' OR c.question_type::text = p_type)
      AND (p_area IS NULL OR p_area = 'all' OR c.area_of_law::text = p_area)
      AND (p_diff IS NULL OR p_diff = 'all' OR c.difficulty::text = p_diff)
      AND (v_uid IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.bar_attempts a
        WHERE a.challenge_id = c.id AND a.user_id = v_uid
      ))
    ORDER BY
      CASE WHEN p_sort = 'points_desc' THEN c.points_base END DESC NULLS LAST,
      CASE WHEN p_sort = 'diff_asc' THEN
        CASE c.difficulty::text WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END
      END ASC NULLS LAST,
      c.created_at DESC NULLS LAST
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) t;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bar_browse_challenges(text, text, text, text, int, int) TO anon, authenticated;