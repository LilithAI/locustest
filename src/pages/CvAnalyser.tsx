import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Loader2, FileText, Sparkles, AlertTriangle, CheckCircle2, XCircle,
  Copy, Check, ScanSearch, RefreshCw, History, Trophy, Trash2, Briefcase,
  Scale, Building2, Cpu, BookOpen, GraduationCap, ListChecks, TrendingUp,
} from "lucide-react";

// ---------- Types (Indian Legal Blueprint v2) ----------
type Fix = {
  priority: number;
  area: string;
  issue: string;
  current_text: string;
  rewrite: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
};

type VectorScore = {
  overall_score: number;
  tier_fit_pct: number;
  verdict: string;
  strengths: string[];
  red_flags: string[];
  top_fixes: Fix[];
};

type Internship = {
  firm_or_chamber: string;
  tier: 1 | 2 | 3 | 4;
  role: string;
  year_or_period: string;
  duration_weeks: number;
  callback: boolean;
  substance_score: number;
  vector_alignment: "corporate" | "litigation" | "in_house" | "mixed" | "foundational";
};

type Moot = {
  name: string;
  tier: "global_t1" | "national_t1" | "national_t2" | "tier3";
  role: "speaker" | "researcher" | "both" | "unknown";
  outcome: string;
  vector_alignment: string;
};

type Publication = {
  title: string;
  venue: string;
  tier: "t1_peer_reviewed" | "t2_institutional" | "t1_commercial_blog" | "student_blog" | "predatory";
  vector_alignment: string;
};

type Analysis = {
  verdict_headline: string;
  candidate_snapshot: {
    name_present: boolean;
    college_detected: string;
    year_or_graduation: string;
    cgpa_or_rank: string;
    programme: string;
  };
  structural_audit: {
    length_pages: number;
    length_ok: boolean;
    font_compliant: boolean;
    chronological_order: boolean;
    has_photo_or_dob: boolean;
    uses_first_person: boolean;
    grammar_clean: boolean;
    bci_weeks_total: number;
    bci_compliant: boolean;
    bci_required_weeks: number;
    violations: string[];
  };
  pedigree: {
    institution_name: string;
    tier: 1 | 2 | 3;
    proximity_advantage: boolean;
    gpa_raw: string;
    gpa_context_note: string;
  };
  internship_ladder: Internship[];
  moots: Moot[];
  publications: Publication[];
  semantic_quality: {
    total_bullets: number;
    strong_verb_bullets: number;
    weak_verb_bullets: number;
    quantified_bullets: number;
    action_scale_outcome_bullets: number;
    top_weak_verbs_used: string[];
    example_weak_bullet: string;
    example_strong_bullet: string;
  };
  tech_literacy: {
    databases_mentioned: string[];
    ai_or_tech_mentioned: string[];
    score: number;
    verdict: string;
  };
  vector_scores: {
    corporate: VectorScore;
    litigation: VectorScore;
    in_house: VectorScore;
  };
  best_fit_vector: "corporate" | "litigation" | "in_house";
  hedging_warning: string;
};

type HistoryItem = {
  id: string;
  overall_score: number;
  verdict: string;
  created_at: string;
  cv_storage_path: string;
};

const CV_MAX_BYTES = 5 * 1024 * 1024;

const VECTOR_META: Record<"corporate" | "litigation" | "in_house", { label: string; sub: string; Icon: typeof Briefcase }> = {
  corporate: { label: "Corporate", sub: "Tier-1 firms · M&A · PE · Capital Markets", Icon: Briefcase },
  litigation: { label: "Litigation", sub: "Sr. counsel chambers · HC/SC · Arbitration", Icon: Scale },
  in_house: { label: "In-house", sub: "Corporate Legal · DPDP · Compliance · GC teams", Icon: Building2 },
};

// ---------- Multi-stage loader ----------
const STAGES = [
  { key: "upload", label: "Sending CV to reviewers", ms: 1200 },
  { key: "parse", label: "Parsing structure & BCI Rule 25 weeks", ms: 4000 },
  { key: "audit", label: "Auditing format, fonts, grammar", ms: 4000 },
  { key: "corp", label: "Scoring against Corporate vector", ms: 6000 },
  { key: "lit", label: "Scoring against Litigation vector", ms: 6000 },
  { key: "ih", label: "Scoring against In-house vector", ms: 5000 },
  { key: "fixes", label: "Generating prioritized fixes & rewrites", ms: 4000 },
];

const TIPS = [
  "Tier-1 partners triage 400 CVs/week. The trifecta — Action + Scale + Outcome — is what makes them stop scrolling.",
  "BCI Rule 25 mandates 20 weeks of internships for 5-year LLBs. Below that = non-compliant CV.",
  "A callback at the same Tier-1 firm in two windows is the single strongest signal a student CV can carry.",
  "GPA isn't comparable across institutions. 6.0 at NLSIU often beats 8.5 at a regional college.",
  "IndiaCorpLaw or IRCCL publications are read by partners. University blogs aren't.",
  "Resume Tetris — ten 1-week stints at brand-name firms — reads as logo collection, not substance.",
  "GLC Mumbai and CLC Delhi students bypass the NLU gate by interning at HCs all year long.",
  "In 2026, no mention of SCC Online, Manupatra or GenAI tools is a flag, not a neutral.",
];

function MultiStageLoader() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    let cumulative = 0;
    const timeouts: number[] = [];
    STAGES.forEach((s, i) => {
      cumulative += s.ms;
      const t = window.setTimeout(() => setActiveIdx(Math.min(i + 1, STAGES.length - 1)), cumulative);
      timeouts.push(t);
    });
    const tipInterval = window.setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 4500);
    const elapsedInterval = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      clearInterval(tipInterval);
      clearInterval(elapsedInterval);
    };
  }, []);

  return (
    <Card className="border-accent/40 bg-gradient-to-br from-accent/5 to-transparent">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-6 w-6 text-accent animate-spin" />
            </div>
            <div>
              <p className="font-heading font-bold text-base">Your CV is being reviewed</p>
              <p className="text-xs text-muted-foreground">Scored across Corporate, Litigation & In-house tracks</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm tabular-nums text-accent">{elapsed}s</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">elapsed · ~30s total</div>
          </div>
        </div>

        <div className="space-y-2.5 mb-6">
          {STAGES.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                  active ? "border-accent/50 bg-accent/10" :
                  done ? "border-border bg-muted/30" :
                  "border-border/50 opacity-50"
                }`}
              >
                <div className="shrink-0">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 text-accent animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border" />
                  )}
                </div>
                <span className={`text-sm ${active ? "text-foreground font-medium" : done ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" /> While you wait
          </div>
          <p key={tipIdx} className="text-sm text-foreground leading-relaxed animate-in fade-in duration-500">
            {TIPS[tipIdx]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Visual atoms ----------
function ScoreRing({ score, size = "md", label }: { score: number; size?: "md" | "sm"; label?: string }) {
  const dim = size === "sm" ? 130 : 180;
  const r = size === "sm" ? 52 : 72;
  const sw = size === "sm" ? 9 : 11;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const colorClass = score >= 75 ? "text-accent" : score >= 55 ? "text-foreground" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={r} className="fill-none stroke-border" strokeWidth={sw} />
          <circle
            cx="80" cy="80" r={r}
            className={`fill-none ${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-heading font-extrabold ${colorClass} ${size === "sm" ? "text-3xl" : "text-5xl"}`}>{score}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
      </div>
      {label && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>}
    </div>
  );
}

function PassFailRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${ok ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, accentLow }: { label: string; value: number; max: number; accentLow?: boolean }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  const tone = accentLow
    ? (pct < 30 ? "bg-accent" : pct < 60 ? "bg-foreground/70" : "bg-destructive/70")
    : (pct >= 70 ? "bg-accent" : pct >= 40 ? "bg-foreground/70" : "bg-destructive/70");
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-foreground font-medium">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{value} / {max} <span className="text-foreground/60">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full ${tone} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FirmTierPill({ tier }: { tier: 1 | 2 | 3 | 4 }) {
  const map: Record<number, string> = {
    1: "bg-accent/15 text-accent border-accent/30",
    2: "bg-foreground/10 text-foreground border-border",
    3: "bg-muted text-muted-foreground border-border",
    4: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const label: Record<number, string> = { 1: "T1 · Elite", 2: "T2 · National", 3: "T3 · Boutique", 4: "T4 · Local" };
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${map[tier]}`}>{label[tier]}</span>;
}

function MootTierPill({ tier }: { tier: Moot["tier"] }) {
  const map: Record<Moot["tier"], { tone: string; label: string }> = {
    global_t1: { tone: "bg-accent/15 text-accent border-accent/30", label: "Global T1" },
    national_t1: { tone: "bg-foreground/10 text-foreground border-border", label: "National T1" },
    national_t2: { tone: "bg-muted text-muted-foreground border-border", label: "National T2" },
    tier3: { tone: "bg-destructive/10 text-destructive border-destructive/30", label: "T3" },
  };
  return <span className={`inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${map[tier].tone}`}>{map[tier].label}</span>;
}

function PubTierPill({ tier }: { tier: Publication["tier"] }) {
  const map: Record<Publication["tier"], { tone: string; label: string }> = {
    t1_peer_reviewed: { tone: "bg-accent/15 text-accent border-accent/30", label: "T1 Peer-Reviewed" },
    t1_commercial_blog: { tone: "bg-accent/15 text-accent border-accent/30", label: "T1 Commercial Blog" },
    t2_institutional: { tone: "bg-foreground/10 text-foreground border-border", label: "T2 Institutional" },
    student_blog: { tone: "bg-muted text-muted-foreground border-border", label: "Student Blog" },
    predatory: { tone: "bg-destructive/10 text-destructive border-destructive/30", label: "Predatory" },
  };
  return <span className={`inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${map[tier].tone}`}>{map[tier].label}</span>;
}

function FixCard({ fix }: { fix: Fix }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(fix.rewrite);
    setCopied(true);
    toast.success("Rewrite copied");
    setTimeout(() => setCopied(false), 1500);
  };
  const impactTone =
    fix.impact === "high" ? "bg-destructive/15 text-destructive border-destructive/30" :
    fix.impact === "medium" ? "bg-accent/15 text-accent border-accent/30" :
    "bg-muted text-muted-foreground border-border";
  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-heading text-lg font-bold text-accent shrink-0">#{fix.priority}</span>
          <span className="font-heading text-base font-bold truncate">{fix.area}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Badge variant="outline" className={`text-[10px] uppercase ${impactTone}`}>{fix.impact} impact</Badge>
          <Badge variant="outline" className="text-[10px] uppercase">{fix.effort} effort</Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{fix.issue}</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Current</div>
          <div className="text-xs p-3 rounded-lg bg-muted/50 border border-border font-mono leading-relaxed whitespace-pre-wrap">
            {fix.current_text || "—"}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-accent">AI Rewrite</span>
            <button onClick={onCopy} className="text-[10px] inline-flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-xs p-3 rounded-lg bg-accent/5 border border-accent/30 leading-relaxed whitespace-pre-wrap">
            {fix.rewrite}
          </div>
        </div>
      </div>
    </div>
  );
}

function VectorCard({
  vectorKey, score, isBest, onClick, active,
}: {
  vectorKey: "corporate" | "litigation" | "in_house";
  score: VectorScore;
  isBest: boolean;
  onClick: () => void;
  active: boolean;
}) {
  const meta = VECTOR_META[vectorKey];
  const Icon = meta.Icon;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-5 transition-all ${
        active ? "border-accent bg-accent/5 ring-2 ring-accent/30" :
        isBest ? "border-accent/50 bg-accent/5 hover:border-accent" :
        "border-border bg-card hover:border-foreground/30"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isBest ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-heading font-bold text-base">{meta.label}</div>
            <div className="text-[10px] text-muted-foreground">{meta.sub}</div>
          </div>
        </div>
        {isBest && <Badge className="bg-accent text-accent-foreground hover:bg-accent text-[9px] uppercase">Best fit</Badge>}
      </div>
      <div className="flex items-end justify-between">
        <ScoreRing score={score.overall_score} size="sm" />
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tier-fit</div>
          <div className="font-heading text-2xl font-bold text-foreground">{score.tier_fit_pct}%</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 line-clamp-2 italic">"{score.verdict}"</p>
    </button>
  );
}

// ---------- Page ----------
export default function CvAnalyser() {
  usePageMeta({
    title: "CV Analyser",
    description: "Brutally honest, AI-powered CV review calibrated for the Indian legal market — Tier-1 firms, litigation chambers, NLU placement standards.",
    path: "/tools/cv-analyser",
  });
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingCv, setExistingCv] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeVector, setActiveVector] = useState<"corporate" | "litigation" | "in_house">("corporate");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      setAuthReady(true);
      if (!uid) return;
      const { data: cvRef } = await supabase.rpc("get_own_cv_ref");
      const cvRow = Array.isArray(cvRef) ? cvRef[0] : cvRef;
      const cvUrl = (cvRow as { cv_url?: string | null } | null)?.cv_url;
      if (cvUrl) setExistingCv(cvUrl);
      const { data: hist } = await supabase
        .from("cv_analyses")
        .select("id, overall_score, verdict, created_at, cv_storage_path")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (hist) setHistory(hist);
    })();
    return () => { mounted = false; };
  }, []);

  const pick = () => fileRef.current?.click();

  const runAnalysis = async (path: string) => {
    setAnalysing(true);
    setAnalysis(null);
    void track("cv_analyser_run");
    try {
      const { data, error } = await supabase.functions.invoke("analyse-cv", {
        body: { cv_storage_path: path },
      });
      if (error) {
        let body: { error?: string; retryable?: boolean } | null = null;
        try {
          const resp = (error as unknown as { context?: { response?: Response } })?.context?.response;
          if (resp) body = await resp.clone().json();
        } catch { /* ignore */ }
        if (!body) body = data as { error?: string } | null;
        toast.error(body?.error || error.message || "CV analysis failed");
        return;
      }
      const result = data as { id: string; created_at: string; analysis: Analysis };
      setAnalysis(result.analysis);
      setActiveVector(result.analysis.best_fit_vector ?? "corporate");
      setHistory((prev) => [
        { id: result.id, overall_score: result.analysis.vector_scores[result.analysis.best_fit_vector].overall_score, verdict: result.analysis.verdict_headline, created_at: result.created_at, cv_storage_path: path },
        ...prev,
      ].slice(0, 10));
      setTimeout(() => document.getElementById("cv-analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CV analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (file.type !== "application/pdf") { toast.error("CV must be a PDF"); return; }
    if (file.size > CV_MAX_BYTES) { toast.error("CV must be 5 MB or smaller"); return; }
    setUploading(true);
    const path = `${userId}/cv.pdf`;
    const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const uploadedAt = new Date().toISOString();
    await supabase.from("profiles").update({ cv_url: path, cv_uploaded_at: uploadedAt }).eq("id", userId);
    setExistingCv(path);
    setUploading(false);
    toast.success("CV uploaded");
    runAnalysis(path);
  };

  const deleteHistoryItem = async (id: string) => {
    const { error } = await supabase.from("cv_analyses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setHistory((prev) => prev.filter((h) => h.id !== id));
    toast.success("Deleted");
  };

  if (authReady && !userId) {
    return (
      <main className="pt-24 pb-16 container mx-auto px-4 md:px-8 max-w-3xl text-center">
        <ScanSearch className="h-12 w-12 text-accent mx-auto mb-4" />
        <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-3">CV Analyser</h1>
        <p className="text-muted-foreground mb-6">Sign in to get a brutally honest, partner-voice review of your legal CV.</p>
        <Button onClick={() => navigate("/auth?redirect=/tools/cv-analyser")} className="bg-accent text-accent-foreground hover:brightness-110">
          Sign in to continue
        </Button>
      </main>
    );
  }

  const activeScore = analysis?.vector_scores[activeVector];

  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="container mx-auto px-4 md:px-8 max-w-5xl text-center mb-10">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-accent border border-accent/30 bg-accent/5 px-3 py-1 rounded-full mb-4">
          <Sparkles className="h-3 w-3" /> Built for Indian law students · Scored on 3 career tracks
        </div>
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
          The CV review you'd <span className="text-accent">never get</span> in person.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Scored against Corporate, Litigation, and In-house vectors. BCI Rule 25 audit. Action-Scale-Outcome semantic check. Copy-pasteable rewrites.
        </p>
      </section>

      {/* Upload panel */}
      <section className="container mx-auto px-4 md:px-8 max-w-3xl mb-10">
        <Card className="border-border">
          <CardContent className="p-6">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            {existingCv ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-9 w-9 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">CV on file</p>
                    <p className="text-xs text-muted-foreground truncate">Ready for analysis</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button onClick={() => runAnalysis(existingCv)} disabled={analysing || uploading} className="bg-accent text-accent-foreground hover:brightness-110">
                    {analysing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {analysing ? "Analysing…" : "Analyse my CV"}
                  </Button>
                  <Button variant="outline" onClick={pick} disabled={uploading || analysing}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Replace
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">Upload your CV (PDF, max 5 MB)</p>
                <p className="text-sm text-muted-foreground mb-5">Only you can access it. Analysis is private.</p>
                <Button onClick={pick} disabled={uploading} className="bg-accent text-accent-foreground hover:brightness-110">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Choose PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Multi-stage loader */}
      {analysing && (
        <section className="container mx-auto px-4 md:px-8 max-w-3xl mb-10">
          <MultiStageLoader />
        </section>
      )}

      {/* Results */}
      {analysis && (
        <section id="cv-analysis-results" className="container mx-auto px-4 md:px-8 max-w-5xl space-y-8">
          {/* Headline verdict */}
          <Card className="border-border">
            <CardContent className="p-6 md:p-8">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                <Trophy className="h-3 w-3 text-accent" /> Partner Verdict · Best fit: {VECTOR_META[analysis.best_fit_vector].label}
              </div>
              <p className="font-heading text-xl md:text-2xl font-bold leading-snug mb-4">"{analysis.verdict_headline}"</p>
              {analysis.hedging_warning && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 mb-4">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground"><strong className="text-destructive">Hedging:</strong> {analysis.hedging_warning}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {analysis.candidate_snapshot.college_detected && (
                  <span><strong className="text-foreground">College:</strong> {analysis.candidate_snapshot.college_detected}</span>
                )}
                {analysis.candidate_snapshot.programme && (
                  <span><strong className="text-foreground">Programme:</strong> {analysis.candidate_snapshot.programme}</span>
                )}
                {analysis.candidate_snapshot.year_or_graduation && (
                  <span><strong className="text-foreground">Year:</strong> {analysis.candidate_snapshot.year_or_graduation}</span>
                )}
                {analysis.candidate_snapshot.cgpa_or_rank && (
                  <span><strong className="text-foreground">CGPA:</strong> {analysis.candidate_snapshot.cgpa_or_rank}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3-vector scores */}
          <div>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" /> Three vectors · three independent scores
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(["corporate", "litigation", "in_house"] as const).map((k) => (
                <VectorCard
                  key={k}
                  vectorKey={k}
                  score={analysis.vector_scores[k]}
                  isBest={analysis.best_fit_vector === k}
                  active={activeVector === k}
                  onClick={() => {
                    setActiveVector(k);
                    setTimeout(() => document.getElementById("vector-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Structural audit */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-accent" /> Structural Audit · Hygiene & BCI Rule 25
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-2.5">
                <PassFailRow label="Length within 1–2 pages" ok={analysis.structural_audit.length_ok} detail={`Detected ${analysis.structural_audit.length_pages} page(s)`} />
                <PassFailRow label="Font discipline (Times/Garamond, 11–12)" ok={analysis.structural_audit.font_compliant} />
                <PassFailRow label="Reverse chronological order" ok={analysis.structural_audit.chronological_order} />
                <PassFailRow label="No photo / DOB / marital status" ok={!analysis.structural_audit.has_photo_or_dob} />
                <PassFailRow label="No first-person pronouns" ok={!analysis.structural_audit.uses_first_person} />
                <PassFailRow label="Grammar & orthography clean" ok={analysis.structural_audit.grammar_clean} />
                <PassFailRow
                  label="BCI Rule 25 internship weeks"
                  ok={analysis.structural_audit.bci_compliant}
                  detail={`${analysis.structural_audit.bci_weeks_total} weeks logged · ${analysis.structural_audit.bci_required_weeks} required`}
                />
              </div>
              {analysis.structural_audit.violations.length > 0 && (
                <div className="border-t border-border pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-destructive mb-2">Specific violations</div>
                  <ul className="space-y-1.5 text-sm">
                    {analysis.structural_audit.violations.map((v, i) => (
                      <li key={i} className="flex gap-2"><span className="text-destructive shrink-0">▸</span><span>{v}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pedigree */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" /> Pedigree
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-heading text-lg font-bold">{analysis.pedigree.institution_name || "Unknown"}</span>
                <FirmTierPill tier={analysis.pedigree.tier as 1 | 2 | 3} />
                {analysis.pedigree.proximity_advantage && (
                  <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase">Proximity Advantage</Badge>
                )}
              </div>
              {analysis.pedigree.gpa_raw && (
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">CGPA:</strong> {analysis.pedigree.gpa_raw}
                  {analysis.pedigree.gpa_context_note && <span className="block text-xs mt-1 italic">{analysis.pedigree.gpa_context_note}</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internship Ladder */}
          {analysis.internship_ladder.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-accent" /> Internship Ladder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {analysis.internship_ladder.map((i, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 ${
                        i.tier === 1 ? "bg-accent border-accent" :
                        i.tier === 2 ? "bg-foreground border-foreground" :
                        i.tier === 3 ? "bg-muted-foreground border-muted-foreground" :
                        "bg-destructive border-destructive"
                      }`} />
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-base">{i.firm_or_chamber}</span>
                        <FirmTierPill tier={i.tier} />
                        {i.callback && <Badge className="bg-accent text-accent-foreground hover:bg-accent text-[9px] uppercase">⚡ Callback</Badge>}
                        <Badge variant="outline" className="text-[10px] uppercase">{i.vector_alignment.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {i.role} · {i.year_or_period} · {i.duration_weeks} weeks · substance {i.substance_score}/10
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Moots + Publications */}
          {(() => {
            const hasMoots = analysis.moots.length > 0;
            const hasPubs = analysis.publications.length > 0;
            // If only one is populated, give it the full row.
            const fullWidth = hasMoots !== hasPubs;
            const gridClass = fullWidth ? "grid grid-cols-1 gap-6" : "grid md:grid-cols-2 gap-6";

            const MootsCard = (
              <Card className="border-2 border-border">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Trophy className="h-4 w-4 text-accent" /> Moots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasMoots ? (
                    <ul className="space-y-2.5">
                      {analysis.moots.map((m, i) => (
                        <li
                          key={i}
                          className="border-2 border-foreground/15 rounded-xl p-3 bg-card transition-colors hover:border-accent/40"
                        >
                          <div className="mb-1.5">
                            <MootTierPill tier={m.tier} />
                          </div>
                          <p className="font-heading text-sm font-semibold leading-snug break-words text-foreground">
                            {m.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.role} · {m.outcome}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-6 text-center">
                      No moots detected.
                    </p>
                  )}
                </CardContent>
              </Card>
            );

            const PubsCard = (
              <Card className="border-2 border-border">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2 text-sm uppercase tracking-wider">
                    <BookOpen className="h-4 w-4 text-accent" /> Publications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasPubs ? (
                    <ul className="space-y-2.5">
                      {analysis.publications.map((p, i) => (
                        <li
                          key={i}
                          className="border-2 border-foreground/15 rounded-xl p-3 bg-card transition-colors hover:border-accent/40"
                        >
                          <div className="mb-1.5">
                            <PubTierPill tier={p.tier} />
                          </div>
                          <p className="font-heading text-sm font-semibold leading-snug break-words text-foreground">
                            {p.title}
                          </p>
                          {p.venue && (
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {p.venue}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-6 text-center">
                      No publications detected.
                    </p>
                  )}
                </CardContent>
              </Card>
            );

            // Both empty → render a single combined empty card
            if (!hasMoots && !hasPubs) {
              return (
                <Card className="border-2 border-border">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2 text-sm uppercase tracking-wider">
                      <Trophy className="h-4 w-4 text-accent" /> Moots & Publications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground italic py-6 text-center">
                      No moots or publications detected.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className={gridClass}>
                {hasMoots && MootsCard}
                {hasPubs && PubsCard}
                {/* When both populated, render in original order */}
                {!hasMoots && !fullWidth && MootsCard}
                {!hasPubs && !fullWidth && PubsCard}
              </div>
            );
          })()}

          {/* Semantic quality */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <ScanSearch className="h-5 w-5 text-accent" /> Semantic Quality · Action + Scale + Outcome
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                <StatBar label="Strong-verb bullets" value={analysis.semantic_quality.strong_verb_bullets} max={analysis.semantic_quality.total_bullets || 1} />
                <StatBar label="Weak-verb bullets" value={analysis.semantic_quality.weak_verb_bullets} max={analysis.semantic_quality.total_bullets || 1} accentLow />
                <StatBar label="Quantified bullets" value={analysis.semantic_quality.quantified_bullets} max={analysis.semantic_quality.total_bullets || 1} />
                <StatBar label="Action + Scale + Outcome trifecta" value={analysis.semantic_quality.action_scale_outcome_bullets} max={analysis.semantic_quality.total_bullets || 1} />
              </div>
              {analysis.semantic_quality.top_weak_verbs_used.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Weak verbs over-used</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.semantic_quality.top_weak_verbs_used.map((v, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {analysis.semantic_quality.example_weak_bullet && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-destructive mb-1.5">Weakest bullet on your CV</div>
                    <div className="text-xs p-3 rounded-lg bg-destructive/5 border border-destructive/30 italic">"{analysis.semantic_quality.example_weak_bullet}"</div>
                  </div>
                )}
                {analysis.semantic_quality.example_strong_bullet && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-accent mb-1.5">Strongest bullet on your CV</div>
                    <div className="text-xs p-3 rounded-lg bg-accent/5 border border-accent/30 italic">"{analysis.semantic_quality.example_strong_bullet}"</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tech literacy */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Cpu className="h-5 w-5 text-accent" /> Tech & AI Literacy <span className="ml-auto text-base font-mono text-muted-foreground">{analysis.tech_literacy.score}/10</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground italic">"{analysis.tech_literacy.verdict}"</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Legal databases</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tech_literacy.databases_mentioned.length ? analysis.tech_literacy.databases_mentioned.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">{d}</Badge>
                    )) : <span className="text-xs text-destructive italic">None mentioned — flag in 2026.</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">AI / Legal tech</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tech_literacy.ai_or_tech_mentioned.length ? analysis.tech_literacy.ai_or_tech_mentioned.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">{d}</Badge>
                    )) : <span className="text-xs text-destructive italic">None mentioned.</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vector deep-dive */}
          {activeScore && (
            <div id="vector-detail" className="space-y-6 pt-4 border-t-2 border-accent/30">
              <div className="flex items-center gap-3">
                {(() => { const Icon = VECTOR_META[activeVector].Icon; return <Icon className="h-6 w-6 text-accent" />; })()}
                <div>
                  <h2 className="font-heading text-2xl font-bold">{VECTOR_META[activeVector].label} vector — deep dive</h2>
                  <p className="text-sm text-muted-foreground">{VECTOR_META[activeVector].sub}</p>
                </div>
              </div>

              <Card className="border-border">
                <CardContent className="p-6">
                  <p className="font-heading text-lg font-bold leading-snug mb-2">"{activeScore.verdict}"</p>
                  <div className="flex gap-6 mt-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall</div>
                      <div className="font-heading text-3xl font-extrabold text-accent">{activeScore.overall_score}<span className="text-base text-muted-foreground">/100</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tier-fit shortlist probability</div>
                      <div className="font-heading text-3xl font-extrabold">{activeScore.tier_fit_pct}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-accent/30">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2 text-accent text-base">
                      <CheckCircle2 className="h-4 w-4" /> Strengths for {VECTOR_META[activeVector].label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeScore.strengths.length ? (
                      <ul className="space-y-2 text-sm">
                        {activeScore.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2"><span className="text-accent shrink-0">▸</span><span>{s}</span></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No genuine strengths flagged for this vector.</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2 text-destructive text-base">
                      <AlertTriangle className="h-4 w-4" /> Red flags for {VECTOR_META[activeVector].label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeScore.red_flags.length ? (
                      <ul className="space-y-2 text-sm">
                        {activeScore.red_flags.map((s, i) => (
                          <li key={i} className="flex gap-2"><span className="text-destructive shrink-0">▸</span><span>{s}</span></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No red flags for this vector.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {activeScore.top_fixes.length > 0 && (
                <div>
                  <h3 className="font-heading text-xl font-bold mb-4">Prioritized fixes for {VECTOR_META[activeVector].label} — copy &amp; paste</h3>
                  <div className="space-y-4">
                    {activeScore.top_fixes
                      .slice()
                      .sort((a, b) => a.priority - b.priority)
                      .map((f, i) => <FixCard key={i} fix={f} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="container mx-auto px-4 md:px-8 max-w-5xl mt-12">
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-accent" /> Previous reviews
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:border-accent/40 transition-colors">
                <div className={`font-heading text-xl font-extrabold w-12 text-center ${
                  h.overall_score >= 75 ? "text-accent" : h.overall_score >= 55 ? "text-foreground" : "text-destructive"
                }`}>{h.overall_score}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">"{h.verdict}"</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => deleteHistoryItem(h.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2"
                  aria-label="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
