import { useEffect, useState } from "react";
import {
  Users,
  ClipboardCheck,
  Briefcase,
  Scale,
  RefreshCw,
  Activity,
  MessageSquarePlus,
  Megaphone,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { StatCard, ToolTile } from "@/components/admin/AdminTiles";
import { useAdminAccess, type AdminScope } from "@/hooks/useAdminRole";

interface Stats {
  waitlistTotal: number;
  waitlist7d: number;
  betaClaimed: number;
  betaSubmitted: number;
  vacanciesLive: number;
  vacanciesExpiringSoon: number;
  barPending: number;
  barAttempts24h: number;
}

const EMPTY: Stats = {
  waitlistTotal: 0,
  waitlist7d: 0,
  betaClaimed: 0,
  betaSubmitted: 0,
  vacanciesLive: 0,
  vacanciesExpiringSoon: 0,
  barPending: 0,
  barAttempts24h: 0,
};

interface Tile {
  to: string;
  title: string;
  description: string;
  icon: typeof Users;
  scope: AdminScope;
  fullAdminOnly?: boolean;
}

const TILES: Tile[] = [
  { to: "/admin/insights", title: "Insights", description: "Live product analytics, install funnel, top pages, signups.", icon: BarChart3, scope: "admin", fullAdminOnly: true },
  { to: "/admin/waitlist", title: "Waitlist", description: "Browse and filter signups by audience.", icon: Users, scope: "waitlist_admin" },
  { to: "/admin/beta", title: "Beta Testers", description: "Review tester feedback, screenshots, and CSV export.", icon: ClipboardCheck, scope: "admin", fullAdminOnly: true },
  { to: "/admin/vacancies", title: "Vacancies", description: "Curate the live vacancy board with AI extraction.", icon: Briefcase, scope: "opportunities_admin" },
  { to: "/admin/opportunities", title: "Opportunities", description: "Post CFPs, moots, and competitions with AI paste-extract.", icon: Briefcase, scope: "opportunities_admin" },
  { to: "/admin/bar", title: "The Bar", description: "Sources, challenges, stats, and AI generation log.", icon: Scale, scope: "bar_admin" },
  { to: "/admin/firm-suggestions", title: "Firm Suggestions", description: "Review user-submitted firm fixes and additions.", icon: MessageSquarePlus, scope: "waitlist_admin" },
  { to: "/admin/broadcasts", title: "Broadcasts", description: "Send a one-off update email to a chosen segment.", icon: Megaphone, scope: "broadcast_admin" },
  { to: "/admin/admins", title: "Admin Access", description: "Grant or revoke admin access by username or email.", icon: ShieldCheck, scope: "admin", fullAdminOnly: true },
];

export default function AdminDashboard() {
  usePageMeta({
    title: "Admin Dashboard — Locus",
    description: "Unified admin console for Locus.",
    path: "/admin",
  });

  const { isAdmin, hasScope } = useAdminAccess();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const visibleTiles = TILES.filter((t) =>
    t.fullAdminOnly ? isAdmin : hasScope(t.scope)
  );

  // Stat visibility mirrors scope visibility — scoped admins only see their own numbers.
  const showWaitlist = hasScope("waitlist_admin");
  const showBeta = isAdmin;
  const showOpportunities = hasScope("opportunities_admin");
  const showBar = hasScope("bar_admin");

  const load = async () => {
    setLoading(true);
    const sevenDays = new Date(Date.now() - 7 * 86400000).toISOString();
    const oneDay = new Date(Date.now() - 86400000).toISOString();
    const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();

    const tasks: PromiseLike<unknown>[] = [];
    const indexes: Record<string, number> = {};

    if (showWaitlist) {
      indexes.waitlistTotal = tasks.length;
      tasks.push(supabase.from("waitlist_submissions").select("*", { count: "exact", head: true }));
      indexes.waitlist7d = tasks.length;
      tasks.push(supabase.from("waitlist_submissions").select("*", { count: "exact", head: true }).gte("created_at", sevenDays));
    }
    if (showBeta) {
      indexes.betaClaimed = tasks.length;
      tasks.push(supabase.from("beta_testers").select("*", { count: "exact", head: true }));
      indexes.betaSubmitted = tasks.length;
      tasks.push(supabase.from("beta_testers").select("*", { count: "exact", head: true }).not("submitted_at", "is", null));
    }
    if (showOpportunities) {
      indexes.vacLive = tasks.length;
      tasks.push(supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "live").gt("expires_at", new Date().toISOString()));
      indexes.vacSoon = tasks.length;
      tasks.push(supabase.from("vacancies").select("*", { count: "exact", head: true }).eq("status", "live").gt("expires_at", new Date().toISOString()).lt("expires_at", threeDays));
    }
    if (showBar) {
      indexes.barPending = tasks.length;
      tasks.push(supabase.from("bar_challenges").select("*", { count: "exact", head: true }).eq("status", "draft"));
      indexes.barAttempts = tasks.length;
      tasks.push(supabase.from("bar_attempts").select("*", { count: "exact", head: true }).gte("attempted_at", oneDay));
    }

    const results = await Promise.all(tasks);
    const get = (key: string) => {
      const idx = indexes[key];
      if (idx === undefined) return 0;
      return ((results[idx] as { count: number | null })?.count) ?? 0;
    };

    setStats({
      waitlistTotal: get("waitlistTotal"),
      waitlist7d: get("waitlist7d"),
      betaClaimed: get("betaClaimed"),
      betaSubmitted: get("betaSubmitted"),
      vacanciesLive: get("vacLive"),
      vacanciesExpiringSoon: get("vacSoon"),
      barPending: get("barPending"),
      barAttempts24h: get("barAttempts"),
    });
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWaitlist, showBeta, showOpportunities, showBar]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Console
          </p>
          <h1 className="font-heading text-3xl md:text-4xl font-black">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin
              ? "Everything in one place. All admin tools, live numbers, recent activity."
              : "Your admin tools and stats, scoped to your access."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
        {showWaitlist && (
          <StatCard
            label="Waitlist"
            value={stats.waitlistTotal}
            sub={`+${stats.waitlist7d} in last 7d`}
            icon={Users}
            loading={loading}
          />
        )}
        {showBeta && (
          <StatCard
            label="Beta Testers"
            value={`${stats.betaSubmitted}/${stats.betaClaimed}`}
            sub="submitted / claimed"
            icon={ClipboardCheck}
            loading={loading}
          />
        )}
        {showOpportunities && (
          <StatCard
            label="Live Opportunities"
            value={stats.vacanciesLive}
            sub={`${stats.vacanciesExpiringSoon} expiring in 3d`}
            icon={Briefcase}
            loading={loading}
          />
        )}
        {showBar && (
          <StatCard
            label="Bar Pending"
            value={stats.barPending}
            sub={`${stats.barAttempts24h} attempts (24h)`}
            icon={Scale}
            loading={loading}
          />
        )}
        {(showBar || showWaitlist) && (
          <StatCard
            label="Activity (24h)"
            value={stats.barAttempts24h + stats.waitlist7d}
            sub="bar + waitlist"
            icon={Activity}
            loading={loading}
          />
        )}
      </section>

      {/* Tool tiles */}
      <section>
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Admin tools
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTiles.map((t) => (
            <ToolTile
              key={t.to}
              to={t.to}
              title={t.title}
              description={t.description}
              icon={t.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
