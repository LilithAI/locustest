ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_to_opportunities boolean NOT NULL DEFAULT false;