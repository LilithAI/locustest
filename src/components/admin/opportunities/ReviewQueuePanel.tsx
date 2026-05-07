import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ExternalLink, Check, X, AlertTriangle, Eye } from "lucide-react";
import VacancyCard from "@/components/vacancies/VacancyCard";
import type { Vacancy } from "@/lib/vacancies";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type QueueRow = {
  id: string;
  source: string;
  source_url: string;
  source_firm: string | null;
  source_title: string | null;
  raw_text: string | null;
  ai_extracted: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "duplicate";
  discovered_at: string;
  notes: string | null;
};

type SourceRow = {
  id: string;
  firm_name: string;
  url: string;
  active: boolean;
  last_scraped_at: string | null;
  last_status: string | null;
  last_error: string | null;
  scrape_count: number;
};

const TIERS = ["tier_1", "tier_2", "tier_3", "boutique", "in_house", "psu", "big_4", "other"];

const INDIA_TOKENS = [
  "india", "bharat", "mumbai", "bombay", "delhi", "new delhi", "ncr", "gurugram", "gurgaon",
  "noida", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "calcutta", "pune",
  "ahmedabad", "chandigarh", "jaipur", "lucknow", "kochi", "cochin", "trivandrum", "thiruvananthapuram",
  "indore", "bhopal", "nagpur", "surat", "vadodara", "visakhapatnam", "coimbatore", "mysuru", "mysore",
  "goa", "guwahati", "patna", "ranchi", "raipur", "dehradun", "shimla",
];
const NON_INDIA_TOKENS = [
  "london", "uk", "united kingdom", "england", "scotland", "manchester", "birmingham",
  "singapore", "dubai", "abu dhabi", "uae", "riyadh", "saudi", "doha", "qatar",
  "new york", "nyc", "usa", "u.s.", "united states", "san francisco", "los angeles", "boston", "chicago", "washington", "houston",
  "hong kong", "shanghai", "beijing", "tokyo", "osaka", "seoul",
  "sydney", "melbourne", "australia", "auckland",
  "paris", "frankfurt", "munich", "berlin", "amsterdam", "brussels", "zurich", "geneva", "milan", "madrid",
  "toronto", "vancouver", "montreal",
];

function isIndiaRow(row: QueueRow): boolean {
  const ext = row.ai_extracted || {};
  const hay = `${ext.location ?? ""} ${ext.country ?? ""} ${ext.city ?? ""}`.toLowerCase();
  if (!hay.trim()) return true; // unknown — keep
  if (NON_INDIA_TOKENS.some((t) => hay.includes(t)) && !INDIA_TOKENS.some((t) => hay.includes(t))) {
    return false;
  }
  if (INDIA_TOKENS.some((t) => hay.includes(t))) return true;
  // fallback: unknown jurisdiction → keep
  return true;
}

export default function ReviewQueuePanel({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"queue" | "sources">("queue");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QueueRow | null>(null);
  const [previewing, setPreviewing] = useState<QueueRow | null>(null);
  const [indiaOnly, setIndiaOnly] = useState(true);

  const filteredRows = useMemo(
    () => (indiaOnly ? rows.filter(isIndiaRow) : rows),
    [rows, indiaOnly],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: s }] = await Promise.all([
      supabase
        .from("vacancy_review_queue")
        .select("*")
        .eq("status", "pending")
        .order("discovered_at", { ascending: false })
        .limit(200),
      supabase
        .from("firm_careers_sources")
        .select("*")
        .order("last_scraped_at", { ascending: true, nullsFirst: true }),
    ]);
    setRows((q ?? []) as QueueRow[]);
    setSources((s ?? []) as SourceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const scrapeNow = async (sourceId: string) => {
    setScrapingId(sourceId);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-firm-careers", {
        body: { source_id: sourceId },
      });
      if (error) throw error;
      const d = data as { ok?: boolean; inserted?: number; duplicates?: number; error?: string };
      if (d.ok === false || d.error) {
        toast.error(d.error ?? "Scrape failed");
      } else {
        toast.success(`Scrape OK — ${d.inserted ?? 0} new, ${d.duplicates ?? 0} dupes`);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  };

  const [scrapingAll, setScrapingAll] = useState(false);
  const [scrapeAllProgress, setScrapeAllProgress] = useState<{ done: number; total: number } | null>(null);

  const scrapeAll = async () => {
    const active = sources.filter((s) => s.active);
    if (active.length === 0) { toast.error("No active sources"); return; }
    if (!confirm(`Scrape all ${active.length} active sources? This may take several minutes.`)) return;
    setScrapingAll(true);
    setScrapeAllProgress({ done: 0, total: active.length });
    let inserted = 0, dupes = 0, failed = 0;
    for (let i = 0; i < active.length; i++) {
      const s = active[i];
      setScrapingId(s.id);
      try {
        const { data, error } = await supabase.functions.invoke("scrape-firm-careers", {
          body: { source_id: s.id },
        });
        if (error) throw error;
        const d = data as { ok?: boolean; inserted?: number; duplicates?: number; error?: string };
        if (d.ok === false || d.error) failed++;
        else { inserted += d.inserted ?? 0; dupes += d.duplicates ?? 0; }
      } catch { failed++; }
      setScrapeAllProgress({ done: i + 1, total: active.length });
    }
    setScrapingId(null);
    setScrapingAll(false);
    setScrapeAllProgress(null);
    toast.success(`Scrape all done — ${inserted} new, ${dupes} dupes, ${failed} failed`);
    await load();
  };

  const reject = async (row: QueueRow) => {
    const { error } = await supabase
      .from("vacancy_review_queue")
      .update({ status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Rejected"); await load(); }
  };

  const approve = async (row: QueueRow, fields: any) => {
    // Insert into vacancies, then mark queue row approved with promoted_vacancy_id.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const insertPayload: any = {
      firm_name: fields.firm_name?.trim() || row.source_firm || "Unknown",
      role: fields.role?.trim() || row.source_title || "Role",
      opportunity_type: fields.opportunity_type || "internship",
      application_mode: fields.application_mode || "external_url",
      location: fields.location || null,
      eligibility: fields.eligibility || null,
      stipend: fields.stipend || null,
      description: fields.description || null,
      tier: fields.tier || null,
      practice_area: fields.practice_area || null,
      created_by: userId,
      expires_at: expiresAt,
      source_credit: `Auto-aggregated from ${row.source_firm} careers page`,
    };
    if (insertPayload.application_mode === "email") {
      insertPayload.application_email = fields.application_email?.trim() || "";
    } else {
      insertPayload.application_url = fields.application_url?.trim() || row.source_url;
    }

    const { data: vac, error: insErr } = await supabase
      .from("vacancies")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    const { error: updErr } = await supabase
      .from("vacancy_review_queue")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        promoted_vacancy_id: vac.id,
      })
      .eq("id", row.id);
    if (updErr) toast.error(updErr.message);
    else { toast.success("Promoted to live vacancy"); setOpen(false); setEditing(null); await load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={tab === "queue" ? "default" : "outline"}
          onClick={() => setTab("queue")}
          className="font-bold border-2 border-foreground"
        >
          Queue ({indiaOnly ? `${filteredRows.length} / ${rows.length}` : rows.length})
        </Button>
        <Button
          size="sm"
          variant={tab === "sources" ? "default" : "outline"}
          onClick={() => setTab("sources")}
          className="font-bold border-2 border-foreground"
        >
          Sources ({sources.length})
        </Button>
        {tab === "queue" && (
          <Button
            size="sm"
            variant={indiaOnly ? "default" : "outline"}
            onClick={() => setIndiaOnly((v) => !v)}
            className="font-bold border-2 border-foreground"
            title="Hide non-India postings (London, Singapore, Dubai, etc.)"
          >
            🇮🇳 India only {indiaOnly ? "ON" : "OFF"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => void load()} className="ml-auto">
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : tab === "queue" ? (
        <div className="grid gap-3">
          {filteredRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {rows.length === 0
                ? "Queue is empty. Sources are scraped weekly (Sun 02:00 IST), or trigger one manually from the Sources tab."
                : `No India postings in the queue. ${rows.length} non-India row(s) hidden — toggle "India only" off to see them.`}
            </p>
          )}
          {filteredRows.map((r) => {
            const ext = r.ai_extracted || {};
            return (
              <Card key={r.id} className="border-2 border-foreground p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">{r.source}</Badge>
                      <span className="font-heading font-bold">{ext.role || r.source_title || "(no role)"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {r.source_firm}{ext.location ? ` · ${ext.location}` : ""}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">
                      Found {new Date(r.discovered_at).toLocaleString()}
                    </div>
                    {ext.deadline && (
                      <div className="text-xs text-foreground mt-1">Deadline: {ext.deadline}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button asChild size="sm" variant="outline">
                      <a href={r.source_url} target="_blank" rel="noreferrer noopener">
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewing(r)}>
                      <Eye size={14} className="mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)}>
                      <X size={14} className="mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setEditing(r); setOpen(true); }}
                      className="font-bold border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    >
                      <Check size={14} className="mr-1" /> Review & promote
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {sources.filter((s) => s.active).length} active / {sources.length} total
              {scrapeAllProgress && ` · ${scrapeAllProgress.done}/${scrapeAllProgress.total}`}
            </div>
            <Button
              size="sm"
              variant="default"
              disabled={scrapingAll}
              onClick={scrapeAll}
              className="font-bold border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            >
              {scrapingAll ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              {scrapingAll ? `Scraping ${scrapeAllProgress?.done}/${scrapeAllProgress?.total}` : "Scrape all active"}
            </Button>
          </div>
          {sources.map((s) => (
            <Card key={s.id} className="border-2 border-foreground p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-bold text-sm">{s.firm_name}</div>
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-xs text-muted-foreground hover:text-accent break-all">
                    {s.url}
                  </a>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={s.active ? "default" : "outline"} className="text-[9px]">
                      {s.active ? "active" : "inactive"}
                    </Badge>
                    {s.last_status && (
                      <Badge variant={s.last_status === "success" ? "secondary" : "destructive"} className="text-[9px]">
                        {s.last_status}
                      </Badge>
                    )}
                    {s.last_scraped_at && <span>last: {new Date(s.last_scraped_at).toLocaleString()}</span>}
                    <span>· {s.scrape_count} scrapes</span>
                  </div>
                  {s.last_error && (
                    <div className="text-[11px] text-destructive mt-1 flex items-start gap-1">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <span className="break-all">{s.last_error}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={scrapingId === s.id || !s.active}
                  onClick={() => scrapeNow(s.id)}
                >
                  {scrapingId === s.id ? <Loader2 size={14} className="animate-spin" /> : "Scrape now"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReviewDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        row={editing}
        onApprove={approve}
      />

      <PreviewDialog
        row={previewing}
        onClose={() => setPreviewing(null)}
        onReject={(r) => { setPreviewing(null); void reject(r); }}
        onPromote={(r) => { setPreviewing(null); setEditing(r); setOpen(true); }}
      />
    </div>
  );
}

function PreviewDialog({
  row, onClose, onReject, onPromote,
}: {
  row: QueueRow | null;
  onClose: () => void;
  onReject: (r: QueueRow) => void;
  onPromote: (r: QueueRow) => void;
}) {
  if (!row) return null;
  const ext = row.ai_extracted || {};
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const mode = ext.application_mode === "email" || (!ext.apply_url && ext.application_email)
    ? "email"
    : "external_url";

  const eligibilityCombined = [ext.eligibility, ext.qualifications, ext.experience_years && `Experience: ${ext.experience_years}`]
    .filter(Boolean).join("\n\n") || null;
  const descriptionCombined = [
    ext.description,
    ext.responsibilities && `Responsibilities:\n${ext.responsibilities}`,
    ext.start_date && `Start date: ${ext.start_date}`,
    ext.deadline && `Deadline: ${ext.deadline}`,
  ].filter(Boolean).join("\n\n") || null;

  const previewVacancy: Vacancy = {
    id: `preview-${row.id}`,
    firm_name: row.source_firm || "Unknown firm",
    role: ext.role || row.source_title || "(no role)",
    opportunity_type: ext.opportunity_type === "job" ? "job" : "internship",
    location: ext.location || ext.country || null,
    application_mode: mode,
    application_email: mode === "email" ? (ext.application_email || null) : null,
    application_url: mode === "external_url" ? (ext.apply_url || row.source_url || null) : null,
    tier: null,
    practice_area: ext.practice_area || null,
    eligibility: eligibilityCombined,
    stipend: ext.stipend || null,
    description: descriptionCombined,
    task_brief: ext.task_brief || null,
    source_credit: `Auto-aggregated from ${row.source_firm} careers page`,
    posted_at: now,
    expires_at: expires,
    status: "active" as any,
    created_by: "preview",
    created_at: now,
    updated_at: now,
  };

  return (
    <Dialog open={!!row} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-foreground">
        <DialogHeader>
          <DialogTitle className="font-heading">Live preview</DialogTitle>
          <DialogDescription>
            How this opportunity will appear on the public Opportunities board.{" "}
            <a href={row.source_url} target="_blank" rel="noreferrer noopener" className="text-accent underline break-all">
              source ↗
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-background p-2 md:p-4 rounded-lg border border-border/50">
          <VacancyCard vacancy={previewVacancy} />
        </div>

        <details className="mt-4">
          <summary className="text-xs font-mono uppercase tracking-widest text-muted-foreground cursor-pointer">
            Raw scraped markdown
          </summary>
          <div className="mt-2 max-h-[40vh] overflow-y-auto border-2 border-border rounded p-3 text-xs whitespace-pre-wrap font-mono bg-muted/30">
            {row.raw_text || "(empty)"}
          </div>
        </details>

        <div className="flex justify-end gap-2 mt-4 flex-wrap">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => onReject(row)}>
            <X size={14} className="mr-1" /> Reject
          </Button>
          <Button
            onClick={() => onPromote(row)}
            className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          >
            <Check size={14} className="mr-1" /> Review & promote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  open, onOpenChange, row, onApprove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: QueueRow | null;
  onApprove: (row: QueueRow, fields: any) => void;
}) {
  const [fields, setFields] = useState<any>({});
  const [generating, setGenerating] = useState(false);

  const generateDescription = async () => {
    if (!row) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vacancy-description", {
        body: {
          ai_extracted: row.ai_extracted ?? {},
          raw_text: row.raw_text ?? "",
          firm_name: fields.firm_name || row.source_firm,
          role: fields.role || row.source_title,
        },
      });
      if (error) throw error;
      const d = data as { description?: string; error?: string };
      if (d.error || !d.description) throw new Error(d.error || "No description returned");
      setFields((f: any) => ({ ...f, description: d.description }));
      toast.success("Description generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };


  useEffect(() => {
    if (row) {
      const e = row.ai_extracted || {};
      const elig = [e.eligibility, e.qualifications, e.experience_years && `Experience: ${e.experience_years}`].filter(Boolean).join("\n\n");
      const desc = [e.description, e.responsibilities && `Responsibilities:\n${e.responsibilities}`, e.start_date && `Start date: ${e.start_date}`, e.deadline && `Deadline: ${e.deadline}`].filter(Boolean).join("\n\n");
      setFields({
        firm_name: row.source_firm ?? "",
        role: e.role ?? row.source_title ?? "",
        opportunity_type: e.opportunity_type ?? "internship",
        application_mode: e.application_mode ?? (e.apply_url || row.source_url ? "external_url" : "email"),
        application_email: e.application_email ?? "",
        application_url: e.apply_url ?? row.source_url ?? "",
        location: e.location ?? e.country ?? "",
        eligibility: elig,
        stipend: e.stipend ?? "",
        description: desc,
        tier: "",
        practice_area: e.practice_area ?? "",
        task_brief: e.task_brief ?? "",
      });
    }
  }, [row]);

  if (!row) return null;
  const u = (k: string, v: any) => setFields((f: any) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-foreground">
        <DialogHeader>
          <DialogTitle className="font-heading">Review & promote</DialogTitle>
          <DialogDescription>
            AI-extracted from{" "}
            <a href={row.source_url} target="_blank" rel="noreferrer noopener" className="text-accent underline">
              {row.source_url}
            </a>
            . Fix any wrong fields before promoting.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Firm</Label>
              <Input value={fields.firm_name ?? ""} onChange={(e) => u("firm_name", e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={fields.role ?? ""} onChange={(e) => u("role", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={fields.opportunity_type} onValueChange={(v) => u("opportunity_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={fields.tier || "none"} onValueChange={(v) => u("tier", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Application mode</Label>
              <Select value={fields.application_mode} onValueChange={(v) => u("application_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_url">External URL</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fields.application_mode === "email" ? (
              <div>
                <Label>Application email</Label>
                <Input value={fields.application_email ?? ""} onChange={(e) => u("application_email", e.target.value)} />
              </div>
            ) : (
              <div>
                <Label>Application URL</Label>
                <Input value={fields.application_url ?? ""} onChange={(e) => u("application_url", e.target.value)} />
              </div>
            )}
            <div>
              <Label>Location</Label>
              <Input value={fields.location ?? ""} onChange={(e) => u("location", e.target.value)} />
            </div>
            <div>
              <Label>Eligibility</Label>
              <Input value={fields.eligibility ?? ""} onChange={(e) => u("eligibility", e.target.value)} />
            </div>
            <div>
              <Label>Stipend</Label>
              <Input value={fields.stipend ?? ""} onChange={(e) => u("stipend", e.target.value)} />
            </div>
            <div>
              <Label>Practice area</Label>
              <Input value={fields.practice_area ?? ""} onChange={(e) => u("practice_area", e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={fields.description ?? ""} onChange={(e) => u("description", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest">Raw scraped markdown</Label>
            <div className="mt-1 max-h-[60vh] overflow-y-auto border-2 border-border rounded p-3 text-xs whitespace-pre-wrap font-mono bg-muted/30">
              {row.raw_text || "(empty)"}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => onApprove(row, fields)}
            className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          >
            <Check size={14} className="mr-1" /> Promote to live
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
