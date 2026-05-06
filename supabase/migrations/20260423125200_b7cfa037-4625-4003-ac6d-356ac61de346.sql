ALTER TABLE public.bar_ai_generations DROP CONSTRAINT IF EXISTS bar_ai_generations_generation_type_check;
ALTER TABLE public.bar_ai_generations ADD CONSTRAINT bar_ai_generations_generation_type_check
  CHECK (generation_type IN ('pdf_extract_single', 'pdf_extract_batch', 'topic_draft', 'topic_suggest'));
ALTER TABLE public.bar_ai_generations ALTER COLUMN source_id DROP NOT NULL;