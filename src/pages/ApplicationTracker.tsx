import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Briefcase } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatsStrip from "@/components/applications/StatsStrip";
import NudgeBanner from "@/components/applications/NudgeBanner";
import ApplicationRow from "@/components/applications/ApplicationRow";
import LogApplicationDialog from "@/components/applications/LogApplicationDialog";
import InsightsPanel from "@/components/applications/InsightsPanel";
import { STATUS_OPTIONS } from "@/components/applications/StatusPill";
import { METHOD_OPTIONS } from "@/components/applications/methodMeta";
import type { Database } from "@/integrations/supabase/types";

type App = Database["public"]["Tables"]["profile_applications"]["Row"];
type Status = Database["public"]["Enums"]["application_status"];
type Method = Database["public"]["Enums"]["application_method"];

const PENDING: Status[] = ["sent", "acknowledged"];
const INTERVIEW: Status[] = ["interview_scheduled", "interviewed"];
const OFFER_LIKE: Status[] = ["offer", "accepted"];
const RESPONDED_NEG: Status[] = ["rejected"];

export default function ApplicationTracker() {
  usePageMeta({
    title: "Applications · Locus",
    description: "Track every internship and job application you send. Private to you.",
  });
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<App | null>(null);
  const [prefill, setPrefill] = useState<{ firm?: string | null; role?: string | null; notes?: string | null }>({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Auth — subscribe first, give the session ~1.2s to hydrate before bouncing.
  useEffect(() => {
    let mounted = true;
    let redirectTimer: number | null = null;
    let resolved = false;

    const goAuth = () => {
      if (!mounted) return;
      navigate("/auth?redirect=/applications");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      if (s) {
        resolved = true;
        if (redirectTimer) { window.clearTimeout(redirectTimer); redirectTimer = null; }
        setUserId(s.user.id);
        setAuthReady(true);
      } else if (resolved) {
        goAuth();
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        resolved = true;
        setUserId(session.user.id);
        setAuthReady(true);
      } else {
        redirectTimer = window.setTimeout(() => { if (!resolved) goAuth(); }, 1200);
      }
    });

    return () => {
      mounted = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profile_applications")
      .select("*")
      .eq("user_id", userId)
      .order("applied_on", { ascending: false })
      .limit(1000);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setApps(data ?? []);
  };

  useEffect(() => {
    if (authReady && userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, userId]);

  // Prefill from query params (e.g. from Directory startup drawer)
  useEffect(() => {
    if (!authReady) return;
    const firm = searchParams.get("logFirm");
    if (!firm) return;
    setEditing(null);
    setPrefill({
      firm,
      role: searchParams.get("logRole"),
      notes: searchParams.get("logNotes"),
    });
    setDialogOpen(true);
    // strip params so it doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    ["logFirm", "logRole", "logNotes"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [authReady, searchParams, setSearchParams]);

  // Stats
  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => PENDING.includes(a.status)).length;
    const interviews = apps.filter((a) => INTERVIEW.includes(a.status)).length;
    const offers = apps.filter((a) => OFFER_LIKE.includes(a.status)).length;
    const responded =
      interviews + offers + apps.filter((a) => RESPONDED_NEG.includes(a.status)).length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    return { total, pending, interviews, offers, responseRate };
  }, [apps]);

  // Stale (nudge)
  const stale = useMemo(() => {
    const now = Date.now();
    return apps
      .filter(
        (a) =>
          (a.status === "sent" || a.status === "acknowledged") &&
          differenceInDays(now, parseISO(a.applied_on)) >= 14 &&
          differenceInDays(now, new Date(a.status_updated_at)) >= 14,
      )
      .map((a) => ({
        id: a.id,
        firm_name_snapshot: a.firm_name_snapshot,
        role: a.role,
        applied_on: a.applied_on,
        status: a.status as "sent" | "acknowledged",
      }));
  }, [apps]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (methodFilter !== "all" && a.method !== methodFilter) return false;
      if (rangeFilter !== "all") {
        const days = differenceInDays(Date.now(), parseISO(a.applied_on));
        if (rangeFilter === "30" && days > 30) return false;
        if (rangeFilter === "90" && days > 90) return false;
        if (rangeFilter === "365" && days > 365) return false;
      }
      if (q) {
        const hay = `${a.firm_name_snapshot} ${a.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, statusFilter, methodFilter, rangeFilter, search]);

  const handleDelete = async (app: App) => {
    if (!confirm(`Delete application to ${app.firm_name_snapshot}?`)) return;
    const { error } = await supabase
      .from("profile_applications")
      .delete()
      .eq("id", app.id);
    if (error) return toast.error(error.message);
    toast.success("Application deleted");
    refresh();
  };

  if (!authReady) {
    return (
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 pt-28 pb-32 md:pt-32">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
            Applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your application pipeline. Private to you — only the count is shown publicly.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-[3px_3px_0_0_hsl(var(--border))]"
        >
          <Plus size={16} /> Log application
        </Button>
      </div>

      {/* Nudge */}
      {stale.length > 0 && (
        <div className="mb-6">
          <NudgeBanner stale={stale} />
        </div>
      )}

      {/* Stats */}
      <div className="mb-6">
        <StatsStrip stats={stats} />
      </div>

      {/* Insights — only meaningful with 3+ apps */}
      {apps.length >= 3 && (
        <div className="mb-6">
          <InsightsPanel apps={apps} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search firm or role…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rangeFilter} onValueChange={setRangeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading applications…</div>
      ) : apps.length === 0 ? (
        <div className="border-2 border-dashed border-border bg-card p-10 text-center">
          <Briefcase size={32} className="mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-heading text-lg font-bold">No applications yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Log your first application to start tracking your pipeline.
          </p>
          <Button
            className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
          >
            <Plus size={14} /> Log first application
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No applications match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              onEdit={(a) => { setEditing(a); setDialogOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {userId && (
        <LogApplicationDialog
          open={dialogOpen}
          onOpenChange={(o) => { setDialogOpen(o); if (!o) setPrefill({}); }}
          userId={userId}
          editing={editing}
          onSaved={refresh}
          prefillFirm={prefill.firm}
          prefillRole={prefill.role}
          prefillNotes={prefill.notes}
        />
      )}
    </div>
  );
}
