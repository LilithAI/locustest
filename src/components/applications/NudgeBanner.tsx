import { useEffect, useState } from "react";
import { X, Bell } from "lucide-react";
import { format, parseISO } from "date-fns";
import StatusPill from "./StatusPill";

const DISMISS_KEY = "locus.applications.nudgeDismissedUntil";

type StaleApp = {
  id: string;
  firm_name_snapshot: string;
  role: string;
  applied_on: string;
  status: "sent" | "acknowledged";
};

export default function NudgeBanner({ stale }: { stale: StaleApp[] }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until || Date.now() > Number(until)) setDismissed(false);
  }, []);

  if (dismissed || stale.length === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setDismissed(true);
  };

  return (
    <div className="relative border-2 border-accent bg-accent/5 p-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-accent" />
        <div className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
          Time to follow up
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {stale.length} application{stale.length === 1 ? "" : "s"} stuck for 14+ days. A short follow-up email often works.
      </p>
      <ul className="mt-3 space-y-1.5">
        {stale.slice(0, 3).map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 border border-border/60 bg-background px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-foreground">{a.firm_name_snapshot}</span>
              <span className="text-muted-foreground"> — {a.role}</span>
            </div>
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              {format(parseISO(a.applied_on), "d MMM")}
            </span>
            <StatusPill status={a.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
