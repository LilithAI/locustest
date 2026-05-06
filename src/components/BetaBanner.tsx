import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "locus_beta_banner_dismissed_v1";

export default function BetaBanner() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;
  if (pathname.startsWith("/beta")) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden sm:block max-w-[320px] animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 border-2 border-accent bg-black px-3 py-2 text-xs text-white shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <span className="shrink-0 border-2 border-accent bg-accent px-1.5 py-0.5 font-sora text-[10px] font-black uppercase tracking-wider text-black">
          Beta
        </span>
        <p className="min-w-0 flex-1 font-inter leading-tight">
          Spotted a bug?{" "}
          <Link
            to="/beta"
            className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
          >
            Tell us <ArrowRight size={11} />
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss beta banner"
          className="shrink-0 rounded-sm p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
