import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ExternalLink, Check, X, AlertTriangle } from "lucide-react";
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
  role_title: string | null;
  role_type: string | null;
  location: string | null;
  pqe_min: number | null;
  pqe_max: number | null;
  eligibility_india: "eligible" | "ambiguous" | "ineligible" | "unknown";
  eligibility_reason: string | null;
  eligibility_confidence: number | null;
  lifecycle_status: "active" | "stale" | "expired";
  consecutive_misses: number;
};

type SourceRow = {
  id: string;
  name: string | null;
  firm_name: string | null;
  url: string;
  active: boolean;
  source_type: string;
  tier: string;
  country: string;
  scrape_frequency: string;
  pipeline_status: string;
  last_scraped_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  last_error: string | null;
  scrape_count: number;
};

const TIERS = ["tier_1", "tier_2", "tier_3", "boutique", "in_house", "psu", "big_4", "other"];

type QueueTab = "eligible" | "ambiguous" | "ineligible" | "sources";

export default function ReviewQueuePanel({ userId }: { userId: string }) {
  const [tab, setTab] = useState<QueueTab>("eligible");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [tickRunning, setTickRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QueueRow | null>(null);

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

  const eligible = rows.filter((r) => r.eligibility_india === "eligible");
  const ambiguous = rows.filter((r) => r.eligibility_india === "ambiguous" || r.eligibility_india === "unknown");
  const ineligible = rows.filter((r) => r.eligibility_india === "ineligible");

  const tickAll = async (force = false) => {
    setTickRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-tick", {
        body: force ? { force: true } : {},
      });
      if (error) throw error;
      const d = data as { processed?: number };
      toast.success(`${force ? "Scrape all" : "Tick"} processed ${d.processed ?? 0} sources`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tick failed");
    } finally {
      setTickRunning(false);
    }
  };

  const tabRows = tab === "eligible" ? eligible : tab === "ambiguous" ? ambiguous : tab === "ineligible" ? ineligible : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={tab === "eligible" ? "default" : "outline"} onClick={() => setTab("eligible")} className="font-bold border-2 border-foreground">
          ✅ Eligible ({eligible.length})
        </Button>
        <Button size="sm" variant={tab === "ambiguous" ? "default" : "outline"} onClick={() => setTab("ambiguous")} className="font-bold border-2 border-foreground">
          ⚠️ Ambiguous ({ambiguous.length})
        </Button>
        <Button size="sm" variant={tab === "ineligible" ? "default" : "outline"} onClick={() => setTab("ineligible")} className="font-bold border-2 border-foreground">
          🔴 Ineligible ({ineligible.length})
        </Button>
        <Button size="sm" variant={tab === "sources" ? "default" : "outline"} onClick={() => setTab("sources")} className="font-bold border-2 border-foreground">
          🏢 Sources ({sources.length})
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={tickRunning} onClick={() => void tickAll(false)} title="Run scrape-tick now (processes due sources)">
            {tickRunning ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            Run tick
          </Button>
          <Button size="sm" variant="default" disabled={tickRunning} onClick={() => void tickAll(true)} title="Force-scrape every active source, ignoring frequency">
            {tickRunning ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            Scrape all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : tab !== "sources" ? (
        <div className="grid gap-3">
          {tabRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing here. Hourly cron processes due sources, or hit "Run tick" / "Scrape now".
            </p>
          )}
          {tabRows.map((r) => {
            const ext = r.ai_extracted || {};
            const elColor = r.eligibility_india === "eligible" ? "default"
              : r.eligibility_india === "ineligible" ? "destructive" : "secondary";
            return (
              <Card key={r.id} className="border-2 border-foreground p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={elColor as any} className="text-[10px] uppercase">{r.eligibility_india}</Badge>
                      {r.lifecycle_status !== "active" && (
                        <Badge variant="outline" className="text-[10px] uppercase">{r.lifecycle_status}</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">{r.source}</Badge>
                      <span className="font-heading font-bold">{r.role_title || ext.role || r.source_title || "(no role)"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {r.source_firm}
                      {(r.location || ext.location) ? ` · ${r.location || ext.location}` : ""}
                      {r.role_type ? ` · ${r.role_type}` : ""}
                      {(r.pqe_min != null || r.pqe_max != null) ? ` · ${r.pqe_min ?? "?"}–${r.pqe_max ?? "?"} PQE` : ""}
                    </div>
                    {r.eligibility_reason && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic">
                        Why: {r.eligibility_reason}
                        {r.eligibility_confidence != null ? ` (${Math.round(Number(r.eligibility_confidence) * 100)}%)` : ""}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-muted-foreground mt-1">
                      Found {new Date(r.discovered_at).toLocaleString()}
                      {r.consecutive_misses > 0 ? ` · ${r.consecutive_misses} miss(es)` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={r.source_url} target="_blank" rel="noreferrer noopener">
                        <ExternalLink size={14} />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)}>
                      <X size={14} className="mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setEditing(r); setOpen(true); }}
                      className="font-bold border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    >
                      <Check size={14} className="mr-1" /> Promote
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2">
          {sources.map((s) => (
            <Card key={s.id} className="border-2 border-foreground p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-bold text-sm">{s.name || s.firm_name}</div>
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-xs text-muted-foreground hover:text-accent break-all">
                    {s.url}
                  </a>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{s.source_type}</Badge>
                    <Badge variant="outline" className="text-[9px]">{s.tier}</Badge>
                    <Badge variant="outline" className="text-[9px]">{s.country}</Badge>
                    <Badge variant="outline" className="text-[9px]">{s.scrape_frequency}</Badge>
                    <Badge variant={s.active ? "default" : "outline"} className="text-[9px]">
                      {s.active ? s.pipeline_status : "inactive"}
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
    </div>
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

  useEffect(() => {
    if (row) {
      const e = row.ai_extracted || {};
      setFields({
        firm_name: row.source_firm ?? "",
        role: row.role_title ?? e.role ?? row.source_title ?? "",
        opportunity_type: row.role_type === "internship" ? "internship" : (e.opportunity_type ?? "job"),
        application_mode: e.application_mode ?? "external_url",
        application_email: e.application_email ?? "",
        application_url: e.apply_url ?? row.source_url ?? "",
        location: row.location ?? e.location ?? "",
        eligibility: row.eligibility_reason ?? e.eligibility ?? "",
        stipend: e.stipend ?? "",
        description: e.description ?? "",
        tier: "",
        practice_area: "",
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
