import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  X,
  Award,
  Users,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { BETA_STAGES, INTRO_LINES, TOTAL_TASKS } from "@/content/beta-checklist";

type TaskStatus = "pass" | "fail" | "blocked";

type TaskResponse = {
  status?: TaskStatus;
  notes?: string;
  screenshotPath?: string;
  screenshotName?: string;
};

type Responses = Record<string, TaskResponse>;

type Tester = {
  id: string;
  slot_number: number;
  display_name: string;
  email: string | null;
  is_public: boolean;
  intro_line_index: number;
  submitted_at: string | null;
};

type RosterEntry = {
  slot_number: number;
  display_name: string;
  submitted: boolean;
  isYou: boolean;
};

const TESTER_STORAGE_KEY = "locus-beta-tester-id-v2";

const statusMeta: Record<
  TaskStatus,
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  pass: { label: "Pass", icon: CheckCircle2, color: "text-emerald-400 border-emerald-400 bg-emerald-400/10" },
  fail: { label: "Fail", icon: XCircle, color: "text-red-400 border-red-400 bg-red-400/10" },
  blocked: { label: "Blocked", icon: AlertOctagon, color: "text-yellow-400 border-yellow-400 bg-yellow-400/10" },
};

const pad = (n: number) => String(n).padStart(3, "0");

export default function BetaChecklist() {
  usePageMeta({
    title: "Locus · Founding Tester Checklist",
    description: "Help shape Locus before launch. Founding-tester checklist.",
    path: "/beta",
  });

  // Block search engines from indexing this private page.
  useEffect(() => {
    let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !el;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) el?.remove();
      else if (prev !== null) el?.setAttribute("content", prev);
    };
  }, []);

  const { session, userId } = useAuthSession();

  const [tester, setTester] = useState<Tester | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [bootLoading, setBootLoading] = useState(true);
  const [introDismissed, setIntroDismissed] = useState(false);

  // Claim form state
  const [claimName, setClaimName] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPublic, setClaimPublic] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const DRAFT_KEY = useMemo(
    () => (tester ? `locus-beta-draft-${tester.id}` : null),
    [tester],
  );

  // Load roster + totals + restore tester from localStorage
  const refreshRoster = async () => {
    const { data: publicRows } = await supabase
      .from("beta_testers_public" as any)
      .select("slot_number, display_name, submitted_at")
      .order("slot_number", { ascending: true });
    if (publicRows) {
      setRoster(
        (publicRows as any[]).map((r) => ({
          slot_number: r.slot_number,
          display_name: r.display_name,
          submitted: !!r.submitted_at,
          isYou: false,
        })),
      );
    }
    // Aggregate counts via RPC (anon can't read private rows directly post-RLS lockdown)
    const { data: totals } = await supabase.rpc("get_beta_tester_totals");
    const row = Array.isArray(totals) ? totals[0] : totals;
    setTotalClaimed(row?.total_claimed ?? 0);
    setTotalSubmitted(row?.total_submitted ?? 0);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const storedId = typeof window !== "undefined" ? localStorage.getItem(TESTER_STORAGE_KEY) : null;
      if (storedId) {
        const { data } = await supabase.rpc("get_beta_tester_self", { p_id: storedId });
        const row = Array.isArray(data) ? data[0] : data;
        if (active && row) {
          setTester(row as Tester);
          if (row.submitted_at) setSubmitted(true);
        }
      }
      await refreshRoster();
      if (active) setBootLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill claim email from session if signed in
  useEffect(() => {
    if (session?.user?.email && !claimEmail) {
      setClaimEmail(session.user.email);
    }
  }, [session, claimEmail]);

  // Mark roster "isYou"
  const rosterDisplay = useMemo(() => {
    if (!tester) return roster;
    return roster.map((r) => ({ ...r, isYou: r.slot_number === tester.slot_number }));
  }, [roster, tester]);

  const [openStage, setOpenStage] = useState<string>(BETA_STAGES[0].id);
  const [score, setScore] = useState<number>(7);
  const [generalNotes, setGeneralNotes] = useState("");
  const [responses, setResponses] = useState<Responses>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  // Load draft when tester is known
  useEffect(() => {
    if (!DRAFT_KEY) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.score === "number") setScore(parsed.score);
      if (parsed.generalNotes) setGeneralNotes(parsed.generalNotes);
      if (parsed.responses) setResponses(parsed.responses);
    } catch {
      /* ignore */
    }
  }, [DRAFT_KEY]);

  // Save draft
  useEffect(() => {
    if (!DRAFT_KEY || submitted) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ score, generalNotes, responses }));
    } catch {
      /* ignore */
    }
  }, [DRAFT_KEY, submitted, score, generalNotes, responses]);

  const completedCount = useMemo(
    () => Object.values(responses).filter((r) => r.status !== undefined).length,
    [responses],
  );
  const progressPct = Math.round((completedCount / TOTAL_TASKS) * 100);

  const updateResponse = (taskId: string, patch: Partial<TaskResponse>) => {
    setResponses((prev) => ({ ...prev, [taskId]: { ...prev[taskId], ...patch } }));
  };

  const handleClaim = async () => {
    const name = claimName.trim();
    if (!name) {
      toast("Add your name to claim a slot");
      return;
    }
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_beta_slot", {
        p_name: name,
        p_email: (claimEmail.trim() || null) as string,
        p_user_id: userId as string,
        p_is_public: claimPublic,
      });
      if (error) throw error;
      const row = data as Tester;
      setTester(row);
      try { localStorage.setItem(TESTER_STORAGE_KEY, row.id); } catch { /* ignore */ }
      await refreshRoster();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = raw.includes("name_required")
        ? "Please add your name."
        : raw.toLowerCase().includes("slot_number")
          ? "Couldn't reserve a slot — please refresh and try again."
          : raw || "Could not claim a slot";
      toast("Could not claim your slot", { description: friendly });
      // eslint-disable-next-line no-console
      console.error("[claim_beta_slot]", err);
    } finally {
      setClaiming(false);
    }
  };

  const handleScreenshot = async (taskId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast("Screenshot too large", { description: "Please keep it under 5 MB." });
      return;
    }
    setUploadingTaskId(taskId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `drafts/${Date.now()}-${taskId}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("beta-screenshots")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      updateResponse(taskId, { screenshotPath: path, screenshotName: file.name });
      toast("Screenshot attached");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast("Upload failed", { description: msg });
    } finally {
      setUploadingTaskId(null);
    }
  };

  const handleSubmit = async () => {
    if (!tester) return;
    if (completedCount === 0) {
      toast("Mark at least one task before submitting");
      return;
    }
    setSubmitting(true);
    try {
      // NOTE: do NOT chain .select() here — non-admin testers don't have
      // SELECT permission on beta_feedback (admin-only RLS), so reading the
      // row back would fail with 42501 and roll the insert back.
      const { error } = await supabase.from("beta_feedback").insert({
        tester_name: tester.display_name,
        tester_email: tester.email,
        overall_score: score,
        general_notes: generalNotes.trim() || null,
        responses: responses as never,
        user_agent: navigator.userAgent,
        tester_id: tester.id,
      });
      if (error) throw error;

      await supabase.rpc("mark_beta_tester_submitted", { p_id: tester.id });

      if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
      await refreshRoster();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast("Submission failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Loading ----
  if (bootLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin" />
      </main>
    );
  }

  // ---- Claim screen (no tester yet) ----
  if (!tester) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative max-w-md w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-foreground bg-card mb-6 shadow-[3px_3px_0_0_hsl(var(--primary))]">
            <Award className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              Closed Beta · Founding Testers
            </span>
          </div>

          <h1 className="font-[Sora] text-4xl font-black leading-[1.05] mb-4">
            Claim your slot.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            You're about to become Founding Tester #{pad(totalClaimed + 1)}. Walk through Locus
            for ~30 minutes, mark what works, flag what doesn't. Your notes ship the launch.
          </p>

          <div className="border-2 border-foreground bg-card p-6 shadow-[5px_5px_0_0_hsl(var(--foreground))] space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Your name <span className="text-primary">*</span>
              </label>
              <Input
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleClaim(); }}
                placeholder="e.g. Anam Khan"
                className="border-2 border-foreground bg-background"
                maxLength={80}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Email <span className="text-muted-foreground font-normal normal-case">(optional — so we can follow up)</span>
              </label>
              <Input
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-foreground bg-background"
                maxLength={160}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={claimPublic}
                onChange={(e) => setClaimPublic(e.target.checked)}
                className="mt-0.5 w-4 h-4 border-2 border-foreground accent-primary cursor-pointer"
              />
              <span className="text-sm leading-snug">
                <span className="font-bold">Show my name on the public Founding Tester board.</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Uncheck to stay anonymous. You'll still get the badge.
                </span>
              </span>
            </label>

            <Button
              onClick={handleClaim}
              disabled={claiming || !claimName.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-[Sora] font-black h-12"
            >
              {claiming ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Claiming…</>
              ) : (
                <>Claim my slot <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>

          <p className="mt-6 font-mono text-[10px] text-muted-foreground uppercase tracking-widest text-center">
            {totalClaimed} claimed · {totalSubmitted} submitted
          </p>
        </div>
      </main>
    );
  }

  const introLine = INTRO_LINES[tester.intro_line_index % INTRO_LINES.length] ?? INTRO_LINES[0];

  // ---- Cinematic intro ----
  if (!introDismissed && !submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative max-w-xl w-full text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-foreground bg-card mb-8 shadow-[3px_3px_0_0_hsl(var(--primary))]">
            <Award className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              Founding Tester · #{pad(tester.slot_number)}
            </span>
          </div>

          <h1 className="font-[Sora] text-4xl md:text-6xl font-black leading-[1.05] mb-6">
            Welcome, {tester.display_name.split(" ")[0]}.
            <br />
            <span className="text-primary">You're Founding Tester</span>
            <br />
            #{pad(tester.slot_number)}.
          </h1>

          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto">
            {introLine}
          </p>

          <Button
            onClick={() => setIntroDismissed(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[3px] hover:translate-y-[3px] transition-all font-[Sora] font-black text-base h-12 px-8"
          >
            Begin
          </Button>

          <p className="mt-8 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {totalSubmitted} of {totalClaimed} have submitted
          </p>
        </div>
      </main>
    );
  }

  // ---- Submitted ----
  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-background">
        <div className="max-w-lg w-full border-2 border-foreground bg-card p-10 shadow-[6px_6px_0_0_hsl(var(--foreground))] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-foreground bg-background mb-6 shadow-[3px_3px_0_0_hsl(var(--primary))]">
            <Award className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
              Founding Tester · #{pad(tester.slot_number)}
            </span>
          </div>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-6 text-primary" strokeWidth={2.5} />
          <h1 className="font-[Sora] text-3xl font-black mb-3">
            Thank you, {tester.display_name.split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Your feedback is in. {tester.is_public
              ? "Your name's on the Founding Tester board — that won't ever come off."
              : "You stayed anonymous, but the badge is still yours."}
          </p>
          <a
            href="/beta/round-2"
            className="inline-flex items-center gap-2 px-4 py-2.5 mb-6 border-2 border-foreground bg-yellow-400 text-background font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition"
          >
            Open Round 2 <ArrowRight className="w-4 h-4" />
          </a>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {totalSubmitted} of {totalClaimed} have submitted
          </p>
        </div>
      </main>
    );
  }

  // ---- Main checklist ----
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Sticky progress */}
      <div className="sticky top-0 z-30 bg-background border-b-2 border-foreground">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-foreground bg-card shrink-0">
                <Award className="w-3 h-3 text-primary" strokeWidth={2.5} />
                <span className="font-mono text-[10px] font-bold tracking-widest">
                  #{pad(tester.slot_number)}
                </span>
              </span>
              <p className="font-[Sora] text-xs font-bold tracking-widest uppercase truncate">
                Locus · Founding Tester
              </p>
            </div>
            <p className="text-xs font-mono shrink-0">
              {completedCount} / {TOTAL_TASKS} tasks
            </p>
          </div>
          <div className="h-2 border border-foreground bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-10 grid lg:grid-cols-[1fr_260px] gap-10">
        {/* Main column */}
        <div className="min-w-0">
          <h1 className="font-[Sora] text-4xl md:text-5xl font-black leading-tight mb-3">
            Hey {tester.display_name.split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Walk through Locus the way a real student would. ~30 minutes. Mark each task,
            drop notes for anything weird, attach screenshots when it helps.
          </p>
          <p className="text-xs text-muted-foreground mb-10">
            Your progress auto-saves on this device. You can close the tab and come back.
          </p>

          {/* Stages */}
          <div className="space-y-5">
            {BETA_STAGES.map((stage) => {
              const isOpen = openStage === stage.id;
              const stageDone = stage.tasks.filter(
                (t) => responses[t.id]?.status !== undefined,
              ).length;
              return (
                <section
                  key={stage.id}
                  className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenStage(isOpen ? "" : stage.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="font-[Sora] text-2xl font-black text-primary shrink-0">
                        0{stage.number}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-[Sora] text-lg font-bold truncate">
                          {stage.title}
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">
                          {stage.subtitle} · ~{stage.estMinutes} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        {stageDone}/{stage.tasks.length}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-foreground divide-y-2 divide-foreground">
                      {stage.tasks.map((task) => {
                        const r = responses[task.id] ?? {};
                        return (
                          <div key={task.id} className="p-5 space-y-4">
                            <div>
                              <div className="flex items-baseline gap-3 mb-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {task.id}
                                </span>
                                <h3 className="font-[Sora] font-bold">{task.title}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {task.detail}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(Object.keys(statusMeta) as TaskStatus[]).map((s) => {
                                const meta = statusMeta[s];
                                const Icon = meta.icon;
                                const active = r.status === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => updateResponse(task.id, { status: s })}
                                    className={cn(
                                      "inline-flex items-center gap-2 px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wider transition",
                                      active
                                        ? meta.color
                                        : "border-foreground/30 text-muted-foreground hover:border-foreground hover:text-foreground",
                                    )}
                                  >
                                    <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    {meta.label}
                                  </button>
                                );
                              })}
                            </div>

                            <Textarea
                              placeholder="Bug, friction, idea — anything you noticed."
                              value={r.notes ?? ""}
                              onChange={(e) =>
                                updateResponse(task.id, { notes: e.target.value })
                              }
                              className="border-2 border-foreground bg-background min-h-[70px] text-sm"
                            />

                            <div className="flex items-center gap-3 flex-wrap">
                              <label
                                className={cn(
                                  "inline-flex items-center gap-2 px-3 py-1.5 border-2 border-foreground bg-background text-xs font-bold cursor-pointer hover:bg-muted transition",
                                  uploadingTaskId === task.id &&
                                    "opacity-50 cursor-not-allowed",
                                )}
                              >
                                {uploadingTaskId === task.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Paperclip className="w-3.5 h-3.5" />
                                )}
                                {r.screenshotPath ? "Replace screenshot" : "Attach screenshot"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingTaskId === task.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleScreenshot(task.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {r.screenshotName && (
                                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="truncate max-w-[180px]">
                                    {r.screenshotName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateResponse(task.id, {
                                        screenshotPath: undefined,
                                        screenshotName: undefined,
                                      })
                                    }
                                    className="hover:text-foreground"
                                    aria-label="Remove screenshot"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Wrap-up form */}
          <section className="mt-10 border-2 border-foreground bg-card p-6 shadow-[4px_4px_0_0_hsl(var(--foreground))] space-y-5">
            <h2 className="font-[Sora] text-xl font-black">A couple last things</h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-3">
                Overall, how did Locus feel? · {score}/10
              </label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[score]}
                onValueChange={(v) => setScore(v[0])}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
                <span>Painful</span>
                <span>Loved it</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                Anything else
              </label>
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="What's the one thing you wish was different? What surprised you?"
                className="border-2 border-foreground bg-background min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-[Sora] font-black text-base h-12"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit feedback"
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              One submission per tester. Drafts auto-save until you submit.
            </p>
          </section>
        </div>

        {/* Roster sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-3.5 h-3.5" />
              <h3 className="font-[Sora] text-xs font-black uppercase tracking-widest">
                Founding Testers
              </h3>
            </div>
            <p className="font-[Sora] text-3xl font-black mb-1">
              {totalSubmitted}<span className="text-muted-foreground">/{totalClaimed}</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-5">
              have submitted
            </p>
            <ul className="space-y-2">
              {rosterDisplay.map((r) => (
                <li
                  key={r.slot_number}
                  className={cn(
                    "flex items-center gap-3 text-xs",
                    r.isYou && "font-bold",
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-8">
                    #{pad(r.slot_number)}
                  </span>
                  <span className="flex-1 truncate">
                    {r.display_name}
                    {r.isYou && <span className="text-primary"> (you)</span>}
                  </span>
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      r.submitted ? "bg-primary" : "bg-foreground/15",
                    )}
                    aria-label={r.submitted ? "submitted" : "pending"}
                  />
                </li>
              ))}
              {tester && !tester.is_public && (
                <li className="text-[10px] text-muted-foreground italic pt-2 border-t border-foreground/10">
                  You chose to stay off the public board.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
