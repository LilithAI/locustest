import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

export type AdminScope =
  | "admin"
  | "opportunities_admin"
  | "waitlist_admin"
  | "bar_admin"
  | "broadcast_admin";

const ADMIN_SCOPES: AdminScope[] = [
  "admin",
  "opportunities_admin",
  "waitlist_admin",
  "bar_admin",
  "broadcast_admin",
];

export interface AdminAccess {
  ready: boolean;
  isAdmin: boolean;
  scopes: AdminScope[];
  hasScope: (scope: AdminScope) => boolean;
  hasAnyScope: boolean;
}

/**
 * Returns the current user's admin scopes.
 * - `isAdmin` is true only for full admins (role = 'admin').
 * - `hasScope(s)` is true if user is full admin OR has the specific scoped role.
 * - `hasAnyScope` is true if the user has at least one admin-family role
 *    (used to gate the /admin shell entry).
 */
export function useAdminAccess(): AdminAccess {
  const { userId, ready: authReady } = useAuthSession();
  const [scopes, setScopes] = useState<AdminScope[] | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      setScopes([]);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ADMIN_SCOPES);
      if (!mounted) return;
      const next = ((data ?? []) as { role: string }[])
        .map((r) => r.role as AdminScope)
        .filter((r) => ADMIN_SCOPES.includes(r));
      setScopes(next);
    })();
    return () => {
      mounted = false;
    };
  }, [userId, authReady]);

  const ready = authReady && scopes !== null;
  const list = scopes ?? [];
  const isAdmin = list.includes("admin");
  const hasScope = (scope: AdminScope) => isAdmin || list.includes(scope);

  return {
    ready,
    isAdmin,
    scopes: list,
    hasScope,
    hasAnyScope: list.length > 0,
  };
}

/**
 * Back-compat: returns a tri-state boolean (null while loading).
 * Existing callers that only care about full admin access keep working.
 */
export function useAdminRole(): boolean | null {
  const { ready, isAdmin } = useAdminAccess();
  if (!ready) return null;
  return isAdmin;
}
