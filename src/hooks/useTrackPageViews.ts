import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/analytics";

/**
 * Fires `page_view` on every route change, debounced 250ms to dodge double-renders.
 * Mount once at the layout level.
 */
export function useTrackPageViews(): void {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastPath.current = path;
      void track("page_view");
    }, 250);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [location.pathname]);
}
