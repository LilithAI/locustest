-- Enums
CREATE TYPE public.application_method AS ENUM (
  'email', 'form', 'referral', 'in_person', 'linkedin', 'other'
);

CREATE TYPE public.application_status AS ENUM (
  'sent', 'acknowledged', 'interview_scheduled', 'interviewed',
  'offer', 'rejected', 'accepted', 'withdrawn', 'no_response'
);

-- Add public count column to profiles
ALTER TABLE public.profiles
  ADD COLUMN applications_count integer NOT NULL DEFAULT 0;

-- Main table
CREATE TABLE public.profile_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_name_snapshot text NOT NULL,
  role text NOT NULL,
  applied_on date NOT NULL,
  method public.application_method NOT NULL DEFAULT 'email',
  status public.application_status NOT NULL DEFAULT 'sent',
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_applications_user_applied
  ON public.profile_applications (user_id, applied_on DESC);
CREATE INDEX idx_profile_applications_user_status
  ON public.profile_applications (user_id, status);
CREATE INDEX idx_profile_applications_user_created
  ON public.profile_applications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.profile_applications ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (no admin read; contents are private)
CREATE POLICY "Users view own applications"
  ON public.profile_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own applications"
  ON public.profile_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own applications"
  ON public.profile_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own applications"
  ON public.profile_applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger fn (idempotent — create if not exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_applications_updated_at
BEFORE UPDATE ON public.profile_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- status_updated_at bump only when status changes
CREATE OR REPLACE FUNCTION public.profile_applications_status_changed_fn()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_applications_status_changed
BEFORE UPDATE ON public.profile_applications
FOR EACH ROW
EXECUTE FUNCTION public.profile_applications_status_changed_fn();

-- Maintain profiles.applications_count
CREATE OR REPLACE FUNCTION public.profile_applications_count_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
      SET applications_count = applications_count + 1
      WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
      SET applications_count = GREATEST(applications_count - 1, 0)
      WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_profile_applications_count_ins
AFTER INSERT ON public.profile_applications
FOR EACH ROW
EXECUTE FUNCTION public.profile_applications_count_fn();

CREATE TRIGGER trg_profile_applications_count_del
AFTER DELETE ON public.profile_applications
FOR EACH ROW
EXECUTE FUNCTION public.profile_applications_count_fn();

-- Nudge view (security invoker — inherits owner-only RLS from base table)
CREATE VIEW public.profile_applications_needing_nudge
WITH (security_invoker = true) AS
SELECT *
FROM public.profile_applications
WHERE status IN ('sent', 'acknowledged')
  AND applied_on <= (current_date - INTERVAL '14 days')
  AND status_updated_at <= (now() - INTERVAL '14 days');