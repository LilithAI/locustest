import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const Launch = lazy(() => import("@/pages/Launch"));

export const LAUNCH_DATE = new Date("2026-05-27T00:00:00+05:30");
const BYPASS_KEY = "locus_launch_bypass_v1";

function hasBypass(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("preview") === "1") {
      sessionStorage.setItem(BYPASS_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

function isAdminPath(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/admin");
}

type GateState = "loading" | "show" | "pass";

export default function LaunchGate({ children }: { children: ReactNode }) {
  const launched = Date.now() >= LAUNCH_DATE.getTime();

  const [state, setState] = useState<GateState>(() => {
    if (launched) return "pass";
    if (hasBypass()) return "pass";
    if (isAdminPath()) return "pass";
    return "loading";
  });

  useEffect(() => {
    if (state !== "loading") return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      // Logged-in users keep using Locus (banner shows the announcement).
      setState(data.session ? "pass" : "show");
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-sm text-white/60 font-mono">Loading…</div>
      </div>
    );
  }

  if (state === "show") {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-sm text-white/60 font-mono">Loading…</div>
          </div>
        }
      >
        <Launch />
      </Suspense>
    );
  }

  return <>{children}</>;
}
