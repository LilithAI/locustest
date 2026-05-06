CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT u.email
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE lower(p.display_name) = lower(p_username)
    LIMIT 1
  );
END;
$$;