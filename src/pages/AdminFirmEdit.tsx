import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { toast } from "sonner";

type Office = { city: string; address?: string | null; is_hq?: boolean };
type PracticeArea = { name: string; partner_count?: number | null; is_signature?: boolean };
type Ranking = { source: string; year: number; band_or_tier: string; practice_area?: string | null };
type NewsItem = { title: string; url: string; source: string; mention_type: string; published_at?: string | null; excerpt?: string | null };

type Extracted = {
  tagline?: string | null;
  founded_year?: number | null;
  total_lawyers?: number | null;
  partner_count?: number | null;
  general_email?: string | null;
  careers_email?: string | null;
  phone_main?: string | null;
  hq_city?: string | null;
  offices?: Office[];
  practice_areas?: PracticeArea[];
  rankings?: Ranking[];
  news?: NewsItem[];
};

type CurrentFirm = {
  firm_name: string;
  tagline: string | null;
  founded_year: number | null;
  total_lawyers: number | null;
  partner_count: number | null;
  general_email: string | null;
  careers_email: string | null;
  phone_main: string | null;
  hq_city: string | null;
  offices_count: number;
  practice_areas_count: number;
  rankings_count: number;
};

const SCALAR_KEYS: Array<keyof Extracted> = [
  "tagline", "founded_year", "total_lawyers", "partner_count",
  "general_email", "careers_email", "phone_main", "hq_city",
];

export default function AdminFirmEdit() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { allowed, loading: roleLoading } = useAdminAccess();
  usePageMeta({ title: `Edit firm intelligence — ${slug}` });

  const [current, setCurrent] = useState<CurrentFirm | null>(null);
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [text, setText] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: p } = await supabase
        .from("firm_profiles")
        .select("firm_name, tagline, founded_year, total_lawyers, partner_count, general_email, careers_email, phone_main, hq_city")
        .eq("firm_slug", slug).maybeSingle();
      const [oc, pc, rc] = await Promise.all([
        supabase.from("firm_offices").select("id", { count: "exact", head: true }).eq("firm_slug", slug),
        supabase.from("firm_practice_areas").select("id", { count: "exact", head: true }).eq("firm_slug", slug),
        supabase.from("firm_rankings").select("id", { count: "exact", head: true }).eq("firm_slug", slug),
      ]);
      if (p) setCurrent({
        ...(p as Omit<CurrentFirm, "offices_count" | "practice_areas_count" | "rankings_count">),
        offices_count: oc.count ?? 0,
        practice_areas_count: pc.count ?? 0,
        rankings_count: rc.count ?? 0,
      });
    })();
  }, [slug]);

  async function handlePdfUpload(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("PDF too large (max 15MB)");
      return;
    }
    setPdfName(file.name);
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    setPdfBase64(btoa(binary));
  }

  async function handleExtract() {
    if (!slug) return;
    if (mode === "text" && !text.trim()) { toast.error("Paste some text first"); return; }
    if (mode === "pdf" && !pdfBase64) { toast.error("Upload a PDF first"); return; }
    setExtracting(true);
    setExtracted(null);
    try {
      const { data, error } = await supabase.functions.invoke("extract-firm-intelligence", {
        body: mode === "text"
          ? { slug, source_type: "text", text }
          : { slug, source_type: "pdf", pdf_base64: pdfBase64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExtracted(data.extracted);
      setSourceExcerpt(data.source_excerpt ?? "");
      // Default-pick everything that has a value
      const next: Record<string, boolean> = {};
      for (const k of SCALAR_KEYS) {
        const v = (data.extracted as Extracted)[k];
        if (v != null && v !== "") next[k] = true;
      }
      if ((data.extracted.offices ?? []).length) next.offices = true;
      if ((data.extracted.practice_areas ?? []).length) next.practice_areas = true;
      if ((data.extracted.rankings ?? []).length) next.rankings = true;
      if ((data.extracted.news ?? []).length) next.news = true;
      setPicked(next);
      toast.success("Extracted — review and apply");
    } catch (e) {
      toast.error(`Extraction failed: ${(e as Error).message}`);
    } finally {
      setExtracting(false);
    }
  }

  async function handleApply() {
    if (!slug || !extracted) return;
    setApplying(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const k of SCALAR_KEYS) if (picked[k as string]) patch[k as string] = extracted[k];
      if (picked.offices) patch.offices = extracted.offices ?? [];
      if (picked.practice_areas) patch.practice_areas = extracted.practice_areas ?? [];
      if (picked.rankings) patch.rankings = extracted.rankings ?? [];
      if (picked.news) patch.news = extracted.news ?? [];

      const { data, error } = await supabase.functions.invoke("apply-firm-intelligence", {
        body: {
          slug,
          patch,
          sections: {
            offices: !!picked.offices,
            practice_areas: !!picked.practice_areas,
            rankings: !!picked.rankings,
            news: !!picked.news,
          },
          source_type: mode,
          source_excerpt: sourceExcerpt,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Applied. Directory updated.");
      navigate("/admin/firm-intelligence");
    } catch (e) {
      toast.error(`Apply failed: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  }

  function update<K extends keyof Extracted>(k: K, v: Extracted[K]) {
    setExtracted((prev) => prev ? { ...prev, [k]: v } : prev);
  }

  if (roleLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!allowed) return <div className="p-8 text-sm text-destructive">Admin only.</div>;

  const fmt = (v: unknown) => v == null || v === "" ? "—" : String(v);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link to="/admin/firm-intelligence" className="mb-4 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to firm intelligence
      </Link>
      <h1 className="font-serif text-3xl font-bold tracking-tight">
        {current?.firm_name ?? slug}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste raw text or upload a PDF. AI will extract structured fields. Review the diff before applying.
      </p>

      {/* Source picker */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("text")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${mode === "text" ? "bg-foreground text-background" : "border border-border"}`}
          >
            <FileText className="h-4 w-4" /> Paste text
          </button>
          <button
            onClick={() => setMode("pdf")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${mode === "pdf" ? "bg-foreground text-background" : "border border-border"}`}
          >
            <Upload className="h-4 w-4" /> Upload PDF
          </button>
        </div>

        {mode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste brochure copy, partner email, ranking blurb, etc."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm font-mono"
          />
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background p-8 text-sm cursor-pointer hover:bg-muted/30">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span>{pdfName || "Click to choose a PDF (max 15MB)"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }}
            />
          </label>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? "Extracting…" : "Extract & preview"}
          </button>
        </div>
      </div>

      {/* Diff & apply */}
      {extracted && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Proposed changes</h2>

          {/* Scalar fields */}
          <div className="space-y-2">
            {SCALAR_KEYS.map((k) => {
              const cur = current ? (current as unknown as Record<string, unknown>)[k as string] : null;
              const next = extracted[k];
              if (next == null || next === "") return null;
              const changed = String(cur ?? "") !== String(next ?? "");
              return (
                <div key={k} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!!picked[k as string]}
                    onChange={(e) => setPicked((p) => ({ ...p, [k as string]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="w-32 font-mono text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
                  <span className="text-muted-foreground line-through">{fmt(cur)}</span>
                  <span>→</span>
                  <input
                    value={String(next ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      const isNum = ["founded_year", "total_lawyers", "partner_count"].includes(k as string);
                      update(k, (isNum ? (v ? Number(v) : null) : v) as never);
                    }}
                    className={`flex-1 rounded border px-2 py-1 text-sm ${changed ? "border-accent bg-accent/5" : "border-border"}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Sections */}
          <SectionRow
            label="Offices"
            count={extracted.offices?.length ?? 0}
            curCount={current?.offices_count ?? 0}
            checked={!!picked.offices}
            onToggle={(v) => setPicked((p) => ({ ...p, offices: v }))}
            preview={(extracted.offices ?? []).map((o) => `${o.city}${o.is_hq ? " (HQ)" : ""}`).join(", ")}
          />
          <SectionRow
            label="Practice areas"
            count={extracted.practice_areas?.length ?? 0}
            curCount={current?.practice_areas_count ?? 0}
            checked={!!picked.practice_areas}
            onToggle={(v) => setPicked((p) => ({ ...p, practice_areas: v }))}
            preview={(extracted.practice_areas ?? []).map((p) => p.name).join(", ")}
          />
          <SectionRow
            label="Rankings"
            count={extracted.rankings?.length ?? 0}
            curCount={current?.rankings_count ?? 0}
            checked={!!picked.rankings}
            onToggle={(v) => setPicked((p) => ({ ...p, rankings: v }))}
            preview={(extracted.rankings ?? []).map((r) => `${r.source} ${r.year} ${r.band_or_tier}`).join(", ")}
          />
          <SectionRow
            label="News (append)"
            count={extracted.news?.length ?? 0}
            curCount={null}
            checked={!!picked.news}
            onToggle={(v) => setPicked((p) => ({ ...p, news: v }))}
            preview={(extracted.news ?? []).map((n) => n.title).join(" · ")}
          />

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => { setExtracted(null); setPicked({}); }}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Discard
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {applying ? "Applying…" : "Apply changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionRow({ label, count, curCount, checked, onToggle, preview }: {
  label: string; count: number; curCount: number | null;
  checked: boolean; onToggle: (v: boolean) => void; preview: string;
}) {
  if (count === 0) return null;
  return (
    <div className="mt-2 flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <div className="flex-1">
        <div className="font-semibold">
          {label}: {curCount != null ? `${curCount} → ${count} (replace)` : `+${count} (append)`}
        </div>
        {preview && <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{preview}</div>}
      </div>
    </div>
  );
}
