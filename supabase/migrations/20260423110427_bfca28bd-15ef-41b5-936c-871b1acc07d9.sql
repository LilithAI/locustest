
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.bar_question_type AS ENUM (
  'mcq', 'issue_spotter', 'speed_round', 'jurisdiction',
  'document_review', 'brief_builder', 'ethics', 'client_counseling'
);

CREATE TYPE public.bar_difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE public.bar_area_of_law AS ENUM (
  'constitutional','criminal','contract','torts','corporate','ip','labour','tax',
  'evidence','procedure','family','property','administrative','international',
  'jurisprudence','environmental','other'
);

CREATE TYPE public.bar_challenge_status AS ENUM ('draft','pending_review','approved','rejected','archived');

CREATE TYPE public.bar_source_type AS ENUM ('pdf_extraction','topic_prompt','manual');

CREATE TYPE public.bar_source_license AS ENUM ('public_domain','licensed','fair_use_claim','user_submitted','other');

CREATE TYPE public.bar_designation AS ENUM (
  'trainee','junior_associate','associate','senior_associate','partner','senior_partner','silk'
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE: bar_sources
-- ============================================================
CREATE TABLE public.bar_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  source_type public.bar_source_type NOT NULL,
  license public.bar_source_license NOT NULL DEFAULT 'other',
  storage_path text NULL,
  topic_prompt text NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bar_sources_pdf_requires_path CHECK (
    source_type <> 'pdf_extraction' OR (storage_path IS NOT NULL AND topic_prompt IS NULL)
  ),
  CONSTRAINT bar_sources_topic_requires_prompt CHECK (
    source_type <> 'topic_prompt' OR (topic_prompt IS NOT NULL AND storage_path IS NULL)
  )
);
CREATE INDEX idx_bar_sources_type ON public.bar_sources(source_type);
CREATE INDEX idx_bar_sources_uploaded_by ON public.bar_sources(uploaded_by);

ALTER TABLE public.bar_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sources select" ON public.bar_sources FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources insert" ON public.bar_sources FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources update" ON public.bar_sources FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources delete" ON public.bar_sources FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================
-- TABLE: bar_challenges
-- ============================================================
CREATE TABLE public.bar_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NULL REFERENCES public.bar_sources(id) ON DELETE SET NULL,
  source_page integer NULL,
  source_citation text NULL,
  question_type public.bar_question_type NOT NULL,
  area_of_law public.bar_area_of_law NOT NULL,
  difficulty public.bar_difficulty NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NULL,
  status public.bar_challenge_status NOT NULL DEFAULT 'draft',
  points_base integer NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bar_challenges_points_range CHECK (points_base > 0 AND points_base <= 100)
);
CREATE INDEX idx_bar_challenges_status ON public.bar_challenges(status);
CREATE INDEX idx_bar_challenges_status_area ON public.bar_challenges(status, area_of_law);
CREATE INDEX idx_bar_challenges_status_type ON public.bar_challenges(status, question_type);
CREATE INDEX idx_bar_challenges_status_diff ON public.bar_challenges(status, difficulty);
CREATE INDEX idx_bar_challenges_created_by ON public.bar_challenges(created_by);
CREATE INDEX idx_bar_challenges_approved_at ON public.bar_challenges(approved_at DESC);

CREATE TRIGGER bar_challenges_set_updated_at
BEFORE UPDATE ON public.bar_challenges
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bar_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View approved or admin all" ON public.bar_challenges FOR SELECT
  USING (status = 'approved' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins insert challenges" ON public.bar_challenges FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update challenges" ON public.bar_challenges FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete challenges" ON public.bar_challenges FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- TABLE: bar_user_stats
-- ============================================================
CREATE TABLE public.bar_user_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  total_attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  accuracy_pct numeric(5,2) NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  designation public.bar_designation NOT NULL DEFAULT 'trainee',
  last_attempt_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bar_user_stats_points ON public.bar_user_stats(total_points DESC);

CREATE TRIGGER bar_user_stats_set_updated_at
BEFORE UPDATE ON public.bar_user_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bar_user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view stats" ON public.bar_user_stats FOR SELECT USING (true);

-- ============================================================
-- TABLE: bar_user_stats_by_area
-- ============================================================
CREATE TABLE public.bar_user_stats_by_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_of_law public.bar_area_of_law NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  total_attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_of_law)
);
CREATE INDEX idx_bar_user_stats_by_area_leaderboard ON public.bar_user_stats_by_area(area_of_law, total_points DESC);

CREATE TRIGGER bar_user_stats_by_area_set_updated_at
BEFORE UPDATE ON public.bar_user_stats_by_area
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bar_user_stats_by_area ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view area stats" ON public.bar_user_stats_by_area FOR SELECT USING (true);

-- ============================================================
-- TABLE: bar_daily_attempts
-- ============================================================
CREATE TABLE public.bar_daily_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_date date NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, attempt_date)
);
CREATE INDEX idx_bar_daily_attempts_user_date ON public.bar_daily_attempts(user_id, attempt_date DESC);

ALTER TABLE public.bar_daily_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own daily" ON public.bar_daily_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============================================================
-- TABLE: bar_attempts
-- ============================================================
CREATE TABLE public.bar_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.bar_challenges(id) ON DELETE CASCADE,
  submitted_answer jsonb NOT NULL,
  is_correct boolean NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  time_taken_seconds integer NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id),
  CONSTRAINT bar_attempts_points_range CHECK (points_awarded >= 0 AND points_awarded <= 100)
);
CREATE INDEX idx_bar_attempts_user ON public.bar_attempts(user_id);
CREATE INDEX idx_bar_attempts_challenge ON public.bar_attempts(challenge_id);
CREATE INDEX idx_bar_attempts_user_date ON public.bar_attempts(user_id, attempted_at);
CREATE INDEX idx_bar_attempts_at ON public.bar_attempts(attempted_at);

ALTER TABLE public.bar_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.bar_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own attempts" ON public.bar_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins delete attempts" ON public.bar_attempts FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- TRIGGER: enforce daily cap + approved-only on bar_attempts
-- ============================================================
CREATE OR REPLACE FUNCTION public.bar_attempts_before_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.bar_challenge_status;
  v_today date := (NEW.attempted_at AT TIME ZONE 'UTC')::date;
  v_count integer;
BEGIN
  SELECT status INTO v_status FROM public.bar_challenges WHERE id = NEW.challenge_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'challenge_not_found';
  END IF;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'challenge_not_approved';
  END IF;

  SELECT attempt_count INTO v_count
  FROM public.bar_daily_attempts
  WHERE user_id = NEW.user_id AND attempt_date = v_today;

  IF v_count IS NOT NULL AND v_count >= 20 THEN
    RAISE EXCEPTION 'daily_cap_exceeded';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bar_attempts_before_insert
BEFORE INSERT ON public.bar_attempts
FOR EACH ROW EXECUTE FUNCTION public.bar_attempts_before_insert_fn();

-- ============================================================
-- TRIGGER: after insert — update stats, area stats, daily counter, designation
-- ============================================================
CREATE OR REPLACE FUNCTION public.bar_attempts_after_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT area_of_law INTO v_area FROM public.bar_challenges WHERE id = NEW.challenge_id;

  -- Ensure stats row exists
  INSERT INTO public.bar_user_stats (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, longest_streak, designation
    INTO v_current_streak, v_longest_streak, v_old_designation
    FROM public.bar_user_stats WHERE user_id = NEW.user_id;

  IF NEW.is_correct THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN v_longest_streak := v_current_streak; END IF;
  ELSE
    v_current_streak := 0;
  END IF;

  -- Update aggregates
  UPDATE public.bar_user_stats
     SET total_points = total_points + NEW.points_awarded,
         total_attempts = total_attempts + 1,
         correct_attempts = correct_attempts + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END),
         current_streak = v_current_streak,
         longest_streak = v_longest_streak,
         last_attempt_at = NEW.attempted_at,
         updated_at = now()
   WHERE user_id = NEW.user_id
   RETURNING total_points, total_attempts, correct_attempts INTO v_total_points, v_total_attempts, v_correct;

  v_accuracy := CASE WHEN v_total_attempts = 0 THEN 0 ELSE ROUND(v_correct * 100.0 / v_total_attempts, 2) END;
  UPDATE public.bar_user_stats SET accuracy_pct = v_accuracy WHERE user_id = NEW.user_id;

  -- Compute designation by points + accuracy floor (highest tier whose thresholds are all met)
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

  -- Silk top-50 check: only run when we'd otherwise be promoted to silk
  IF v_new_designation = 'silk' THEN
    -- Count silk-eligible users ranked strictly above this user
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

  -- Per-area stats
  INSERT INTO public.bar_user_stats_by_area (user_id, area_of_law, total_points, total_attempts, correct_attempts)
  VALUES (NEW.user_id, v_area, NEW.points_awarded, 1, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, area_of_law) DO UPDATE
    SET total_points = public.bar_user_stats_by_area.total_points + EXCLUDED.total_points,
        total_attempts = public.bar_user_stats_by_area.total_attempts + 1,
        correct_attempts = public.bar_user_stats_by_area.correct_attempts + EXCLUDED.correct_attempts,
        updated_at = now();

  -- Daily counter
  INSERT INTO public.bar_daily_attempts (user_id, attempt_date, attempt_count)
  VALUES (NEW.user_id, v_today, 1)
  ON CONFLICT (user_id, attempt_date) DO UPDATE
    SET attempt_count = public.bar_daily_attempts.attempt_count + 1;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bar_attempts_after_insert
AFTER INSERT ON public.bar_attempts
FOR EACH ROW EXECUTE FUNCTION public.bar_attempts_after_insert_fn();

-- ============================================================
-- Auto-create stats row on profile insert + backfill existing
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_bar_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.bar_user_stats (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_after_insert_bar_stats
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bar_stats();

INSERT INTO public.bar_user_stats (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.bar_user_stats s ON s.user_id = p.id
WHERE s.user_id IS NULL;

-- ============================================================
-- STORAGE BUCKET: bar-sources (private, PDF only, 50MB)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bar-sources', 'bar-sources', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['application/pdf'];

CREATE POLICY "Admins read bar-sources" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins upload bar-sources" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update bar-sources" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete bar-sources" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
