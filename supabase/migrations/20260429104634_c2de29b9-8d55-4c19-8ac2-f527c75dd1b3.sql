ALTER TABLE public.beta_testers
  DROP CONSTRAINT IF EXISTS beta_testers_slot_number_check;

ALTER TABLE public.beta_testers
  ADD CONSTRAINT beta_testers_slot_number_positive_check
  CHECK (slot_number >= 1);