-- New table: bar_ai_generations
CREATE TABLE public.bar_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.bar_sources(id) ON DELETE CASCADE,
  generation_type text NOT NULL CHECK (generation_type IN ('pdf_extract_single', 'pdf_extract_batch', 'topic_draft')),
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  question_type_hint public.bar_question_type NULL,
  area_of_law_hint public.bar_area_of_law NULL,
  difficulty_hint public.bar_difficulty NULL,
  model text NOT NULL,
  prompt_tokens integer NULL,
  completion_tokens integer NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'parse_fail', 'validation_fail', 'ai_error', 'rate_limit', 'quota_exceeded')),
  error_message text NULL,
  challenges_created integer NOT NULL DEFAULT 0,
  duration_ms integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bar_ai_generations_source_id ON public.bar_ai_generations(source_id);
CREATE INDEX idx_bar_ai_generations_requested_by ON public.bar_ai_generations(requested_by);
CREATE INDEX idx_bar_ai_generations_created_at ON public.bar_ai_generations(created_at DESC);
CREATE INDEX idx_bar_ai_generations_outcome ON public.bar_ai_generations(outcome);

ALTER TABLE public.bar_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ai generations"
  ON public.bar_ai_generations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update ai generations"
  ON public.bar_ai_generations FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete ai generations"
  ON public.bar_ai_generations FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No INSERT policy: only the service role (edge function) inserts, bypassing RLS.

-- Add ai_generation_id to bar_challenges
ALTER TABLE public.bar_challenges
  ADD COLUMN ai_generation_id uuid NULL REFERENCES public.bar_ai_generations(id) ON DELETE SET NULL;

CREATE INDEX idx_bar_challenges_ai_generation_id ON public.bar_challenges(ai_generation_id);