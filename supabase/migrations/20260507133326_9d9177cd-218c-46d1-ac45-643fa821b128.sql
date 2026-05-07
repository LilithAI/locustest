CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_input text := btrim(coalesce(p_username, ''));
  v_email text;
BEGIN
  IF v_input = '' THEN RETURN NULL; END IF;

  IF position('@' in v_input) > 0 THEN
    SELECT u.email INTO v_email FROM auth.users u
    WHERE lower(u.email) = lower(v_input) LIMIT 1;
    RETURN v_email;
  END IF;

  SELECT u.email INTO v_email FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(p.username) = lower(v_input) LIMIT 1;
  IF v_email IS NOT NULL THEN RETURN v_email; END IF;

  SELECT u.email INTO v_email FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(coalesce(p.display_name,'')) = lower(v_input) LIMIT 1;
  RETURN v_email;
END;
$function$;