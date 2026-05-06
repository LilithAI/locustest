-- The original check constraint capped beta_testers.slot_number at 7,
-- which silently rejected the 8th (and later) founding-tester claim with
-- a 400 from PostgREST. The intent is a rolling counter, not a hard cap.
ALTER TABLE public.beta_testers
  DROP CONSTRAINT IF EXISTS beta_testers_slot_number_check;

-- Keep slot numbers strictly positive.
ALTER TABLE public.beta_testers
  ADD CONSTRAINT beta_testers_slot_number_positive_check
  CHECK (slot_number >= 1);
