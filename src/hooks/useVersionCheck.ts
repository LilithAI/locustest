import { useEffect, useRef } from "react";
import { reloadOnce } from "@/lib/chunkRecovery";

/**
 * Polls /version.json and fires `onUpdateAvailable` when the deployed build
 * version differs from the version baked into this bundle.
 *
 * Also, on first mount, defensively unregisters any leftover service workers
 * and clears CacheStorage entries — these are the most common cause of an
 * old build appearing to "stick" in Safari/Chrome on a custom domain.
 *
 * - Skipped in dev (HMR makes it pointless and noisy).
 * - Skipped inside iframes / Lovable preview hosts (avoids spamming editors).
 */
export function useVersionCheck(
  onUpdateAvailable: () => void,
  intervalMs: number = 30_000
) {
  const firedRef = useRef(false);
  const callbackRef = useRef(onUpdateAvailable);
  callbackRef.current = onUpdateAvailable;

  useEffect(() => {
    if (import.meta.env.DEV) return;

    // Skip inside iframes (Lovable preview, embeds, etc.)
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }
    if (inIframe) return;

    const host = window.location.hostname;
    const isLovableHost =
      host.includes("id-preview--") || host.includes("lovableproject.com");

    // Avoid prompting refresh on Lovable in-editor preview/staging domains.
    // Production custom domains (locus.legal) AND the published *.lovable.app
    // subdomain still get the check.
    if (isLovableHost) return;

    // Defensive cleanup: kill any service worker / cache that a previous
    // version of the app (or a browser extension) may have installed.
    // ONE-SHOT EVER per browser — gated by localStorage so we don't nuke
    // the HTTP cache on every page load (that was causing massive cache
    // thrash and slow re-loads on mobile).
    const CLEANUP_FLAG = "locus_sw_cleaned_v1";
    try {
      if (!localStorage.getItem(CLEANUP_FLAG)) {
        (async () => {
          try {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
            }
          } catch {
            /* ignore */
          }
          try {
            if (typeof caches !== "undefined" && caches?.keys) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
            }
          } catch {
            /* ignore */
          }
          try {
            localStorage.setItem(CLEANUP_FLAG, "1");
          } catch {
            /* ignore */
          }
        })();
      }
    } catch {
      /* localStorage unavailable — skip cleanup entirely */
    }

    const currentVersion =
      typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : null;
    if (!currentVersion) return;

    const check = async () => {
      if (firedRef.current) return;
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (!data?.version) return;
        if (data.version === currentVersion) return;

      // Skip auto-reload while the user is on an auth-sensitive screen or
      // mid-OAuth roundtrip. Forcing a reload here can race setSession and
      // produce a flash mid-login. The next navigation re-runs the check.
      const path = window.location.pathname;
      const authPath =
        path === "/auth" ||
        path === "/reset-password" ||
        path === "/choose-username" ||
        path.startsWith("/admin/login");
      const oauthInFlight =
        window.location.hash.includes("access_token=") ||
        (() => {
          try { return !!sessionStorage.getItem("post_oauth_redirect"); }
          catch { return false; }
        })();
      if (authPath || oauthInFlight) return;

        firedRef.current = true;

        // If we already have a stale-version hint (?v=… still in the URL, or
        // we just came back from a cache-buster reload that main.tsx cleaned
        // up) and the build STILL doesn't match, the HTML itself is being
        // served stale. Route through chunkRecovery's counter so we can't
        // infinite-loop. If exhausted, fall back to the manual toast.
        const params = new URLSearchParams(window.location.search);
        let recentCachebust = false;
        try { recentCachebust = sessionStorage.getItem("locus_recent_cachebust") === "1"; }
        catch { /* ignore */ }
        if (params.has("v") || recentCachebust) {
          if (!reloadOnce()) {
            callbackRef.current();
          }
          return;
        }

        callbackRef.current();
      } catch {
        // Network blip — try again next tick.
      }
    };

    // Run the FIRST check immediately on load (not after 5s). This is the
    // change that actually catches users opening the site fresh on a stale
    // CDN edge — they'll be auto-redirected with a cache-buster.
    check();

    const interval = window.setInterval(check, intervalMs);
    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
