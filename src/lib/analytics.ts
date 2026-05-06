// Locus first-party analytics tracker.
// Fire-and-forget. Honors DNT. No PII.

const ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-event`;
const ANON_KEY = "locus_anon_id";
const SESSION_KEY = "locus_session_id";

function getAnonId(): string {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    return "no-storage";
  }
}

function getSessionId(): string {
  try {
    let v = sessionStorage.getItem(SESSION_KEY);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, v);
    }
    return v;
  } catch {
    return "no-session";
  }
}

function getDevice(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getUtm(): Record<string, string> {
  try {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const v = p.get(k);
      if (v) out[k] = v.slice(0, 64);
    }
    return out;
  } catch {
    return {};
  }
}

function isDNT(): boolean {
  try {
    // @ts-expect-error legacy field
    return navigator.doNotTrack === "1" || window.doNotTrack === "1";
  } catch {
    return false;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  // Lazy import to avoid pulling supabase into bundles that don't need it
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { /* ignore */ }
  return {};
}

export async function track(event: string, props: Record<string, unknown> = {}): Promise<void> {
  if (isDNT()) return;
  if (typeof window === "undefined") return;

  const payload = {
    event,
    anon_id: getAnonId(),
    session_id: getSessionId(),
    path: window.location.pathname,
    referrer: document.referrer || null,
    device: getDevice(),
    utm: getUtm(),
    props,
  };

  // Try sendBeacon first (no perf cost, works during unload).
  // Beacon can't send custom Authorization headers, so we only use it for anon events.
  // For authenticated events, use fetch with keepalive.
  try {
    const authHeader = await getAuthHeader();
    if (Object.keys(authHeader).length === 0 && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Swallow: analytics must never break the app.
  }
}
