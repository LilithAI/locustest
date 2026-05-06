-- Search by username, display name, or email — admin-only.
CREATE OR REPLACE FUNCTION public.find_user_for_admin(p_query text)
RETURNS TABLE(id uuid, username text, display_name text, email text, is_already_admin boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    u.email,
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p.id AND r.role = 'admin'::public.app_role
    ) AS is_already_admin
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
$$;

REVOKE ALL ON FUNCTION public.find_user_for_admin(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_user_for_admin(text) TO authenticated;

-- List current admins — admin-only.
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(id uuid, username text, display_name text, email text, is_self boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    u.email,
    (p.id = auth.uid()) AS is_self
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role = 'admin'::public.app_role
  ORDER BY p.username;
END;
$$;

REVOKE ALL ON FUNCTION public.list_admins() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;

-- Grant admin role — admin-only, idempotent.
CREATE OR REPLACE FUNCTION public.grant_admin_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_role(uuid) TO authenticated;

-- Revoke admin role — admin-only, cannot revoke self.
CREATE OR REPLACE FUNCTION public.revoke_admin_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_revoke_self';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = p_user_id
     AND role = 'admin'::public.app_role;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin_role(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(uuid) TO authenticated;