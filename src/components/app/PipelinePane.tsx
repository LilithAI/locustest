import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type App = Database["public"]["Tables"]["profile_applications"]["Row"];

const POSITIVE = ["acknowledged", "interview_scheduled", "interviewed", "offer", "accepted"];
const RESPONDED = [...POSITIVE, "rejected"];

interface Props {
  userId: string;
}

export default function PipelinePane({ userId }: Props) {
  const [apps, setApps] = useState<App[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("profile_applications")
        .select("*")
        .eq("user_id", userId)
        .order("applied_on", { ascending: false });
      if (!mounted) return;
      if (error) {
        console.error("[PipelinePane]", error);
        setApps([]);
      } else {
        setApps((data ?? []) as App[]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const total = apps?.length ?? 0;
  const interviewing =
    apps?.filter((a) =>
      ["interview_scheduled", "interviewed"].includes(a.status),
    ).length ?? 0;
  const offers = apps?.filter((a) => ["offer", "accepted"].includes(a.status)).length ?? 0;
  const responded = apps?.filter((a) => RESPONDED.includes(a.status)).length ?? 0;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  const now = new Date();
  const stale =
    apps?.filter(
      (a) =>
        a.status === "sent" &&
        differenceInDays(now, parseISO(a.applied_on)) >= 14 &&
        differenceInDays(now, new Date(a.status_updated_at)) >= 14,
    ) ?? [];
  const recent = apps?.[0];

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))] flex flex-col h-full">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Your pipeline
      </div>
      <h3 className="mt-1 font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
        Applications
      </h3>

      {total === 0 ? (
        <div className="mt-4 flex-1 flex items-center">
          <p className="text-sm text-muted-foreground">
            Log your first application — firms notice effort.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 flex-1">
          {stale.length > 0 ? (
            <div className="flex items-start gap-2 border border-accent bg-accent/10 px-3 py-2">
              <AlertTriangle size={14} className="text-accent shrink-0 mt-0.5" />
              <span className="text-xs text-foreground">
                Follow up with{" "}
                <span className="font-bold">
                  {stale.length} stale app{stale.length === 1 ? "" : "s"}
                </span>{" "}
                (no response 14d+)
              </span>
            </div>
          ) : (
            <div className="border border-border bg-muted/20 px-3 py-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Response rate
              </span>{" "}
              <span className="font-heading text-sm font-extrabold text-foreground">
                {responseRate}%
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Sent" value={total} />
            <Stat label="Interview" value={interviewing} />
            <Stat label="Offers" value={offers} accent={offers > 0} />
          </div>

          {recent && (
            <p className="text-xs text-muted-foreground truncate">
              Latest: <span className="text-foreground">{recent.firm_name_snapshot}</span> ·{" "}
              {recent.role} · {formatDistanceToNow(parseISO(recent.applied_on), { addSuffix: true })}
            </p>
          )}
        </div>
      )}

      <Link
        to="/applications"
        className="mt-4 inline-flex items-center justify-between border-2 border-border bg-muted/30 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground hover:border-accent hover:text-accent transition-colors"
      >
        Open tracker
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border border-border px-2 py-2 text-center ${accent ? "border-accent bg-accent/5" : "bg-muted/20"}`}>
      <div className={`font-heading text-lg font-extrabold leading-none ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
