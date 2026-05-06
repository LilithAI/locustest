-- ===== 20260403053639 =====
CREATE TABLE public.visit_counter (
  id integer PRIMARY KEY DEFAULT 1,
  count bigint NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE public.visit_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visit count" ON public.visit_counter FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.visit_counter (id, count) VALUES (1, 0);

CREATE OR REPLACE FUNCTION public.increment_visit_count()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_count bigint;
BEGIN
  UPDATE public.visit_counter SET count = count + 1 WHERE id = 1 RETURNING count INTO new_count;
  RETURN new_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.increment_visit_count() TO anon, authenticated;

-- ===== 20260423093803 - drop old bar tables =====
DROP TRIGGER IF EXISTS sync_bar_question_answer_count_trigger ON public.bar_answers;
DROP TRIGGER IF EXISTS bar_answers_sync_count ON public.bar_answers;
DROP FUNCTION IF EXISTS public.sync_bar_question_answer_count() CASCADE;
DROP TABLE IF EXISTS public.bar_answers CASCADE;
DROP TABLE IF EXISTS public.bar_questions CASCADE;

-- ===== 20260423094840 - profile expansion =====
CREATE TYPE public.degree_type AS ENUM ('BA LLB', 'BBA LLB', 'BCom LLB', 'LLB (3yr)', 'LLM', 'Other');
CREATE TYPE public.moot_role AS ENUM ('speaker', 'researcher', 'both');
CREATE TYPE public.moot_result AS ENUM ('winner', 'runner_up', 'semi_finalist', 'quarter_finalist', 'participant');

ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN avatar_url text,
  ADD COLUMN bio text,
  ADD COLUMN college text,
  ADD COLUMN degree public.degree_type,
  ADD COLUMN graduation_year integer,
  ADD COLUMN cgpa numeric(3,2),
  ADD COLUMN subjects_of_interest text[] NOT NULL DEFAULT '{}',
  ADD COLUMN cv_url text,
  ADD COLUMN cv_uploaded_at timestamptz;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 280),
  ADD CONSTRAINT profiles_graduation_year_range CHECK (graduation_year IS NULL OR (graduation_year BETWEEN 1950 AND 2100)),
  ADD CONSTRAINT profiles_cgpa_range CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10));

DO $$
DECLARE r record; base text; candidate text; attempt int;
BEGIN
  FOR r IN SELECT p.id, u.email FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE p.username IS NULL LOOP
    base := lower(regexp_replace(split_part(COALESCE(r.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
    IF base IS NULL OR length(base) = 0 THEN base := 'user_' || substr(replace(r.id::text, '-', ''), 1, 8); END IF;
    IF length(base) < 3 THEN base := base || lpad(floor(random() * 1000)::text, 3, '0'); END IF;
    IF length(base) > 20 THEN base := substr(base, 1, 20); END IF;
    candidate := base; attempt := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) AND attempt < 5 LOOP
      attempt := attempt + 1;
      candidate := substr(base, 1, 17) || lpad(floor(random() * 1000)::text, 3, '0');
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) THEN
      candidate := substr('user_' || replace(r.id::text, '-', ''), 1, 20);
    END IF;
    UPDATE public.profiles SET username = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,20}$');
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE base_username text; candidate text; attempt int := 0;
BEGIN
  base_username := lower(regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username IS NULL OR length(base_username) = 0 THEN base_username := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8); END IF;
  IF length(base_username) < 3 THEN base_username := base_username || lpad(floor(random() * 1000)::text, 3, '0'); END IF;
  IF length(base_username) > 20 THEN base_username := substr(base_username, 1, 20); END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) AND attempt < 5 LOOP
    attempt := attempt + 1;
    candidate := substr(base_username, 1, 17) || lpad(floor(random() * 1000)::text, 3, '0');
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) THEN
    candidate := substr('user_' || replace(NEW.id::text, '-', ''), 1, 20);
  END IF;
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), ''), candidate);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.profile_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  firm_name text NOT NULL, role text NOT NULL,
  start_date date NOT NULL, end_date date,
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_internships_user_id_idx ON public.profile_internships(user_id);
ALTER TABLE public.profile_internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view internships" ON public.profile_internships FOR SELECT USING (true);
CREATE POLICY "Users can insert own internships" ON public.profile_internships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own internships" ON public.profile_internships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own internships" ON public.profile_internships FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profile_moots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competition_name text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  role public.moot_role NOT NULL, result public.moot_result NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_moots_user_id_idx ON public.profile_moots(user_id);
ALTER TABLE public.profile_moots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view moots" ON public.profile_moots FOR SELECT USING (true);
CREATE POLICY "Users can insert own moots" ON public.profile_moots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moots" ON public.profile_moots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own moots" ON public.profile_moots FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profile_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL, publisher text NOT NULL, url text,
  publication_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_publications_user_id_idx ON public.profile_publications(user_id);
ALTER TABLE public.profile_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view publications" ON public.profile_publications FOR SELECT USING (true);
CREATE POLICY "Users can insert own publications" ON public.profile_publications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own publications" ON public.profile_publications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own publications" ON public.profile_publications FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cvs', 'cvs', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Avatars are publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own CV" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own CV" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own CV" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own CV" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== 20260423094916 - tighten avatar SELECT =====
-- (already applied above with the folder check)

-- ===== 20260423101116 - profile policies =====
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);