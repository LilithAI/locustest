import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { R2_SECTIONS, R2_TOTAL_QUESTIONS, type R2Question } from "@/content/beta-round2";

type Answer = string | number | string[];
type Answers = Record<string, Answer>;

type Tester = {
  id: string;
  display_name: string;
  email: string | null;
  submitted_at: string | null;
  round2_submitted_at: string | null;
};

const TESTER_STORAGE_KEY = "locus-beta-tester-id-v2";
const DRAFT_KEY_PREFIX = "locus-beta-r2-draft-";

export default function BetaRound2() {
  usePageMeta({
    title: "Locus · Founding Tester · Round 2",
    description: "Round 2 feedback for Locus Founding Testers.",
    path: "/beta/round-2",
  });

  // No-index private page
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

  const [tester, setTester] = useState<Tester | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recovering, setRecovering] = useState(false);

  const draftKey = useMemo(
    () => (tester ? `${DRAFT_KEY_PREFIX}${tester.id}` : null),
    [tester],
  );

  const applyTesterRow = (row: Tester | null) => {
    if (!row) {
      setEligible(false);
      return false;
    }
    setTester(row);
    const isEligible = !!row.submitted_at;
    setEligible(isEligible);
    if (row.round2_submitted_at) setSubmitted(true);
    try {
      localStorage.setItem(TESTER_STORAGE_KEY, row.id);
    } catch {
      /* ignore */
    }
    return isEligible;
  };

  // Boot — restore tester from localStorage, then ?as= fallback
  useEffect(() => {
    let active = true;
    (async () => {
      const storedId =
        typeof window !== "undefined" ? localStorage.getItem(TESTER_STORAGE_KEY) : null;
      if (storedId) {
        const { data } = await supabase.rpc("get_beta_tester_self", { p_id: storedId });
        const row = (Array.isArray(data) ? data[0] : data) as Tester | null;
        if (!active) return;
        if (row) {
          applyTesterRow(row);
          setBootLoading(false);
          return;
        }
      }

      // Fallback: ?as=<email> recovery
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      const asEmail = params.get("as")?.trim();
      if (asEmail) {
        const { data } = await supabase.rpc("find_round2_tester", { p_email: asEmail });
        const row = (Array.isArray(data) ? data[0] : data) as Tester | null;
        if (!active) return;
        if (row) {
          applyTesterRow(row);
          // Clean URL so the email isn't kept around
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("as");
            window.history.replaceState({}, "", url.toString());
          } catch {
            /* ignore */
          }
          setBootLoading(false);
          return;
        }
      }

      if (active) {
        setEligible(false);
        setBootLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load draft
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.generalNotes) setGeneralNotes(parsed.generalNotes);
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  // Save draft
  useEffect(() => {
    if (!draftKey || submitted) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ answers, generalNotes }));
    } catch {
      /* ignore */
    }
  }, [draftKey, submitted, answers, generalNotes]);

  const setAnswer = (qid: string, value: Answer) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const completedCount = useMemo(
    () =>
      Object.values(answers).filter((v) => {
        if (typeof v === "string") return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return v !== null && v !== undefined;
      }).length,
    [answers],
  );
  const progressPct = Math.round((completedCount / R2_TOTAL_QUESTIONS) * 100);

  const npsAnswer = answers["7.1"];
  const npsScore =
    typeof npsAnswer === "number"
      ? npsAnswer
      : typeof npsAnswer === "string" && npsAnswer !== ""
      ? Number(npsAnswer)
      : null;

  const handleSubmit = async () => {
    if (!tester) return;
    if (npsScore === null || Number.isNaN(npsScore)) {
      toast("Almost there", {
        description: "The recommend score (Section 7) is the only required one.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("beta_feedback_round2").insert({
        tester_id: tester.id,
        tester_name: tester.display_name,
        tester_email: tester.email,
        responses: answers as never,
        nps_score: npsScore,
        general_notes: generalNotes.trim() || null,
        user_agent: navigator.userAgent,
      });
      if (error) throw error;

      await supabase.rpc("mark_beta_tester_round2_submitted", { p_id: tester.id });

      setSubmitted(true);
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
      toast("Round 2 submitted. Thank you.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit";
      toast("Submission failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (bootLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = recoverEmail.trim();
    if (!email) return;
    setRecovering(true);
    try {
      const { data, error } = await supabase.rpc("find_round2_tester", { p_email: email });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Tester | null;
      if (!row) {
        toast("No match", {
          description:
            "We couldn't find a Founding Tester with that email who finished Round 1.",
        });
        return;
      }
      applyTesterRow(row);
      toast(`Welcome back, ${row.display_name.split(" ")[0]}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not look you up";
      toast("Lookup failed", { description: msg });
    } finally {
      setRecovering(false);
    }
  };

  // Not eligible — never claimed, or never submitted Round 1
  if (!eligible) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full border-2 border-foreground bg-card p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">
            Round 2 · Closed Beta
          </p>
          <h1 className="font-[Sora] text-2xl font-black mb-3">
            Round 1 first.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Round 2 is open only to Founding Testers who completed the first
            checklist. Finish that on the same device first — your seat will be
            recognized automatically.
          </p>
          <Link
            to="/beta"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition"
          >
            Go to /beta <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
              Already submitted Round 1?
            </p>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              On a new device or browser? Enter the email you used and we'll restore your seat.
            </p>
            <form onSubmit={handleRecover} className="flex flex-col gap-2">
              <Input
                type="email"
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={recovering}
                className="border-2 border-foreground"
                required
              />
              <Button
                type="submit"
                disabled={recovering || !recoverEmail.trim()}
                className="border-2 border-foreground bg-yellow-400 text-foreground hover:bg-yellow-300 font-bold shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition"
              >
                {recovering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Recover access <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full border-2 border-foreground bg-card p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))] text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
          <h1 className="font-[Sora] text-2xl font-black mb-2">
            Round 2 logged.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            That's two rounds of real feedback from you. It compounds — every
            change shipped this week traces back to notes from this group.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-bold text-sm shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition"
          >
            Back to Locus <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/beta"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground uppercase tracking-widest hover:text-foreground transition mb-4"
          >
            <ArrowLeft className="w-3 h-3" /> Round 1
          </Link>
          <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-2">
            Round 2 · Founding Testers only
          </p>
          <h1 className="font-[Sora] text-3xl md:text-4xl font-black mb-3">
            What changed since you last looked?
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            Hi {tester?.display_name?.split(" ")[0] ?? "there"} — eight focused
            sections, ~10 minutes. None of it repeats Round 1. We're checking
            what we fixed, what we shipped, and what you'd actually pay
            attention to.
          </p>
        </div>

        {/* Progress */}
        <div className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] mb-6 sticky top-3 z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Progress
            </p>
            <p className="font-mono text-xs font-bold">
              {completedCount} / {R2_TOTAL_QUESTIONS}
            </p>
          </div>
          <div className="h-2 bg-muted border border-foreground/30 overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {R2_SECTIONS.map((section) => (
            <section
              key={section.id}
              className="border-2 border-foreground bg-card p-5 md:p-6 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
            >
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
                0{section.number} · Section
              </p>
              <h2 className="font-[Sora] text-xl md:text-2xl font-black mb-1">
                {section.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {section.subtitle}
              </p>

              <div className="space-y-5">
                {section.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* General notes */}
          <section className="border-2 border-foreground bg-card p-5 md:p-6 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <h2 className="font-[Sora] text-xl font-black mb-3">
              Anything else? (Optional)
            </h2>
            <Textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Anything not covered above. Type whatever, we read all of it."
              rows={4}
              className="border-2 border-foreground bg-background"
            />
          </section>

          {/* Submit */}
          <div className="border-2 border-foreground bg-yellow-400 text-background p-5 md:p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))]">
            <h3 className="font-[Sora] text-lg font-black mb-1">
              Submit Round 2
            </h3>
            <p className="text-xs mb-4 opacity-80">
              You can leave anything blank except the recommend score in
              Section 7.
            </p>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto bg-background text-foreground border-2 border-foreground font-bold hover:bg-muted shadow-[3px_3px_0_0_hsl(var(--foreground))] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Submit Round 2 <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: R2Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
}) {
  const required = question.required;

  return (
    <div className="border border-foreground/20 p-4 bg-background">
      <p className="text-sm md:text-base font-bold leading-snug mb-3">
        <span className="font-mono text-[11px] text-muted-foreground mr-2">
          {question.id}
        </span>
        {question.prompt}
        {required && <span className="text-yellow-400 ml-1">*</span>}
      </p>

      {question.type === "single" && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  "text-xs font-bold px-3 py-2 border-2 transition",
                  active
                    ? "border-foreground bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "border-foreground/40 bg-card text-foreground hover:border-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "text" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          rows={3}
          className="border-2 border-foreground/40 bg-card focus:border-foreground"
        />
      )}

      {question.type === "scale" && (
        <ScaleField
          value={typeof value === "number" ? value : null}
          min={question.min ?? 1}
          max={question.max ?? 5}
          minLabel={question.minLabel}
          maxLabel={question.maxLabel}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ScaleField({
  value,
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
}: {
  value: number | null;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onChange: (v: number) => void;
}) {
  const current = value ?? Math.floor((min + max) / 2);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "w-9 h-9 text-xs font-bold border-2 transition flex items-center justify-center",
                active
                  ? "border-foreground bg-yellow-400 text-background shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  : "border-foreground/40 bg-card text-foreground hover:border-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
          <span>{minLabel}</span>
          <span>{value !== null ? `Selected: ${value}` : `Default: ${current}`}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {/* Slider import kept for fallback if needed in future */}
      <Slider className="hidden" />
    </div>
  );
}
