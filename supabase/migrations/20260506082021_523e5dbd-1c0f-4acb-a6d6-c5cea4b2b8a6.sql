DROP INDEX IF EXISTS public.idx_vrq_source_url_unique;
CREATE INDEX IF NOT EXISTS idx_vrq_source_url ON public.vacancy_review_queue(source_url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vrq_dedupe_hash_unique ON public.vacancy_review_queue(dedupe_hash);