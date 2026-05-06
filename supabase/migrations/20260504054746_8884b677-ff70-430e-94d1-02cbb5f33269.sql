-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.opp_status AS ENUM ('live', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cfp_publication_type AS ENUM ('journal', 'blog', 'magazine', 'book', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_mode AS ENUM ('offline', 'online', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.competition_category AS ENUM (
    'essay', 'quiz', 'debate', 'negotiation', 'adr',
    'hackathon', 'fellowship', 'scholarship', 'conference', 'workshop', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ CFPS ============
CREATE TABLE IF NOT EXISTS public.cfps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_name TEXT NOT NULL,
  publication_type public.cfp_publication_type NOT NULL DEFAULT 'journal',
  theme TEXT,
  description TEXT,
  submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  word_limit_min INTEGER,
  word_limit_max INTEGER,
  co_authorship_allowed BOOLEAN NOT NULL DEFAULT false,
  submission_fee TEXT,
  peer_reviewed BOOLEAN NOT NULL DEFAULT false,
  eligibility TEXT,
  submission_url TEXT,
  contact_email TEXT,
  source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cfps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live cfps" ON public.cfps
  FOR SELECT TO anon, authenticated
  USING (status = 'live'::opp_status AND expires_at > now());

CREATE POLICY "Public can view recent archived cfps" ON public.cfps
  FOR SELECT TO anon, authenticated
  USING (status = 'archived'::opp_status AND expires_at > (now() - INTERVAL '30 days'));

CREATE POLICY "Admins can view all cfps" ON public.cfps
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert cfps" ON public.cfps
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update cfps" ON public.cfps
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete cfps" ON public.cfps
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.cfps_validate_fn() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN
    RAISE EXCEPTION 'expiry_must_be_after_posted';
  END IF;
  IF NEW.submission_deadline <= NEW.posted_at THEN
    RAISE EXCEPTION 'deadline_must_be_after_posted';
  END IF;
  IF NEW.contact_email IS NOT NULL AND btrim(NEW.contact_email) <> '' THEN
    IF NEW.contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'contact_email_invalid';
    END IF;
    NEW.contact_email := lower(btrim(NEW.contact_email));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER cfps_validate_trg
BEFORE INSERT OR UPDATE ON public.cfps
FOR EACH ROW EXECUTE FUNCTION public.cfps_validate_fn();

CREATE INDEX IF NOT EXISTS cfps_status_posted_idx ON public.cfps (status, posted_at DESC);

-- ============ MOOTS ============
CREATE TABLE IF NOT EXISTS public.moots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_name TEXT NOT NULL,
  organiser TEXT NOT NULL,
  edition TEXT,
  area_of_law TEXT,
  mode public.event_mode NOT NULL DEFAULT 'offline',
  event_start_date DATE,
  event_end_date DATE,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  prize_pool TEXT,
  eligibility TEXT,
  description TEXT,
  registration_url TEXT,
  source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.moots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live moots" ON public.moots
  FOR SELECT TO anon, authenticated
  USING (status = 'live'::opp_status AND expires_at > now());

CREATE POLICY "Public can view recent archived moots" ON public.moots
  FOR SELECT TO anon, authenticated
  USING (status = 'archived'::opp_status AND expires_at > (now() - INTERVAL '30 days'));

CREATE POLICY "Admins can view all moots" ON public.moots
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert moots" ON public.moots
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update moots" ON public.moots
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete moots" ON public.moots
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.moots_validate_fn() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN
    RAISE EXCEPTION 'expiry_must_be_after_posted';
  END IF;
  IF NEW.registration_deadline <= NEW.posted_at THEN
    RAISE EXCEPTION 'deadline_must_be_after_posted';
  END IF;
  IF NEW.event_end_date IS NOT NULL AND NEW.event_start_date IS NOT NULL
     AND NEW.event_end_date < NEW.event_start_date THEN
    RAISE EXCEPTION 'event_end_before_start';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER moots_validate_trg
BEFORE INSERT OR UPDATE ON public.moots
FOR EACH ROW EXECUTE FUNCTION public.moots_validate_fn();

CREATE INDEX IF NOT EXISTS moots_status_posted_idx ON public.moots (status, posted_at DESC);

-- ============ COMPETITIONS ============
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category public.competition_category NOT NULL DEFAULT 'other',
  organiser TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  event_date DATE,
  mode public.event_mode,
  prize_or_stipend TEXT,
  fee TEXT,
  eligibility TEXT,
  description TEXT,
  application_url TEXT,
  source_credit TEXT,
  status public.opp_status NOT NULL DEFAULT 'live',
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live competitions" ON public.competitions
  FOR SELECT TO anon, authenticated
  USING (status = 'live'::opp_status AND expires_at > now());

CREATE POLICY "Public can view recent archived competitions" ON public.competitions
  FOR SELECT TO anon, authenticated
  USING (status = 'archived'::opp_status AND expires_at > (now() - INTERVAL '30 days'));

CREATE POLICY "Admins can view all competitions" ON public.competitions
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert competitions" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update competitions" ON public.competitions
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete competitions" ON public.competitions
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.competitions_validate_fn() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.expires_at <= NEW.posted_at THEN
    RAISE EXCEPTION 'expiry_must_be_after_posted';
  END IF;
  IF NEW.deadline <= NEW.posted_at THEN
    RAISE EXCEPTION 'deadline_must_be_after_posted';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER competitions_validate_trg
BEFORE INSERT OR UPDATE ON public.competitions
FOR EACH ROW EXECUTE FUNCTION public.competitions_validate_fn();

CREATE INDEX IF NOT EXISTS competitions_status_posted_idx ON public.competitions (status, posted_at DESC);

-- ============ LIFECYCLE FUNCTION ============
CREATE OR REPLACE FUNCTION public.opportunities_lifecycle_tick() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.cfps SET status = 'archived', updated_at = now()
    WHERE status = 'live' AND expires_at <= now();
  DELETE FROM public.cfps
    WHERE status = 'archived' AND expires_at < (now() - INTERVAL '30 days');

  UPDATE public.moots SET status = 'archived', updated_at = now()
    WHERE status = 'live' AND expires_at <= now();
  DELETE FROM public.moots
    WHERE status = 'archived' AND expires_at < (now() - INTERVAL '30 days');

  UPDATE public.competitions SET status = 'archived', updated_at = now()
    WHERE status = 'live' AND expires_at <= now();
  DELETE FROM public.competitions
    WHERE status = 'archived' AND expires_at < (now() - INTERVAL '30 days');
END; $$;