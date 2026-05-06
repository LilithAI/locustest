-- Helper: full admin OR has a specific scoped role
CREATE OR REPLACE FUNCTION public.has_admin_scope(uid uuid, scope public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid
      AND role IN ('admin'::public.app_role, scope)
  );
$$;

-- ============ VACANCIES ============
DROP POLICY IF EXISTS "Admins can delete vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admins can insert vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admins can update vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "Admins can view all vacancies" ON public.vacancies;

CREATE POLICY "Opportunity admins can delete vacancies" ON public.vacancies
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can insert vacancies" ON public.vacancies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role) AND created_by = auth.uid());

CREATE POLICY "Opportunity admins can update vacancies" ON public.vacancies
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can view all vacancies" ON public.vacancies
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

-- ============ CFPS ============
DROP POLICY IF EXISTS "Admins can delete cfps" ON public.cfps;
DROP POLICY IF EXISTS "Admins can insert cfps" ON public.cfps;
DROP POLICY IF EXISTS "Admins can update cfps" ON public.cfps;
DROP POLICY IF EXISTS "Admins can view all cfps" ON public.cfps;

CREATE POLICY "Opportunity admins can delete cfps" ON public.cfps
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can insert cfps" ON public.cfps
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role) AND created_by = auth.uid());

CREATE POLICY "Opportunity admins can update cfps" ON public.cfps
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can view all cfps" ON public.cfps
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

-- ============ MOOTS ============
DROP POLICY IF EXISTS "Admins can delete moots" ON public.moots;
DROP POLICY IF EXISTS "Admins can insert moots" ON public.moots;
DROP POLICY IF EXISTS "Admins can update moots" ON public.moots;
DROP POLICY IF EXISTS "Admins can view all moots" ON public.moots;

CREATE POLICY "Opportunity admins can delete moots" ON public.moots
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can insert moots" ON public.moots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role) AND created_by = auth.uid());

CREATE POLICY "Opportunity admins can update moots" ON public.moots
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can view all moots" ON public.moots
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

-- ============ COMPETITIONS ============
DROP POLICY IF EXISTS "Admins can delete competitions" ON public.competitions;
DROP POLICY IF EXISTS "Admins can insert competitions" ON public.competitions;
DROP POLICY IF EXISTS "Admins can update competitions" ON public.competitions;
DROP POLICY IF EXISTS "Admins can view all competitions" ON public.competitions;

CREATE POLICY "Opportunity admins can delete competitions" ON public.competitions
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can insert competitions" ON public.competitions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role) AND created_by = auth.uid());

CREATE POLICY "Opportunity admins can update competitions" ON public.competitions
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

CREATE POLICY "Opportunity admins can view all competitions" ON public.competitions
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'opportunities_admin'::public.app_role));

-- ============ FIRM SUGGESTIONS ============
DROP POLICY IF EXISTS "Admins delete suggestions" ON public.firm_suggestions;
DROP POLICY IF EXISTS "Admins update suggestions" ON public.firm_suggestions;
DROP POLICY IF EXISTS "Admins view all suggestions" ON public.firm_suggestions;

CREATE POLICY "Waitlist admins delete suggestions" ON public.firm_suggestions
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'waitlist_admin'::public.app_role));

CREATE POLICY "Waitlist admins update suggestions" ON public.firm_suggestions
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'waitlist_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'waitlist_admin'::public.app_role));

CREATE POLICY "Waitlist admins view all suggestions" ON public.firm_suggestions
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'waitlist_admin'::public.app_role));

-- ============ BAR ============
DROP POLICY IF EXISTS "Admins can read all challenges" ON public.bar_challenges;
DROP POLICY IF EXISTS "Admins delete challenges" ON public.bar_challenges;
DROP POLICY IF EXISTS "Admins insert challenges" ON public.bar_challenges;
DROP POLICY IF EXISTS "Admins update challenges" ON public.bar_challenges;

CREATE POLICY "Bar admins can read all challenges" ON public.bar_challenges
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

CREATE POLICY "Bar admins delete challenges" ON public.bar_challenges
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

CREATE POLICY "Bar admins insert challenges" ON public.bar_challenges
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

CREATE POLICY "Bar admins update challenges" ON public.bar_challenges
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage sources delete" ON public.bar_sources;
DROP POLICY IF EXISTS "Admins manage sources insert" ON public.bar_sources;
DROP POLICY IF EXISTS "Admins manage sources select" ON public.bar_sources;
DROP POLICY IF EXISTS "Admins manage sources update" ON public.bar_sources;

CREATE POLICY "Bar admins manage sources delete" ON public.bar_sources
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));
CREATE POLICY "Bar admins manage sources insert" ON public.bar_sources
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));
CREATE POLICY "Bar admins manage sources select" ON public.bar_sources
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));
CREATE POLICY "Bar admins manage sources update" ON public.bar_sources
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete ai generations" ON public.bar_ai_generations;
DROP POLICY IF EXISTS "Admins update ai generations" ON public.bar_ai_generations;
DROP POLICY IF EXISTS "Admins view ai generations" ON public.bar_ai_generations;

CREATE POLICY "Bar admins delete ai generations" ON public.bar_ai_generations
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));
CREATE POLICY "Bar admins update ai generations" ON public.bar_ai_generations
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));
CREATE POLICY "Bar admins view ai generations" ON public.bar_ai_generations
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete attempts" ON public.bar_attempts;
CREATE POLICY "Bar admins delete attempts" ON public.bar_attempts
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'bar_admin'::public.app_role));

-- ============ BROADCASTS ============
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.update_broadcasts;
DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.update_broadcasts;
DROP POLICY IF EXISTS "Admins can update broadcasts" ON public.update_broadcasts;
DROP POLICY IF EXISTS "Admins can view broadcasts" ON public.update_broadcasts;

CREATE POLICY "Broadcast admins can delete broadcasts" ON public.update_broadcasts
  FOR DELETE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'broadcast_admin'::public.app_role));
CREATE POLICY "Broadcast admins can insert broadcasts" ON public.update_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_scope(auth.uid(), 'broadcast_admin'::public.app_role) AND created_by = auth.uid());
CREATE POLICY "Broadcast admins can update broadcasts" ON public.update_broadcasts
  FOR UPDATE TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'broadcast_admin'::public.app_role))
  WITH CHECK (public.has_admin_scope(auth.uid(), 'broadcast_admin'::public.app_role));
CREATE POLICY "Broadcast admins can view broadcasts" ON public.update_broadcasts
  FOR SELECT TO authenticated
  USING (public.has_admin_scope(auth.uid(), 'broadcast_admin'::public.app_role));

-- ============ RPCs: replace single-role grant/revoke with role-aware versions ============

DROP FUNCTION IF EXISTS public.grant_admin_role(uuid);
DROP FUNCTION IF EXISTS public.revoke_admin_role(uuid);
DROP FUNCTION IF EXISTS public.list_admins();
DROP FUNCTION IF EXISTS public.find_user_for_admin(text);

CREATE OR REPLACE FUNCTION public.grant_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id_required'; END IF;
  IF p_role NOT IN ('admin','opportunities_admin','waitlist_admin','bar_admin','broadcast_admin') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id_required'; END IF;
  IF p_role NOT IN ('admin','opportunities_admin','waitlist_admin','bar_admin','broadcast_admin') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  -- Block self-revoking the full admin role
  IF p_role = 'admin'::public.app_role AND p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_revoke_self_admin';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = p_user_id
     AND role = p_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[], is_self boolean)
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
$$;

CREATE OR REPLACE FUNCTION public.find_user_for_admin(p_query text)
RETURNS TABLE(id uuid, username text, display_name text, email text, roles text[])
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
$$;