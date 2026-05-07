
CREATE TABLE public.firm_profiles (
  firm_slug          text PRIMARY KEY,
  firm_name          text NOT NULL,
  website_url        text,
  tagline            text,
  description        text,
  founded_year       integer,
  hq_city            text,
  offices            text[] NOT NULL DEFAULT '{}',
  office_count       integer,
  office_addresses   jsonb NOT NULL DEFAULT '[]'::jsonb,
  practice_areas     text[] NOT NULL DEFAULT '{}',
  total_lawyers      integer,
  partner_count      integer,
  team_members       jsonb NOT NULL DEFAULT '[]'::jsonb,
  general_email      text,
  careers_email      text,
  press_email        text,
  phone_main         text,
  linkedin_url       text,
  twitter_url        text,
  careers_url        text,
  team_page_url      text,
  last_scraped_at    timestamptz,
  scrape_status      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_firm_profiles_practice_areas ON public.firm_profiles USING GIN (practice_areas);
CREATE INDEX idx_firm_profiles_hq_city ON public.firm_profiles (hq_city);

ALTER TABLE public.firm_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view firm profiles"
  ON public.firm_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins insert firm profiles"
  ON public.firm_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update firm profiles"
  ON public.firm_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete firm profiles"
  ON public.firm_profiles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER firm_profiles_set_updated_at
  BEFORE UPDATE ON public.firm_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
