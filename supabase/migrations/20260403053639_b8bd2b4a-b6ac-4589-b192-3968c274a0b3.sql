
CREATE TABLE public.visit_counter (
  id integer PRIMARY KEY DEFAULT 1,
  count bigint NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.visit_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visit count"
ON public.visit_counter FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.visit_counter (id, count) VALUES (1, 0);

CREATE OR REPLACE FUNCTION public.increment_visit_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  UPDATE public.visit_counter SET count = count + 1 WHERE id = 1 RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;
