
CREATE OR REPLACE FUNCTION public.list_admins()
 RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[], is_self boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    u.email::text AS email,
    array_agg(r.role::text ORDER BY r.role::text) AS roles,
    (p.id = auth.uid()) AS is_self
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role IN (
    'admin'::public.app_role,
    'opportunities_admin'::public.app_role,
    'waitlist_admin'::public.app_role,
    'bar_admin'::public.app_role,
    'broadcast_admin'::public.app_role
  )
  GROUP BY p.id, p.username, p.display_name, u.email
  ORDER BY p.username;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_user_for_admin(p_query text)
 RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_q := lower(btrim(coalesce(p_query, '')));
  IF v_q IS NULL OR length(v_q) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    u.email::text AS email,
    COALESCE(
      (SELECT array_agg(r.role::text ORDER BY r.role::text)
       FROM public.user_roles r
       WHERE r.user_id = p.id
         AND r.role IN (
           'admin'::public.app_role,
           'opportunities_admin'::public.app_role,
           'waitlist_admin'::public.app_role,
           'bar_admin'::public.app_role,
           'broadcast_admin'::public.app_role
         )
      ),
      ARRAY[]::text[]
    ) AS roles
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE
       lower(p.username) LIKE '%' || v_q || '%'
    OR lower(coalesce(p.display_name, '')) LIKE '%' || v_q || '%'
    OR lower(coalesce(u.email, '')) LIKE '%' || v_q || '%'
  ORDER BY
    (lower(p.username) = v_q) DESC,
    (lower(coalesce(u.email, '')) = v_q) DESC,
    p.username
  LIMIT 10;
END;
$function$;
