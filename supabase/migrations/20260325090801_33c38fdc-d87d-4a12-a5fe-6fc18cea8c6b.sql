ALTER TABLE public.bar_answers
  ADD COLUMN parent_id uuid REFERENCES public.bar_answers(id) ON DELETE CASCADE;

ALTER TABLE public.bar_answers
  DROP CONSTRAINT IF EXISTS bar_answers_question_id_fkey;

ALTER TABLE public.bar_answers
  ADD CONSTRAINT bar_answers_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.bar_questions(id) ON DELETE CASCADE;