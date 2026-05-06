import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download as DownloadIcon,
  Eye,
  RefreshCw,
  Smartphone,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAccess } from "@/hooks/useAdminRole";

type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_HOURS: Record<Range, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

interface Summary {
  active_users: number;
  active_users_prev: number;
  page_views: number;
  page_views_prev: number;
  signups: number;
  signups_prev: number;
  installs: number;
  installs_prev: number;
  standalone_sessions: number;
  profiles_total: number;
}

interface InstallFunnel {
  shown: number;
  clicked: number;
  dismissed: number;
  accepted: number;
  installed: number;
  standalone_sessions: number;
  android: number;
  ios: number;
}

interface SeriesRow {
  day: string;
  dau: number;
  page_views: number;
  signups: number;
}

interface PathRow {
  path: string;
  views: number;
  uniques: number;
}

interface ReferrerRow {
  referrer: string;
  sessions: number;
}

interface RecentRow {
  id: string;
  created_at: string;
  event: string;
  user_id: string | null;
  anon_id: string | null;
  path: string | null;
  props: Record<string, unknown>;
}

function StatCard({
  label,
  value,
  delta,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  sub?: string;
  icon: typeof Users;
  loading?: boolean;
}) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="font-heading text-3xl font-black leading-none">
        {loading ? "—" : value}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {showDelta && !loading && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 border border-foreground ${
              positive ? "bg-accent text-accent-foreground" : "bg-foreground text-background"
            }`}
          >
            {positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta!).toFixed(0)}%
          </span>
        )}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

function deltaPct(now: number, prev: number): number | null {
  if (prev === 0) return now > 0 ? 100 : null;
  return ((now - prev) / prev) * 100;
}

export default function AdminInsights() {
  usePageMeta({
    title: "Insights — Locus Admin",
    description: "Live product analytics for Locus.",
    path: "/admin/insights",
  });

  const { isAdmin, ready: adminReady } = useAdminAccess();
  const adminLoading = !adminReady;
  const [range, setRange] = useState<Range>("7d");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<InstallFunnel | null>(null);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const hours = RANGE_HOURS[range];
  const days = Math.max(1, Math.round(hours / 24));

  const load = async () => {
    setLoading(true);
    try {
      const [s, f, ts, tp, tr] = await Promise.all([
        supabase.rpc("analytics_summary", { p_hours: hours }),
        supabase.rpc("analytics_install_funnel", { p_days: days }),
        supabase.rpc("analytics_timeseries", { p_days: Math.min(90, days) }),
        supabase.rpc("analytics_top_paths", { p_hours: hours, p_limit: 20 }),
        supabase.rpc("analytics_top_referrers", { p_days: days, p_limit: 10 }),
      ]);
      if (s.data) setSummary(s.data as unknown as Summary);
      if (f.data) setFunnel(f.data as unknown as InstallFunnel);
      if (ts.data) setSeries(ts.data as SeriesRow[]);
      if (tp.data) setPaths(tp.data as PathRow[]);
      if (tr.data) setReferrers(tr.data as ReferrerRow[]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecent = async () => {
    const { data } = await supabase.rpc("analytics_recent", { p_limit: 50 });
    if (data) setRecent(data as RecentRow[]);
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      void load();
      void loadRecent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, isAdmin, adminLoading]);

  // Live tail auto-refresh every 5s
  useEffect(() => {
    if (!isAdmin) return;
    const id = window.setInterval(loadRecent, 5000);
    return () => window.clearInterval(id);
  }, [isAdmin]);

  const seriesFmt = useMemo(
    () =>
      series.map((r) => ({
        ...r,
        label: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    [series]
  );

  if (!adminLoading && !isAdmin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Console / Insights
          </p>
          <h1 className="font-heading text-3xl md:text-4xl font-black flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-accent" />
            Insights
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live product analytics. Page views, signups, install funnel, top paths.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex border-2 border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            {(Object.keys(RANGE_HOURS) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest border-r border-foreground last:border-r-0 ${
                  range === r ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
              void loadRecent();
            }}
            disabled={loading}
            className="border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={`Active users · ${range}`}
          value={summary?.active_users ?? 0}
          delta={summary ? deltaPct(summary.active_users, summary.active_users_prev) : null}
          sub="vs prev period"
          icon={Users}
          loading={loading}
        />
        <StatCard
          label={`Page views · ${range}`}
          value={summary?.page_views ?? 0}
          delta={summary ? deltaPct(summary.page_views, summary.page_views_prev) : null}
          sub="vs prev period"
          icon={Eye}
          loading={loading}
        />
        <StatCard
          label={`New signups · ${range}`}
          value={summary?.signups ?? 0}
          delta={summary ? deltaPct(summary.signups, summary.signups_prev) : null}
          sub={`${summary?.profiles_total ?? 0} total`}
          icon={Activity}
          loading={loading}
        />
        <StatCard
          label={`PWA installs · ${range}`}
          value={summary?.installs ?? 0}
          delta={summary ? deltaPct(summary.installs, summary.installs_prev) : null}
          sub={`${summary?.standalone_sessions ?? 0} standalone sessions`}
          icon={DownloadIcon}
          loading={loading}
        />
      </section>

      {/* Trends */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Trends · last {Math.min(90, days)} days
        </h2>
        <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesFmt}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "2px solid hsl(var(--foreground))",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="page_views" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} name="Page views" />
                <Line type="monotone" dataKey="dau" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="DAU" />
                <Line type="monotone" dataKey="signups" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Install funnel */}
      <section className="mb-8">
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Install funnel · last {days}d
        </h2>
        <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] p-5">
          {funnel ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Shown", value: funnel.shown, base: funnel.shown },
                  { label: "Clicked", value: funnel.clicked, base: funnel.shown },
                  { label: "Accepted", value: funnel.accepted, base: funnel.clicked },
                  { label: "Installed", value: funnel.installed, base: funnel.accepted },
                ].map((step, i) => (
                  <div key={step.label} className="border border-foreground bg-background p-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {i + 1}. {step.label}
                    </div>
                    <div className="font-heading text-2xl font-black leading-none mt-1">
                      {step.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {i === 0 ? "—" : `${pct(step.value, step.base)} of prev`}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                <span className="px-2 py-1 border border-foreground bg-background">
                  <Smartphone className="w-3 h-3 inline mr-1" />
                  Android prompts: {funnel.android}
                </span>
                <span className="px-2 py-1 border border-foreground bg-background">
                  iOS hints: {funnel.ios}
                </span>
                <span className="px-2 py-1 border border-foreground bg-background">
                  Dismissed: {funnel.dismissed}
                </span>
                <span className="px-2 py-1 border border-foreground bg-accent text-accent-foreground">
                  Standalone sessions: {funnel.standalone_sessions}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading funnel…</p>
          )}
        </div>
      </section>

      {/* Tables */}
      <section className="grid lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-accent" /> Top pages · {range}
          </h2>
          <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Uniques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paths.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-6">
                      No data yet.
                    </TableCell>
                  </TableRow>
                )}
                {paths.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs truncate max-w-[260px]">{p.path}</TableCell>
                    <TableCell className="text-right font-mono">{p.views}</TableCell>
                    <TableCell className="text-right font-mono">{p.uniques}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="inline-block w-1.5 h-5 bg-accent" /> Top referrers · {days}d
          </h2>
          <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-6">
                      No external traffic recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {referrers.map((r) => (
                  <TableRow key={r.referrer}>
                    <TableCell className="font-mono text-xs truncate max-w-[300px]">{r.referrer}</TableCell>
                    <TableCell className="text-right font-mono">{r.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* Live tail */}
      <section>
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Live event tail
          <span className="ml-2 text-[10px] font-mono text-muted-foreground">auto-refresh 5s</span>
        </h2>
        <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] max-h-[420px] overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-card border-b-2 border-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 w-32">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Path</th>
                <th className="px-3 py-2 w-32">User</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted-foreground py-6">
                    Waiting for events…
                  </td>
                </tr>
              )}
              {recent.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="px-1.5 py-0.5 bg-accent/20 border border-accent text-foreground">
                      {e.event}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 truncate max-w-[280px]">{e.path ?? "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground truncate">
                    {e.user_id ? "user" : (e.anon_id?.slice(0, 8) ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
