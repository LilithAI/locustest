-- Batch 4: Applications, Vacancies, Email infrastructure, Update Broadcasts

-- ===== profile_applications =====
CREATE TYPE public.application_method AS ENUM (
  'email', 'form', 'referral', 'in_person', 'linkedin', 'other'
);

CREATE TYPE public.application_status AS ENUM (
  'sent', 'acknowledged', 'interview_scheduled', 'interviewed',
  'offer', 'rejected', 'accepted', 'withdrawn', 'no_response'
);

ALTER TABLE public.profiles
  ADD COLUMN applications_count integer NOT NULL DEFAULT 0;

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

CREATE INDEX idx_profile_applications_user_applied ON public.profile_applications (user_id, applied_on DESC);
CREATE INDEX idx_profile_applications_user_status ON public.profile_applications (user_id, status);
CREATE INDEX idx_profile_applications_user_created ON public.profile_applications (user_id, created_at DESC);

ALTER TABLE public.profile_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications" ON public.profile_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own applications" ON public.profile_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own applications" ON public.profile_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own applications" ON public.profile_applications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_profile_applications_updated_at
BEFORE UPDATE ON public.profile_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.profile_applications_status_changed_fn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN NEW.status_updated_at = now(); END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_profile_applications_status_changed
BEFORE UPDATE ON public.profile_applications
FOR EACH ROW EXECUTE FUNCTION public.profile_applications_status_changed_fn();

CREATE OR REPLACE FUNCTION public.profile_applications_count_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET applications_count = applications_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET applications_count = GREATEST(applications_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_profile_applications_count_ins AFTER INSERT ON public.profile_applications FOR EACH ROW EXECUTE FUNCTION public.profile_applications_count_fn();
CREATE TRIGGER trg_profile_applications_count_del AFTER DELETE ON public.profile_applications FOR EACH ROW EXECUTE FUNCTION public.profile_applications_count_fn();

CREATE VIEW public.profile_applications_needing_nudge
WITH (security_invoker = true) AS
SELECT * FROM public.profile_applications
WHERE status IN ('sent', 'acknowledged')
  AND applied_on <= (current_date - INTERVAL '14 days')
  AND status_updated_at <= (now() - INTERVAL '14 days');

-- ===== vacancies =====
CREATE TYPE public.vacancy_status AS ENUM ('live', 'archived', 'deleted');

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

CREATE OR REPLACE FUNCTION public.vacancies_validate_fn()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.application_email IS NULL OR btrim(NEW.application_email) = '' THEN RAISE EXCEPTION 'application_email_required'; END IF;
  IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN RAISE EXCEPTION 'application_email_invalid'; END IF;
  IF NEW.expires_at <= NEW.posted_at THEN RAISE EXCEPTION 'expiry_must_be_after_posted'; END IF;
  NEW.application_email := lower(btrim(NEW.application_email));
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER vacancies_validate_before_iu BEFORE INSERT OR UPDATE ON public.vacancies FOR EACH ROW EXECUTE FUNCTION public.vacancies_validate_fn();

CREATE INDEX idx_vacancies_status_expires ON public.vacancies(status, expires_at DESC);
CREATE INDEX idx_vacancies_expires ON public.vacancies(expires_at);

ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live vacancies" ON public.vacancies FOR SELECT TO anon, authenticated USING (status = 'live' AND expires_at > now());
CREATE POLICY "Public can view recent archived vacancies" ON public.vacancies FOR SELECT TO anon, authenticated USING (status = 'archived' AND expires_at > (now() - INTERVAL '30 days'));
CREATE POLICY "Admins can view all vacancies" ON public.vacancies FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert vacancies" ON public.vacancies FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins can update vacancies" ON public.vacancies FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete vacancies" ON public.vacancies FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.vacancies_lifecycle_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vacancies SET status = 'archived', updated_at = now() WHERE status = 'live' AND expires_at <= now();
  DELETE FROM public.vacancies WHERE status = 'archived' AND expires_at < (now() - INTERVAL '30 days');
END; $$;

-- ===== Email infrastructure =====
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN CREATE EXTENSION pg_cron; END IF; END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_template ON public.email_send_log(template_name);

-- Email suppression list (bounces, complaints, unsubscribes)
CREATE TABLE IF NOT EXISTS public.email_suppression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('bounce', 'complaint', 'unsubscribe', 'manual')),
  template_scope TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_suppression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages suppression" ON public.email_suppression FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_email_suppression_email ON public.email_suppression(email);

-- Unsubscribe tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  template_scope TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages unsubscribe tokens" ON public.email_unsubscribe_tokens FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Send state (for rate limiting / dedup)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  dedupe_key TEXT,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  send_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (template_name, recipient_email, dedupe_key)
);

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages send state" ON public.email_send_state FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ===== update_broadcasts =====
CREATE TABLE public.update_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_markdown text NOT NULL,
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.update_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read broadcasts" ON public.update_broadcasts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert broadcasts" ON public.update_broadcasts FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND sent_by = auth.uid());