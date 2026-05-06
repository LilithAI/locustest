-- Phase C: opportunity targeting preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_tiers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_locations text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_practice_areas text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.target_tiers IS 'User-selected firm tiers for opportunity ranking (matches vacancy_tier enum values).';
COMMENT ON COLUMN public.profiles.target_locations IS 'User-selected target city/region strings for opportunity ranking.';
COMMENT ON COLUMN public.profiles.target_practice_areas IS 'User-selected practice area strings for opportunity ranking.';