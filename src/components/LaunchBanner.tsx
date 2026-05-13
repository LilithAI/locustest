import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { LAUNCH_DATE } from "./LaunchGate";

const STORAGE_KEY = "locus_launch_banner_dismissed_v1";

export default function LaunchBanner() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (Date.now() >= LAUNCH_DATE.getTime()) return null;
  if (dismissed) return null;
  if (pathname.startsWith("/admin")) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div className="sticky top-0 z-50 border-b-2 border-accent bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <span className="shrink-0 border-2 border-accent bg-accent px-1.5 py-0.5 font-sora text-[10px] font-black uppercase tracking-wider text-black">
          Public 27 May
        </span>
        <p className="min-w-0 flex-1 font-inter leading-tight">
          Locus goes public 27 May 2026. Beta accounts will be wiped during migration.{" "}
          <Link
            to="/launch"
            className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
          >
            Read more <ArrowRight size={11} />
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss launch banner"
          className="shrink-0 rounded-sm p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
