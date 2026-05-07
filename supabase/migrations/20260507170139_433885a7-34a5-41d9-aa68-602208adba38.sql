
-- Enums
CREATE TYPE public.firm_tier AS ENUM ('tier_1','tier_2','tier_3','boutique','untiered');
CREATE TYPE public.firm_headcount_band AS ENUM ('micro','boutique_size','mid','large','big_law');
CREATE TYPE public.firm_growth_signal AS ENUM ('growing','stable','shrinking','unknown');
CREATE TYPE public.firm_seniority AS ENUM ('partner','counsel','principal_associate','senior_associate','associate','of_counsel','other');
CREATE TYPE public.firm_team_status AS ENUM ('active','departed');
CREATE TYPE public.firm_news_source AS ENUM ('bar_bench','livelaw','scc','business_standard','et','other');
CREATE TYPE public.firm_news_mention_type AS ENUM ('deal','award','lateral','ranking','article','other');
CREATE TYPE public.firm_movement_type AS ENUM ('joined','departed');
CREATE TYPE public.firm_ranking_source AS ENUM ('chambers','legal500','rsg','iflr1000','asialaw');

-- Extend firm_profiles
ALTER TABLE public.firm_profiles
  ADD COLUMN tier public.firm_tier NOT NULL DEFAULT 'untiered',
  ADD COLUMN headcount_band public.firm_headcount_band,
  ADD COLUMN partner_associate_ratio numeric(6,3),
  ADD COLUMN hiring_velocity numeric(6,3),
  ADD COLUMN growth_signal_90d public.firm_growth_signal NOT NULL DEFAULT 'unknown',
  ADD COLUMN intelligence_completeness_score numeric(4,3) NOT NULL DEFAULT 0,
  ADD COLUMN team_last_updated_at timestamptz,
  ADD COLUMN practice_areas_last_updated_at timestamptz,
  ADD COLUMN news_last_updated_at timestamptz,
  ADD COLUMN offices_last_updated_at timestamptz,
  ADD COLUMN instagram_url text,
  ADD COLUMN youtube_url text;

CREATE INDEX idx_firm_profiles_tier ON public.firm_profiles(tier);
CREATE INDEX idx_firm_profiles_headcount_band ON public.firm_profiles(headcount_band);
CREATE INDEX idx_firm_profiles_completeness ON public.firm_profiles(intelligence_completeness_score DESC);

-- firm_offices
CREATE TABLE public.firm_offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  city text NOT NULL,
  address text,
  phone text,
  email text,
  headcount integer,
  is_hq boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_offices_slug ON public.firm_offices(firm_slug);
CREATE INDEX idx_firm_offices_city ON public.firm_offices(city);
ALTER TABLE public.firm_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm offices" ON public.firm_offices FOR SELECT USING (true);
CREATE POLICY "Admins manage firm offices" ON public.firm_offices FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER firm_offices_updated_at BEFORE UPDATE ON public.firm_offices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- firm_practice_areas
CREATE TABLE public.firm_practice_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  area text NOT NULL,
  partner_count integer,
  depth_score numeric(4,3),
  is_signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_slug, area)
);
CREATE INDEX idx_firm_practice_areas_slug ON public.firm_practice_areas(firm_slug);
CREATE INDEX idx_firm_practice_areas_area ON public.firm_practice_areas(area);
CREATE INDEX idx_firm_practice_areas_signature ON public.firm_practice_areas(is_signature) WHERE is_signature = true;
ALTER TABLE public.firm_practice_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm practice areas" ON public.firm_practice_areas FOR SELECT USING (true);
CREATE POLICY "Admins manage firm practice areas" ON public.firm_practice_areas FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER firm_practice_areas_updated_at BEFORE UPDATE ON public.firm_practice_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- firm_team_members
CREATE TABLE public.firm_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  profile_url text,
  image_url text,
  practice_area text,
  seniority public.firm_seniority NOT NULL DEFAULT 'other',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status public.firm_team_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_slug, name)
);
CREATE INDEX idx_firm_team_slug ON public.firm_team_members(firm_slug);
CREATE INDEX idx_firm_team_status ON public.firm_team_members(status);
CREATE INDEX idx_firm_team_seniority ON public.firm_team_members(seniority);
ALTER TABLE public.firm_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm team members" ON public.firm_team_members FOR SELECT USING (true);
CREATE POLICY "Admins manage firm team members" ON public.firm_team_members FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER firm_team_updated_at BEFORE UPDATE ON public.firm_team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- firm_news_mentions
CREATE TABLE public.firm_news_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  source public.firm_news_source NOT NULL DEFAULT 'other',
  published_at timestamptz NOT NULL,
  mention_type public.firm_news_mention_type NOT NULL DEFAULT 'other',
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_slug, url)
);
CREATE INDEX idx_firm_news_slug ON public.firm_news_mentions(firm_slug);
CREATE INDEX idx_firm_news_published ON public.firm_news_mentions(published_at DESC);
ALTER TABLE public.firm_news_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm news" ON public.firm_news_mentions FOR SELECT USING (true);
CREATE POLICY "Admins manage firm news" ON public.firm_news_mentions FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- firm_team_movements
CREATE TABLE public.firm_team_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  member_name text NOT NULL,
  movement_type public.firm_movement_type NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  prior_firm text,
  next_firm text
);
CREATE INDEX idx_firm_movements_slug ON public.firm_team_movements(firm_slug);
CREATE INDEX idx_firm_movements_detected ON public.firm_team_movements(detected_at DESC);
ALTER TABLE public.firm_team_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm movements" ON public.firm_team_movements FOR SELECT USING (true);
CREATE POLICY "Admins manage firm movements" ON public.firm_team_movements FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- firm_rankings
CREATE TABLE public.firm_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  ranking_source public.firm_ranking_source NOT NULL,
  practice_area text,
  band_or_tier text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_rankings_slug ON public.firm_rankings(firm_slug);
ALTER TABLE public.firm_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm rankings" ON public.firm_rankings FOR SELECT USING (true);
CREATE POLICY "Admins manage firm rankings" ON public.firm_rankings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- firm_comparable_index
CREATE TABLE public.firm_comparable_index (
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  comparable_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  similarity_score numeric(5,4) NOT NULL,
  shared_practice_areas integer NOT NULL DEFAULT 0,
  same_tier boolean NOT NULL DEFAULT false,
  same_city boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (firm_slug, comparable_slug)
);
CREATE INDEX idx_firm_comparable_score ON public.firm_comparable_index(firm_slug, similarity_score DESC);
ALTER TABLE public.firm_comparable_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view firm comparables" ON public.firm_comparable_index FOR SELECT USING (true);
CREATE POLICY "Admins manage firm comparables" ON public.firm_comparable_index FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- firm_team_snapshots (for diff detection)
CREATE TABLE public.firm_team_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  members jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX idx_firm_snapshots_slug_time ON public.firm_team_snapshots(firm_slug, snapshot_at DESC);
ALTER TABLE public.firm_team_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view firm snapshots" ON public.firm_team_snapshots FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage firm snapshots" ON public.firm_team_snapshots FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- firm_chat_logs
CREATE TABLE public.firm_chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  user_id uuid,
  anon_id text,
  question text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_chat_slug ON public.firm_chat_logs(firm_slug);
CREATE INDEX idx_firm_chat_created ON public.firm_chat_logs(created_at DESC);
ALTER TABLE public.firm_chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert chat logs" ON public.firm_chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view chat logs" ON public.firm_chat_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users view own chat logs" ON public.firm_chat_logs FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- pipeline_failures
CREATE TABLE public.pipeline_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline text NOT NULL,
  step text NOT NULL,
  error_message text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_failures_created ON public.pipeline_failures(created_at DESC);
ALTER TABLE public.pipeline_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view pipeline failures" ON public.pipeline_failures FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Service role manages pipeline failures" ON public.pipeline_failures FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
