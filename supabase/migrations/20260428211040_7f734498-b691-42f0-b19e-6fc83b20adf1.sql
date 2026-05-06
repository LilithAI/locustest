
-- Vacancy status enum
CREATE TYPE public.vacancy_status AS ENUM ('live', 'archived', 'deleted');

-- Vacancies table
CREATE TABLE public.vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  application_email TEXT NOT NULL,
  eligibility TEXT,
  stipend TEXT,
  description TEXT,
  source_credit TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status public.vacancy_status NOT NULL DEFAULT 'live',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger: enforce non-empty, well-formed application_email
CREATE OR REPLACE FUNCTION public.vacancies_validate_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.application_email IS NULL OR btrim(NEW.application_email) = '' THEN
    RAISE EXCEPTION 'application_email_required';
  END IF;
  IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'application_email_invalid';
  END IF;
  IF NEW.expires_at <= NEW.posted_at THEN
    RAISE EXCEPTION 'expiry_must_be_after_posted';
  END IF;
  NEW.application_email := lower(btrim(NEW.application_email));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vacancies_validate_before_iu
BEFORE INSERT OR UPDATE ON public.vacancies
FOR EACH ROW EXECUTE FUNCTION public.vacancies_validate_fn();

-- Indexes
CREATE INDEX idx_vacancies_status_expires ON public.vacancies(status, expires_at DESC);
CREATE INDEX idx_vacancies_expires ON public.vacancies(expires_at);

-- RLS
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

-- Public can view live (non-expired) vacancies
CREATE POLICY "Public can view live vacancies"
ON public.vacancies FOR SELECT
TO anon, authenticated
USING (status = 'live' AND expires_at > now());

-- Public can view recently archived vacancies (last 30 days)
CREATE POLICY "Public can view recent archived vacancies"
ON public.vacancies FOR SELECT
TO anon, authenticated
USING (status = 'archived' AND expires_at > (now() - INTERVAL '30 days'));

-- Admin full access
CREATE POLICY "Admins can view all vacancies"
ON public.vacancies FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert vacancies"
ON public.vacancies FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update vacancies"
ON public.vacancies FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete vacancies"
ON public.vacancies FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Lifecycle function: archive expired + hard-delete >30d archived
CREATE OR REPLACE FUNCTION public.vacancies_lifecycle_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vacancies
    SET status = 'archived', updated_at = now()
    WHERE status = 'live' AND expires_at <= now();

  DELETE FROM public.vacancies
    WHERE status = 'archived' AND expires_at < (now() - INTERVAL '30 days');
END;
$$;

-- Enable cron + net for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
