-- 1. Add answer_count column
ALTER TABLE public.bar_questions ADD COLUMN answer_count integer NOT NULL DEFAULT 0;

-- 2. Backfill from existing answers
UPDATE public.bar_questions SET answer_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT question_id, COUNT(*) AS cnt FROM public.bar_answers GROUP BY question_id
) sub
WHERE bar_questions.id = sub.question_id;

-- 3. Trigger function to keep answer_count in sync
CREATE OR REPLACE FUNCTION public.sync_bar_question_answer_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bar_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bar_questions SET answer_count = GREATEST(answer_count - 1, 0) WHERE id = OLD.question_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.question_id IS DISTINCT FROM NEW.question_id THEN
    UPDATE public.bar_questions SET answer_count = GREATEST(answer_count - 1, 0) WHERE id = OLD.question_id;
    UPDATE public.bar_questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_bar_answer_change
AFTER INSERT OR DELETE OR UPDATE OF question_id ON public.bar_answers
FOR EACH ROW EXECUTE FUNCTION public.sync_bar_question_answer_count();

-- 4. Indexes for feed performance
CREATE INDEX IF NOT EXISTS idx_bar_questions_created_at ON public.bar_questions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bar_questions_votes ON public.bar_questions (votes DESC);
CREATE INDEX IF NOT EXISTS idx_bar_answers_question ON public.bar_answers (question_id, is_top DESC, votes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bar_answers_parent ON public.bar_answers (parent_id);

-- 5. Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_answers;