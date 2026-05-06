-- Sources: firm careers pages scraped weekly via Firecrawl
CREATE TABLE public.firm_careers_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  selector_hints JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  last_status TEXT,           -- 'success' | 'error' | 'no_change'
  last_error TEXT,
  scrape_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fcs_active ON public.firm_careers_sources(active) WHERE active = true;
CREATE INDEX idx_fcs_firm_slug ON public.firm_careers_sources(firm_slug);

ALTER TABLE public.firm_careers_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opps admins read sources"
  ON public.firm_careers_sources FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'opportunities_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps admins insert sources"
  ON public.firm_careers_sources FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'opportunities_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps admins update sources"
  ON public.firm_careers_sources FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'opportunities_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps admins delete sources"
  ON public.firm_careers_sources FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'opportunities_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_fcs_updated_at
  BEFORE UPDATE ON public.firm_careers_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();