
-- Audience enum
CREATE TYPE public.bar_audience AS ENUM ('student', 'firm', 'institution');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Questions table
CREATE TABLE public.bar_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience bar_audience NOT NULL DEFAULT 'student',
  tags TEXT[] NOT NULL DEFAULT '{}',
  votes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read questions" ON public.bar_questions FOR SELECT USING (true);
CREATE POLICY "Auth users can insert questions" ON public.bar_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own questions" ON public.bar_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete own questions" ON public.bar_questions FOR DELETE USING (auth.uid() = user_id);

-- Answers table
CREATE TABLE public.bar_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.bar_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  votes INT NOT NULL DEFAULT 0,
  is_top BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bar_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read answers" ON public.bar_answers FOR SELECT USING (true);
CREATE POLICY "Auth users can insert answers" ON public.bar_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors can update own answers" ON public.bar_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authors can delete own answers" ON public.bar_answers FOR DELETE USING (auth.uid() = user_id);
