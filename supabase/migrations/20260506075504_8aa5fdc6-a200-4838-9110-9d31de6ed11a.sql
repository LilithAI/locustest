CREATE TYPE public.vacancy_queue_status AS ENUM ('pending', 'approved', 'rejected', 'duplicate');
CREATE TYPE public.vacancy_queue_source AS ENUM ('lawctopus', 'linkedin', 'firm_careers', 'manual');

CREATE TABLE public.vacancy_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.vacancy_queue_source NOT NULL,
  source_url text NOT NULL,
  source_firm text,
  source_title text,
  raw_text text,
  ai_extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.vacancy_queue_status NOT NULL DEFAULT 'pending',
  dedupe_hash text NOT NULL,
  duplicate_of uuid,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  promoted_vacancy_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vrq_status_discovered ON public.vacancy_review_queue (status, discovered_at DESC);
CREATE INDEX idx_vrq_dedupe_hash ON public.vacancy_review_queue (dedupe_hash);
CREATE UNIQUE INDEX idx_vrq_source_url_unique ON public.vacancy_review_queue (source_url);

ALTER TABLE public.vacancy_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opportunity admins can view queue"
  ON public.vacancy_review_queue FOR SELECT TO authenticated
  USING (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role));

CREATE POLICY "Opportunity admins can update queue"
  ON public.vacancy_review_queue FOR UPDATE TO authenticated
  USING (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role))
  WITH CHECK (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role));

CREATE POLICY "Opportunity admins can delete queue"
  ON public.vacancy_review_queue FOR DELETE TO authenticated
  USING (has_admin_scope(auth.uid(), 'opportunities_admin'::app_role));

CREATE POLICY "Service role can insert into queue"
  ON public.vacancy_review_queue FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_vrq_updated_at
  BEFORE UPDATE ON public.vacancy_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();