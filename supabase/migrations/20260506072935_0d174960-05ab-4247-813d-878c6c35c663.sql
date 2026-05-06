-- Phase A: Portal-mode vacancies + tier taxonomy + practice area

-- 1) New enums
CREATE TYPE public.vacancy_application_mode AS ENUM ('email', 'external_url');

CREATE TYPE public.vacancy_tier AS ENUM (
  'tier_1', 'tier_2', 'tier_3', 'boutique', 'in_house', 'psu', 'big_4', 'other'
);

-- 2) Extend application_method enum on profile_applications with 'external'
ALTER TYPE public.application_method ADD VALUE IF NOT EXISTS 'external';

-- 3) Add new vacancy columns
ALTER TABLE public.vacancies
  ADD COLUMN application_mode public.vacancy_application_mode NOT NULL DEFAULT 'email',
  ADD COLUMN application_url text,
  ADD COLUMN tier public.vacancy_tier,
  ADD COLUMN practice_area text;

-- 4) Drop NOT NULL on application_email — trigger now enforces conditionally
ALTER TABLE public.vacancies ALTER COLUMN application_email DROP NOT NULL;

-- 5) Replace validation trigger function
CREATE OR REPLACE FUNCTION public.vacancies_validate_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.application_mode = 'email'::public.vacancy_application_mode THEN
    IF NEW.application_email IS NULL OR btrim(NEW.application_email) = '' THEN
      RAISE EXCEPTION 'application_email_required';
    END IF;
    IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'application_email_invalid';
    END IF;
    NEW.application_email := lower(btrim(NEW.application_email));
    -- Clear url when switching to email mode
    NEW.application_url := NULL;
  ELSIF NEW.application_mode = 'external_url'::public.vacancy_application_mode THEN
    IF NEW.application_url IS NULL OR btrim(NEW.application_url) = '' THEN
      RAISE EXCEPTION 'application_url_required';
    END IF;
    IF NEW.application_url !~* '^https?://' THEN
      RAISE EXCEPTION 'application_url_invalid';
    END IF;
    IF length(NEW.application_url) > 2000 THEN
      RAISE EXCEPTION 'application_url_too_long';
    END IF;
    NEW.application_url := btrim(NEW.application_url);
    -- Email is optional in portal mode; normalise if provided
    IF NEW.application_email IS NOT NULL AND btrim(NEW.application_email) <> '' THEN
      IF NEW.application_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'application_email_invalid';
      END IF;
      NEW.application_email := lower(btrim(NEW.application_email));
    ELSE
      NEW.application_email := NULL;
    END IF;
  END IF;

  IF NEW.expires_at <= NEW.posted_at THEN
    RAISE EXCEPTION 'expiry_must_be_after_posted';
  END IF;

  -- Trim practice_area
  IF NEW.practice_area IS NOT NULL THEN
    NEW.practice_area := NULLIF(btrim(NEW.practice_area), '');
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;