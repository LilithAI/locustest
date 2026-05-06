CREATE TYPE public.bar_question_type AS ENUM ('mcq','issue_spotter','speed_round','jurisdiction','document_review','brief_builder','ethics','client_counseling');
CREATE TYPE public.bar_difficulty AS ENUM ('easy','medium','hard');
CREATE TYPE public.bar_area_of_law AS ENUM ('constitutional','criminal','contract','torts','corporate','ip','labour','tax','evidence','procedure','family','property','administrative','international','jurisprudence','environmental','other');
CREATE TYPE public.bar_challenge_status AS ENUM ('draft','pending_review','approved','rejected','archived');
CREATE TYPE public.bar_source_type AS ENUM ('pdf_extraction','topic_prompt','manual');
CREATE TYPE public.bar_source_license AS ENUM ('public_domain','licensed','fair_use_claim','user_submitted','other');
CREATE TYPE public.bar_designation AS ENUM ('trainee','junior_associate','associate','senior_associate','partner','senior_partner','silk');

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.has_role(uid, 'admin'::app_role); $$;
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.bar_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text NULL,
  source_type public.bar_source_type NOT NULL,
  license public.bar_source_license NOT NULL DEFAULT 'other',
  storage_path text NULL, topic_prompt text NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bar_sources_pdf_requires_path CHECK (source_type <> 'pdf_extraction' OR (storage_path IS NOT NULL AND topic_prompt IS NULL)),
  CONSTRAINT bar_sources_topic_requires_prompt CHECK (source_type <> 'topic_prompt' OR (topic_prompt IS NOT NULL AND storage_path IS NULL))
);
CREATE INDEX idx_bar_sources_type ON public.bar_sources(source_type);
CREATE INDEX idx_bar_sources_uploaded_by ON public.bar_sources(uploaded_by);
ALTER TABLE public.bar_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sources select" ON public.bar_sources FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources insert" ON public.bar_sources FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources update" ON public.bar_sources FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage sources delete" ON public.bar_sources FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.bar_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NULL REFERENCES public.bar_sources(id) ON DELETE SET NULL,
  source_page integer NULL, source_citation text NULL,
  question_type public.bar_question_type NOT NULL,
  area_of_law public.bar_area_of_law NOT NULL,
  difficulty public.bar_difficulty NOT NULL,
  title text NOT NULL, prompt text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NULL,
  status public.bar_challenge_status NOT NULL DEFAULT 'draft',
  points_base integer NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz NULL, rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  grading_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT bar_challenges_points_range CHECK (points_base > 0 AND points_base <= 100)
);
CREATE INDEX idx_bar_challenges_status ON public.bar_challenges(status);
CREATE INDEX idx_bar_challenges_status_area ON public.bar_challenges(status, area_of_law);
CREATE INDEX idx_bar_challenges_status_type ON public.bar_challenges(status, question_type);
CREATE INDEX idx_bar_challenges_status_diff ON public.bar_challenges(status, difficulty);
CREATE INDEX idx_bar_challenges_created_by ON public.bar_challenges(created_by);
CREATE INDEX idx_bar_challenges_approved_at ON public.bar_challenges(approved_at DESC);
CREATE TRIGGER bar_challenges_set_updated_at BEFORE UPDATE ON public.bar_challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.bar_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all challenges" ON public.bar_challenges FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Creators can read own challenges" ON public.bar_challenges FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Anon can read approved bar_challenges" ON public.bar_challenges FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "Authenticated can read approved bar_challenges" ON public.bar_challenges FOR SELECT TO authenticated USING (status = 'approved');
CREATE POLICY "Admins insert challenges" ON public.bar_challenges FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update challenges" ON public.bar_challenges FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete challenges" ON public.bar_challenges FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

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
CREATE INDEX idx_bar_user_stats_points_desc ON public.bar_user_stats (total_points DESC, last_attempt_at ASC);
CREATE TRIGGER bar_user_stats_set_updated_at BEFORE UPDATE ON public.bar_user_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.bar_user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view stats" ON public.bar_user_stats FOR SELECT USING (true);

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
CREATE INDEX idx_bar_user_stats_by_area_area_points ON public.bar_user_stats_by_area (area_of_law, total_points DESC);
CREATE TRIGGER bar_user_stats_by_area_set_updated_at BEFORE UPDATE ON public.bar_user_stats_by_area FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.bar_user_stats_by_area ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view area stats" ON public.bar_user_stats_by_area FOR SELECT USING (true);

CREATE TABLE public.bar_daily_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_date date NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, attempt_date)
);
CREATE INDEX idx_bar_daily_attempts_user_date ON public.bar_daily_attempts(user_id, attempt_date DESC);
ALTER TABLE public.bar_daily_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own daily" ON public.bar_daily_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

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
CREATE INDEX idx_bar_attempts_attempted_at ON public.bar_attempts (attempted_at);
ALTER TABLE public.bar_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.bar_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own attempts" ON public.bar_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins delete attempts" ON public.bar_attempts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bar_attempts_before_insert_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.bar_challenge_status; v_today date := (NEW.attempted_at AT TIME ZONE 'UTC')::date; v_count integer;
BEGIN
  SELECT status INTO v_status FROM public.bar_challenges WHERE id = NEW.challenge_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF v_status <> 'approved' THEN RAISE EXCEPTION 'challenge_not_approved'; END IF;
  SELECT attempt_count INTO v_count FROM public.bar_daily_attempts WHERE user_id = NEW.user_id AND attempt_date = v_today;
  IF v_count IS NOT NULL AND v_count >= 20 THEN RAISE EXCEPTION 'daily_cap_exceeded'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bar_attempts_before_insert BEFORE INSERT ON public.bar_attempts FOR EACH ROW EXECUTE FUNCTION public.bar_attempts_before_insert_fn();

CREATE OR REPLACE FUNCTION public.bar_attempts_after_insert_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_area public.bar_area_of_law; v_today date := (NEW.attempted_at AT TIME ZONE 'UTC')::date;
  v_total_points integer; v_total_attempts integer; v_correct integer; v_accuracy numeric(5,2);
  v_current_streak integer; v_longest_streak integer; v_old_designation public.bar_designation; v_new_designation public.bar_designation; v_silk_rank integer;
BEGIN
  SELECT area_of_law INTO v_area FROM public.bar_challenges WHERE id = NEW.challenge_id;
  INSERT INTO public.bar_user_stats (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT current_streak, longest_streak, designation INTO v_current_streak, v_longest_streak, v_old_designation FROM public.bar_user_stats WHERE user_id = NEW.user_id;
  IF NEW.is_correct THEN v_current_streak := v_current_streak + 1; IF v_current_streak > v_longest_streak THEN v_longest_streak := v_current_streak; END IF; ELSE v_current_streak := 0; END IF;
  UPDATE public.bar_user_stats SET total_points = total_points + NEW.points_awarded, total_attempts = total_attempts + 1, correct_attempts = correct_attempts + (CASE WHEN NEW.is_correct THEN 1 ELSE 0 END), current_streak = v_current_streak, longest_streak = v_longest_streak, last_attempt_at = NEW.attempted_at, updated_at = now() WHERE user_id = NEW.user_id RETURNING total_points, total_attempts, correct_attempts INTO v_total_points, v_total_attempts, v_correct;
  v_accuracy := CASE WHEN v_total_attempts = 0 THEN 0 ELSE ROUND(v_correct * 100.0 / v_total_attempts, 2) END;
  UPDATE public.bar_user_stats SET accuracy_pct = v_accuracy WHERE user_id = NEW.user_id;
  v_new_designation := CASE
    WHEN v_total_points >= 50000 AND v_accuracy >= 90 THEN 'silk'::public.bar_designation
    WHEN v_total_points >= 15000 AND v_accuracy >= 85 THEN 'senior_partner'::public.bar_designation
    WHEN v_total_points >= 5000  AND v_accuracy >= 80 THEN 'partner'::public.bar_designation
    WHEN v_total_points >= 1500  AND v_accuracy >= 75 THEN 'senior_associate'::public.bar_designation
    WHEN v_total_points >= 500   AND v_accuracy >= 70 THEN 'associate'::public.bar_designation
    WHEN v_total_points >= 100   AND v_accuracy >= 60 THEN 'junior_associate'::public.bar_designation
    ELSE 'trainee'::public.bar_designation END;
  IF v_new_designation = 'silk' THEN
    SELECT COUNT(*) INTO v_silk_rank FROM public.bar_user_stats s WHERE s.total_points >= 50000 AND s.accuracy_pct >= 90 AND s.user_id <> NEW.user_id AND (s.total_points > v_total_points OR (s.total_points = v_total_points AND s.last_attempt_at < NEW.attempted_at));
    IF v_silk_rank >= 50 THEN v_new_designation := 'senior_partner'; END IF;
  END IF;
  IF v_new_designation IS DISTINCT FROM v_old_designation THEN UPDATE public.bar_user_stats SET designation = v_new_designation WHERE user_id = NEW.user_id; END IF;
  INSERT INTO public.bar_user_stats_by_area (user_id, area_of_law, total_points, total_attempts, correct_attempts) VALUES (NEW.user_id, v_area, NEW.points_awarded, 1, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END) ON CONFLICT (user_id, area_of_law) DO UPDATE SET total_points = public.bar_user_stats_by_area.total_points + EXCLUDED.total_points, total_attempts = public.bar_user_stats_by_area.total_attempts + 1, correct_attempts = public.bar_user_stats_by_area.correct_attempts + EXCLUDED.correct_attempts, updated_at = now();
  INSERT INTO public.bar_daily_attempts (user_id, attempt_date, attempt_count) VALUES (NEW.user_id, v_today, 1) ON CONFLICT (user_id, attempt_date) DO UPDATE SET attempt_count = public.bar_daily_attempts.attempt_count + 1;
  RETURN NEW;
END; $$;
CREATE TRIGGER bar_attempts_after_insert AFTER INSERT ON public.bar_attempts FOR EACH ROW EXECUTE FUNCTION public.bar_attempts_after_insert_fn();

CREATE OR REPLACE FUNCTION public.handle_new_user_bar_stats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.bar_user_stats (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER profiles_after_insert_bar_stats AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bar_stats();
INSERT INTO public.bar_user_stats (user_id) SELECT p.id FROM public.profiles p LEFT JOIN public.bar_user_stats s ON s.user_id = p.id WHERE s.user_id IS NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('bar-sources', 'bar-sources', false, 52428800, ARRAY['application/pdf']) ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800, allowed_mime_types = ARRAY['application/pdf'];
CREATE POLICY "Admins read bar-sources" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins upload bar-sources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update bar-sources" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid())) WITH CHECK (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete bar-sources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bar-sources' AND public.is_admin(auth.uid()));

CREATE TABLE public.bar_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NULL REFERENCES public.bar_sources(id) ON DELETE CASCADE,
  generation_type text NOT NULL CHECK (generation_type IN ('pdf_extract_single', 'pdf_extract_batch', 'topic_draft', 'topic_suggest')),
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  question_type_hint public.bar_question_type NULL,
  area_of_law_hint public.bar_area_of_law NULL,
  difficulty_hint public.bar_difficulty NULL,
  model text NOT NULL, prompt_tokens integer NULL, completion_tokens integer NULL,
  outcome text NOT NULL CHECK (outcome IN ('success','parse_fail','validation_fail','ai_error','rate_limit','quota_exceeded')),
  error_message text NULL, challenges_created integer NOT NULL DEFAULT 0,
  duration_ms integer NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bar_ai_generations_source_id ON public.bar_ai_generations(source_id);
CREATE INDEX idx_bar_ai_generations_requested_by ON public.bar_ai_generations(requested_by);
CREATE INDEX idx_bar_ai_generations_created_at ON public.bar_ai_generations(created_at DESC);
CREATE INDEX idx_bar_ai_generations_outcome ON public.bar_ai_generations(outcome);
ALTER TABLE public.bar_ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view ai generations" ON public.bar_ai_generations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update ai generations" ON public.bar_ai_generations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete ai generations" ON public.bar_ai_generations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

ALTER TABLE public.bar_challenges ADD COLUMN ai_generation_id uuid NULL REFERENCES public.bar_ai_generations(id) ON DELETE SET NULL;
CREATE INDEX idx_bar_challenges_ai_generation_id ON public.bar_challenges(ai_generation_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bar_leaderboard_opt_out boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.bar_user_colleges (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_normalized text NOT NULL, college_display text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bar_user_colleges_normalized ON public.bar_user_colleges (college_normalized);
ALTER TABLE public.bar_user_colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view colleges" ON public.bar_user_colleges FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.profiles_sync_college_fn() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_display text; v_normalized text;
BEGIN
  v_display := NULLIF(btrim(COALESCE(NEW.college, '')), '');
  IF v_display IS NULL THEN DELETE FROM public.bar_user_colleges WHERE user_id = NEW.id; RETURN NEW; END IF;
  v_normalized := regexp_replace(btrim(lower(v_display)), '\s+', ' ', 'g');
  INSERT INTO public.bar_user_colleges (user_id, college_normalized, college_display, updated_at) VALUES (NEW.id, v_normalized, v_display, now())
  ON CONFLICT (user_id) DO UPDATE SET college_normalized = EXCLUDED.college_normalized, college_display = EXCLUDED.college_display, updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_sync_college_ins AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_college_fn();
CREATE TRIGGER profiles_sync_college_upd AFTER UPDATE OF college ON public.profiles FOR EACH ROW WHEN (NEW.college IS DISTINCT FROM OLD.college) EXECUTE FUNCTION public.profiles_sync_college_fn();

CREATE VIEW public.bar_weekly_stats AS
SELECT user_id, SUM(points_awarded)::integer AS weekly_points, COUNT(*)::integer AS weekly_attempts,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::integer AS weekly_correct,
  CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) ELSE 0 END AS weekly_accuracy_pct
FROM public.bar_attempts WHERE attempted_at >= date_trunc('week', (now() AT TIME ZONE 'UTC')) GROUP BY user_id;
GRANT SELECT ON public.bar_weekly_stats TO authenticated, anon;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.bar_rit_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.bar_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bar_rit_messages_attempt_created ON public.bar_rit_messages (attempt_id, created_at);
ALTER TABLE public.bar_rit_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rit messages" ON public.bar_rit_messages FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.bar_attempts a WHERE a.id = bar_rit_messages.attempt_id AND a.user_id = auth.uid()));
CREATE POLICY "Users insert own rit messages" ON public.bar_rit_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.bar_attempts a WHERE a.id = bar_rit_messages.attempt_id AND a.user_id = auth.uid()));

CREATE VIEW public.bar_challenges_student WITH (security_invoker = true, security_barrier = true) AS
SELECT c.id, c.title, c.prompt, c.area_of_law, c.difficulty, c.question_type, c.points_base,
  c.source_citation, c.source_page, c.status, c.created_at, c.updated_at,
  CASE c.question_type::text
    WHEN 'mcq' THEN jsonb_build_object('options', COALESCE(c.payload->'options', '[]'::jsonb))
    WHEN 'issue_spotter' THEN jsonb_build_object('issue_options', COALESCE(c.payload->'issue_options', '[]'::jsonb))
    WHEN 'speed_round' THEN jsonb_build_object('time_limit_seconds', COALESCE(c.payload->'time_limit_seconds', '60'::jsonb), 'questions', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', q->>'id', 'prompt', q->>'prompt')) FROM jsonb_array_elements(COALESCE(c.payload->'questions','[]'::jsonb)) q), '[]'::jsonb))
    WHEN 'jurisdiction' THEN jsonb_build_object('options', COALESCE(c.payload->'options', '[]'::jsonb))
    WHEN 'document_review' THEN jsonb_build_object('document_html', COALESCE(c.payload->>'document_html',''), 'spans', COALESCE(c.payload->'spans','[]'::jsonb), 'categories', COALESCE(c.payload->'categories','[]'::jsonb), 'doc_id', c.payload->>'doc_id', 'doc_title', c.payload->>'doc_title', 'doc_subtitle', c.payload->>'doc_subtitle', 'doc_date', c.payload->>'doc_date')
    WHEN 'brief_builder' THEN jsonb_build_object('fact_pattern', COALESCE(c.payload->>'fact_pattern',''), 'citation', COALESCE(c.payload->>'citation',''), 'matter_tag', c.payload->>'matter_tag', 'steps', COALESCE((SELECT jsonb_agg(jsonb_build_object('kind', s->>'kind', 'label', s->>'label', 'prompt', s->>'prompt', 'options', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o->>'id', 'letter', o->>'letter', 'title', o->>'title', 'desc', o->>'desc', 'meta', o->>'meta')) FROM jsonb_array_elements(COALESCE(s->'options','[]'::jsonb)) o), '[]'::jsonb), 'blocks', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', b->>'id', 'text', b->>'text')) FROM jsonb_array_elements(COALESCE(s->'blocks','[]'::jsonb)) b), '[]'::jsonb))) FROM jsonb_array_elements(COALESCE(c.payload->'steps','[]'::jsonb)) s), '[]'::jsonb))
    WHEN 'ethics' THEN jsonb_build_object('scenario', COALESCE(c.payload->>'scenario',''), 'decision_options', COALESCE(c.payload->'decision_options','[]'::jsonb), 'consequence_text', COALESCE(c.payload->>'consequence_text',''), 'followup_options', COALESCE(c.payload->'followup_options','[]'::jsonb))
    WHEN 'client_counseling' THEN jsonb_build_object('matter', COALESCE(c.payload->>'matter',''), 'client_name', c.payload->>'client_name', 'transcript', COALESCE(c.payload->'transcript','[]'::jsonb), 'decision_turns', COALESCE((SELECT jsonb_agg(jsonb_build_object('turn', (t->>'turn')::int, 'prompt', t->>'prompt', 'options', COALESCE(t->'options','[]'::jsonb))) FROM jsonb_array_elements(COALESCE(c.payload->'decision_turns','[]'::jsonb)) t), '[]'::jsonb))
    ELSE '{}'::jsonb
  END AS payload
FROM public.bar_challenges c WHERE c.status = 'approved';
GRANT SELECT ON public.bar_challenges_student TO authenticated, anon;