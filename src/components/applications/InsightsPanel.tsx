import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { METHOD_OPTIONS } from "./methodMeta";

type App = Database["public"]["Tables"]["profile_applications"]["Row"];
type Status = App["status"];

const POSITIVE: Status[] = ["acknowledged", "interview_scheduled", "interviewed", "offer", "accepted"];
const RESPONDED: Status[] = [...POSITIVE, "rejected"];

interface Props {
  apps: App[];
}

export default function InsightsPanel({ apps }: Props) {
  const insights = useMemo(() => {
    const total = apps.length;
    if (total === 0) return null;

    const responded = apps.filter((a) => RESPONDED.includes(a.status)).length;
    const responseRate = Math.round((responded / total) * 100);

    // Avg days to first response (status_updated_at - applied_on for responded apps)
    const respondedApps = apps.filter((a) => RESPONDED.includes(a.status));
    let avgDays: number | null = null;
    if (respondedApps.length > 0) {
      const totalDays = respondedApps.reduce((acc, a) => {
        const d = differenceInDays(new Date(a.status_updated_at), parseISO(a.applied_on));
        return acc + Math.max(0, d);
      }, 0);
      avgDays = Math.round(totalDays / respondedApps.length);
    }

    // Funnel
    const sent = total;
    const acked = apps.filter((a) => ["acknowledged", "interview_scheduled", "interviewed", "offer", "accepted"].includes(a.status)).length;
    const interviewed = apps.filter((a) => ["interview_scheduled", "interviewed", "offer", "accepted"].includes(a.status)).length;
    const offered = apps.filter((a) => ["offer", "accepted"].includes(a.status)).length;

    // Top 3 roles
    const roleCounts = new Map<string, number>();
    apps.forEach((a) => {
      const r = a.role.trim();
      roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
    });
    const topRoles = [...roleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Best method by response rate (min 2 apps)
    const methodStats = new Map<string, { total: number; responded: number }>();
    apps.forEach((a) => {
      const cur = methodStats.get(a.method) ?? { total: 0, responded: 0 };
      cur.total += 1;
      if (RESPONDED.includes(a.status)) cur.responded += 1;
      methodStats.set(a.method, cur);
    });
    const bestMethod = [...methodStats.entries()]
      .filter(([, s]) => s.total >= 2)
      .map(([m, s]) => ({ method: m, rate: Math.round((s.responded / s.total) * 100), total: s.total }))
      .sort((a, b) => b.rate - a.rate)[0] ?? null;

    return { total, responseRate, avgDays, sent, acked, interviewed, offered, topRoles, bestMethod };
  }, [apps]);

  if (!insights) return null;

  const methodLabel = (m: string) => METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m;

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))]">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h2 className="font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
          Your insights
        </h2>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Private to you
        </span>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <FunnelStep label="Sent" value={insights.sent} />
        <FunnelStep label="Acknowledged" value={insights.acked} />
        <FunnelStep label="Interviewed" value={insights.interviewed} />
        <FunnelStep label="Offered" value={insights.offered} accent />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard
          label="Response rate"
          value={`${insights.responseRate}%`}
          sub={`${apps.filter((a) => a.status === "sent").length} pending`}
        />
        <InsightCard
          label="Avg days to response"
          value={insights.avgDays !== null ? `${insights.avgDays}d` : "—"}
          sub={insights.avgDays !== null ? "across responded apps" : "no responses yet"}
        />
        <InsightCard
          label="Best method"
          value={insights.bestMethod ? methodLabel(insights.bestMethod.method) : "—"}
          sub={insights.bestMethod ? `${insights.bestMethod.rate}% response · ${insights.bestMethod.total} apps` : "log 2+ per method"}
        />
      </div>

      {insights.topRoles.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Top roles applied to
          </p>
          <div className="flex flex-wrap gap-2">
            {insights.topRoles.map(([role, count]) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 border border-border bg-muted/30 px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-foreground">{role}</span>
                <span className="font-mono text-[10px] text-muted-foreground">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelStep({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border border-border bg-muted/20 px-2 py-3 text-center ${accent ? "border-accent bg-accent/5" : ""}`}>
      <div className={`font-heading text-2xl font-extrabold leading-none ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-border bg-muted/20 p-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-heading text-xl font-extrabold text-foreground leading-none">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
