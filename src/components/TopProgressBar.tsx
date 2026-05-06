import { useEffect, useState } from "react";

/**
 * Thin top progress bar shown while a lazy route chunk loads.
 * Renders as a Suspense fallback — the previous page stays visible underneath.
 */
export default function TopProgressBar() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const tick = () => {
      if (cancelled) return;
      setProgress((p) => {
        // Ease toward 90% but never reach it; the unmount handles the finish.
        const next = p + Math.max(0.5, (90 - p) * 0.06);
        return Math.min(next, 90);
      });
      raf = window.setTimeout(tick, 120) as unknown as number;
    };

    raf = window.setTimeout(tick, 120) as unknown as number;
    return () => {
      cancelled = true;
      window.clearTimeout(raf);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.8)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
