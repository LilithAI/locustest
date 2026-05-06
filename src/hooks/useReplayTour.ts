import { useCallback } from "react";

/**
 * Returns a stable callback that replays the global product tour.
 * Implemented via a window global set by <AppTour /> in the Layout shell.
 */
export function useReplayTour() {
  return useCallback(() => {
    if (typeof window === "undefined") return;
    window.__locusReplayTour?.();
  }, []);
}
