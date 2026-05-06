-- Make display_name nullable so OAuth users can be created without one
ALTER TABLE public.profiles ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT '';

-- Update trigger to handle OAuth users (no display_name in metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), '')
  );
  RETURN NEW;
END;
$function$;