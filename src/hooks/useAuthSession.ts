import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single shared auth session, cached at module scope.
 * Avoids every page re-running supabase.auth.getSession() on mount,
 * which was causing big skeleton stalls when switching routes.
 */

type Status = "loading" | "ready";

let cachedSession: Session | null = null;
let status: Status = "loading";
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      cachedSession = data.session ?? null;
    } catch {
      cachedSession = null;
    }
    status = "ready";
    notify();

    supabase.auth.onAuthStateChange((_event, session) => {
      cachedSession = session ?? null;
      status = "ready";
      notify();
    });
  })();
  return initPromise;
}

export function useAuthSession() {
  const [, force] = useState(0);

  useEffect(() => {
    init();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return {
    session: cachedSession,
    userId: cachedSession?.user?.id ?? null,
    ready: status === "ready",
  };
}
