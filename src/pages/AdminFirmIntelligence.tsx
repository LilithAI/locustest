import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Play, Square, Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { toast } from "sonner";

const CONCURRENCY = 3;
const WEAK_THRESHOLD = 0.3;
const MAX_ATTEMPTS = 2;

type FirmRow = {
  firm_slug: string;
  firm_name: string;
  last_scraped_at: string | null;
  intelligence_completeness_score: number;
  offices_count: number;
  practice_areas_count: number;
  rankings_count: number;
  news_count: number;
};

type ItemStatus = "pending" | "running" | "done" | "failed";
type Item = { slug: string; name: string; status: ItemStatus; attempt: number; completeness?: number; error?: string };

async function fetchFirms(): Promise<FirmRow[]> {
  const { data: profiles, error } = await supabase
    .from("firm_profiles")
    .select("firm_slug, firm_name, last_scraped_at, intelligence_completeness_score")
    .order("firm_name", { ascending: true });
  if (error) throw error;

  const slugs = (profiles ?? []).map((p) => p.firm_slug);
  const [offices, practices, rankings, news] = await Promise.all([
    supabase.from("firm_offices").select("firm_slug").in("firm_slug", slugs),
    supabase.from("firm_practice_areas").select("firm_slug").in("firm_slug", slugs),
    supabase.from("firm_rankings").select("firm_slug").in("firm_slug", slugs),
    supabase.from("firm_news_mentions").select("firm_slug").in("firm_slug", slugs),
  ]);
  const tally = (rows: { firm_slug: string }[] | null) => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => map.set(r.firm_slug, (map.get(r.firm_slug) ?? 0) + 1));
    return map;
  };
  const oc = tally(offices.data);
  const pc = tally(practices.data);
  const rc = tally(rankings.data);
  const nc = tally(news.data);

  return (profiles ?? []).map((p) => ({
    firm_slug: p.firm_slug,
    firm_name: p.firm_name,
    last_scraped_at: p.last_scraped_at,
    intelligence_completeness_score: Number(p.intelligence_completeness_score ?? 0),
    offices_count: oc.get(p.firm_slug) ?? 0,
    practice_areas_count: pc.get(p.firm_slug) ?? 0,
    rankings_count: rc.get(p.firm_slug) ?? 0,
    news_count: nc.get(p.firm_slug) ?? 0,
  }));
}

async function refreshOne(slug: string): Promise<{ completeness: number }> {
  const { data, error } = await supabase.functions.invoke("refresh-firm-intelligence", {
    body: { slug },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const c = Number(data?.completeness ?? 0);
  return { completeness: c > 1 ? c / 100 : c };
}

const fmtDate = (iso: string | null) => {
  if (!iso) return "never";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export default function AdminFirmIntelligence() {
  usePageMeta({ title: "Firm Intelligence — Admin | Locus", description: "Bulk refresh firm intelligence." });
  const { isAdmin, ready } = useAdminAccess();
  const [firms, setFirms] = useState<FirmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  const loadFirms = useCallback(async () => {
    setLoading(true);
    try {
      setFirms(await fetchFirms());
    } catch (e) {
      toast.error("Failed to load firms", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && isAdmin) loadFirms();
  }, [ready, isAdmin, loadFirms]);

  const stats = useMemo(() => {
    const total = firms.length;
    const enriched = firms.filter((f) => f.intelligence_completeness_score >= WEAK_THRESHOLD).length;
    const weak = firms.filter((f) => f.intelligence_completeness_score < WEAK_THRESHOLD).length;
    const stale = firms.filter((f) => {
      if (!f.last_scraped_at) return true;
      return Date.now() - new Date(f.last_scraped_at).getTime() > 30 * 86_400_000;
    }).length;
    const avg = total ? firms.reduce((s, f) => s + f.intelligence_completeness_score, 0) / total : 0;
    return { total, enriched, weak, stale, avg };
  }, [firms]);

  const runBatch = useCallback(
    async (initial: Item[]) => {
      setItems(initial);
      setRunning(true);
      abortRef.current = false;

      const queue: Item[] = [...initial];
      const updateItem = (slug: string, patch: Partial<Item>) => {
        setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, ...patch } : i)));
      };

      // worker pool
      const worker = async () => {
        while (!abortRef.current) {
          const next = queue.shift();
          if (!next) return;
          updateItem(next.slug, { status: "running", attempt: next.attempt + 1 });
          try {
            const { completeness } = await refreshOne(next.slug);
            updateItem(next.slug, { status: "done", completeness });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            updateItem(next.slug, { status: "failed", error: msg });
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

      // retry weak (one extra pass max)
      if (!abortRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        const fresh = await fetchFirms();
        const slugMap = new Map(fresh.map((f) => [f.firm_slug, f]));
        const retryItems: Item[] = [];
        setItems((prev) => {
          const updated = prev.map((i) => {
            if (i.attempt >= MAX_ATTEMPTS) return i;
            const f = slugMap.get(i.slug);
            const score = f?.intelligence_completeness_score ?? 0;
            if (i.status === "done" && score < WEAK_THRESHOLD) {
              const item = { ...i, status: "pending" as ItemStatus };
              retryItems.push(item);
              return item;
            }
            return i;
          });
          return updated;
        });

        if (retryItems.length > 0) {
          const retryQueue = [...retryItems];
          const retryWorker = async () => {
            while (!abortRef.current) {
              const next = retryQueue.shift();
              if (!next) return;
              updateItem(next.slug, { status: "running", attempt: next.attempt + 1 });
              try {
                const { completeness } = await refreshOne(next.slug);
                updateItem(next.slug, { status: "done", completeness });
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                updateItem(next.slug, { status: "failed", error: msg });
              }
            }
          };
          await Promise.all(Array.from({ length: CONCURRENCY }, () => retryWorker()));
        }
      }

      setRunning(false);
      await loadFirms();
      toast.success("Batch complete");
    },
    [loadFirms],
  );

  const startStale = () => {
    const targets = firms.filter((f) => f.intelligence_completeness_score < WEAK_THRESHOLD);
    if (!targets.length) {
      toast.info("Nothing to do — all firms above threshold");
      return;
    }
    runBatch(targets.map((f) => ({ slug: f.firm_slug, name: f.firm_name, status: "pending", attempt: 0 })));
  };

  const startAll = () => {
    if (!confirm(`Refresh ALL ${firms.length} firms? This will use ~${firms.length * 5} Firecrawl credits.`)) return;
    runBatch(firms.map((f) => ({ slug: f.firm_slug, name: f.firm_name, status: "pending", attempt: 0 })));
  };

  const refreshOneInline = async (slug: string, name: string) => {
    const tid = toast.loading(`Refreshing ${name}…`);
    try {
      const { completeness } = await refreshOne(slug);
      toast.success(`Done — ${Math.round(completeness * 100)}%`, { id: tid });
      await loadFirms();
    } catch (e) {
      toast.error("Failed", { id: tid, description: e instanceof Error ? e.message : String(e) });
    }
  };

  const completed = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const inProgress = items.filter((i) => i.status === "running").length;

  if (!ready) return <div className="p-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-12 text-center text-muted-foreground">Admin only</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Firm Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk refresh firm intelligence via Firecrawl + Gemini. Concurrency: {CONCURRENCY}. Auto-retries weak results
          (&lt;{Math.round(WEAK_THRESHOLD * 100)}%) once.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-5 mb-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Enriched", value: stats.enriched },
          { label: "Weak", value: stats.weak },
          { label: "Stale (>30d)", value: stats.stale },
          { label: "Avg completeness", value: `${Math.round(stats.avg * 100)}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={startStale}
          disabled={running || loading}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-lg disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Refresh weak/stale ({stats.weak})
        </button>
        <button
          onClick={startAll}
          disabled={running || loading}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Refresh ALL {firms.length}
        </button>
        {running && (
          <button
            onClick={() => {
              abortRef.current = true;
              toast.message("Stopping after in-flight requests…");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        )}
        <button
          onClick={loadFirms}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
        </button>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">
              Progress: {completed} done · {failed} failed · {inProgress} in flight · {items.length} total
            </span>
            <span className="text-muted-foreground">
              {Math.round(((completed + failed) / items.length) * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${((completed + failed) / items.length) * 100}%` }}
            />
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto text-xs space-y-1">
            {items
              .filter((i) => i.status === "running" || i.status === "failed")
              .slice(0, 20)
              .map((i) => (
                <div key={i.slug} className="flex items-center gap-2">
                  {i.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span className={i.status === "failed" ? "text-destructive" : ""}>
                    {i.name}
                    {i.status === "failed" && i.error ? ` — ${i.error.slice(0, 80)}` : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Firm table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Firm</th>
              <th className="px-2 py-3 text-right">%</th>
              <th className="px-2 py-3 text-right">Off</th>
              <th className="px-2 py-3 text-right">PA</th>
              <th className="px-2 py-3 text-right">Rk</th>
              <th className="px-2 py-3 text-right">News</th>
              <th className="px-3 py-3 text-left">Last</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {firms.map((f) => {
              const pct = Math.round(f.intelligence_completeness_score * 100);
              const item = items.find((i) => i.slug === f.firm_slug);
              const itemPct = item?.completeness != null ? Math.round(item.completeness * 100) : null;
              return (
                <tr key={f.firm_slug} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Link
                      to={`/directory/firms/${f.firm_slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {f.firm_name}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                    {item && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          item.status === "running"
                            ? "bg-accent/20 text-accent-foreground"
                            : item.status === "done"
                              ? "bg-green-500/15 text-green-700 dark:text-green-400"
                              : item.status === "failed"
                                ? "bg-destructive/15 text-destructive"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono ${
                      pct < WEAK_THRESHOLD * 100 ? "text-destructive" : pct < 60 ? "text-yellow-600" : "text-foreground"
                    }`}
                  >
                    {itemPct != null ? itemPct : pct}%
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{f.offices_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{f.practice_areas_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{f.rankings_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{f.news_count}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(f.last_scraped_at)}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => refreshOneInline(f.firm_slug, f.firm_name)}
                      disabled={running}
                      className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
