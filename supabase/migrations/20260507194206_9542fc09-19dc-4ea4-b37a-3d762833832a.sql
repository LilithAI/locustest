CREATE TABLE public.firm_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_slug text NOT NULL REFERENCES public.firm_profiles(firm_slug) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  source_type text NOT NULL,
  source_excerpt text,
  applied_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_firm_edit_log_firm_slug ON public.firm_edit_log(firm_slug);
CREATE INDEX idx_firm_edit_log_created_at ON public.firm_edit_log(created_at DESC);

ALTER TABLE public.firm_edit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view edit log" ON public.firm_edit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert edit log" ON public.firm_edit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));