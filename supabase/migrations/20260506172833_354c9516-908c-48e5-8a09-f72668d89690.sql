-- ===== 20260325044150 =====
CREATE TYPE public.bar_audience AS ENUM ('student', 'firm', 'institution');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.bar_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT NOT NULL,
  audience bar_audience NOT NULL DEFAULT 'student',
  tags TEXT[] NOT NULL DEFAULT '{}', votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read questions" ON public.bar_questions FOR SELECT USING (true);
CREATE POLICY "Auth users can insert questions" ON public.bar_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own questions" ON public.bar_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete own questions" ON public.bar_questions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.bar_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.bar_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL, votes INT NOT NULL DEFAULT 0,
  is_top BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bar_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read answers" ON public.bar_answers FOR SELECT USING (true);
CREATE POLICY "Auth users can insert answers" ON public.bar_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own answers" ON public.bar_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete own answers" ON public.bar_answers FOR DELETE USING (auth.uid() = user_id);

-- ===== 20260325045453 =====
CREATE TABLE public.feature_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feature votes" ON public.feature_votes FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can insert own votes" ON public.feature_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users can delete own votes" ON public.feature_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 20260325053840 =====
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN (SELECT u.email FROM auth.users u JOIN public.profiles p ON u.id = p.id
    WHERE lower(p.display_name) = lower(p_username) LIMIT 1);
END;
$$;

-- ===== 20260325062039 =====
ALTER TABLE public.profiles ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT '';
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), ''));
  RETURN NEW;
END;
$function$;

-- ===== 20260325090801 =====
ALTER TABLE public.bar_answers ADD COLUMN parent_id uuid REFERENCES public.bar_answers(id) ON DELETE CASCADE;
ALTER TABLE public.bar_answers DROP CONSTRAINT IF EXISTS bar_answers_question_id_fkey;
ALTER TABLE public.bar_answers ADD CONSTRAINT bar_answers_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.bar_questions(id) ON DELETE CASCADE;

-- ===== 20260325112829 =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "Anyone can read roles" ON public.user_roles FOR SELECT TO public USING (true);
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any question" ON public.bar_questions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any answer" ON public.bar_answers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- [skipped on fresh start] hardcoded admin user_id INSERT

-- ===== 20260325114033 =====
ALTER TABLE public.bar_questions ADD COLUMN answer_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.sync_bar_question_answer_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bar_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bar_questions SET answer_count = GREATEST(answer_count - 1, 0) WHERE id = OLD.question_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.question_id IS DISTINCT FROM NEW.question_id THEN
    UPDATE public.bar_questions SET answer_count = GREATEST(answer_count - 1, 0) WHERE id = OLD.question_id;
    UPDATE public.bar_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER on_bar_answer_change AFTER INSERT OR DELETE OR UPDATE OF question_id ON public.bar_answers
FOR EACH ROW EXECUTE FUNCTION public.sync_bar_question_answer_count();
CREATE INDEX IF NOT EXISTS idx_bar_questions_created_at ON public.bar_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bar_questions_votes ON public.bar_questions (votes DESC);
CREATE INDEX IF NOT EXISTS idx_bar_answers_question ON public.bar_answers (question_id, is_top DESC, votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bar_answers_parent ON public.bar_answers (parent_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_answers;

-- ===== 20260325123420 =====
-- [skipped] hardcoded display_name UPDATE

-- ===== 20260331032018 =====
DROP POLICY "Anyone can read roles" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE UPDATE (votes, answer_count) ON public.bar_questions FROM authenticated;
REVOKE UPDATE (votes, answer_count) ON public.bar_questions FROM anon;
REVOKE UPDATE (votes, is_top) ON public.bar_answers FROM authenticated;
REVOKE UPDATE (votes, is_top) ON public.bar_answers FROM anon;
DROP POLICY "Anyone can read feature votes" ON public.feature_votes;
CREATE POLICY "Users can read own votes" ON public.feature_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.get_feature_vote_counts()
RETURNS TABLE(feature_key text, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT feature_key, COUNT(*)::bigint as vote_count FROM public.feature_votes GROUP BY feature_key;
$$;

-- ===== 20260331085904 =====
CREATE TABLE public.waitlist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('student', 'firm', 'institution')),
  email text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.waitlist_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit waitlist" ON public.waitlist_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view submissions" ON public.waitlist_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));