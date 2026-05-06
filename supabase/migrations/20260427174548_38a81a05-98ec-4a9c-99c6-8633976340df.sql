
-- Make beta_testers open for self-claim
ALTER TABLE public.beta_testers
  ALTER COLUMN code DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intro_line_index smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now();

-- Mark the original 7 hardcoded testers as public so they appear on the founding board
UPDATE public.beta_testers SET is_public = true WHERE code IS NOT NULL;

-- RPC: anyone can claim the next slot
CREATE OR REPLACE FUNCTION public.claim_beta_slot(
  p_name text,
  p_email text,
  p_user_id uuid,
  p_is_public boolean
) RETURNS public.beta_testers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_slot int;
  v_intro smallint;
  v_row public.beta_testers;
BEGIN
  v_name := NULLIF(btrim(coalesce(p_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'name_required';
  END IF;
  IF length(v_name) > 80 THEN
    v_name := substr(v_name, 1, 80);
  END IF;

  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO v_slot FROM public.beta_testers;
  v_intro := (floor(random() * 8))::smallint;

  INSERT INTO public.beta_testers (
    slot_number, display_name, code, email, user_id, is_public, intro_line_index, claimed_at
  ) VALUES (
    v_slot, v_name, NULL,
    NULLIF(btrim(coalesce(p_email, '')), ''),
    p_user_id,
    COALESCE(p_is_public, false),
    v_intro,
    now()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_beta_slot(text, text, uuid, boolean) TO anon, authenticated;
