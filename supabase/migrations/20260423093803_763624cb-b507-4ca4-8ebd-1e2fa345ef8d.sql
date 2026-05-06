DROP TRIGGER IF EXISTS sync_bar_question_answer_count_trigger ON public.bar_answers;
DROP TRIGGER IF EXISTS bar_answers_sync_count ON public.bar_answers;
DROP FUNCTION IF EXISTS public.sync_bar_question_answer_count() CASCADE;
DROP TABLE IF EXISTS public.bar_answers CASCADE;
DROP TABLE IF EXISTS public.bar_questions CASCADE;