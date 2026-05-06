CREATE TABLE public.update_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_markdown text NOT NULL,
  body_html text NOT NULL,
  preheader text,
  cta_label text,
  cta_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_by uuid,
  sent_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.update_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcasts"
ON public.update_broadcasts FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert broadcasts"
ON public.update_broadcasts FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins can update broadcasts"
ON public.update_broadcasts FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete broadcasts"
ON public.update_broadcasts FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_broadcasts_set_updated_at
BEFORE UPDATE ON public.update_broadcasts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_update_broadcasts_created_at ON public.update_broadcasts (created_at DESC);