import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, Home, Sparkles, Check, X, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDesignation } from "@/lib/bar/display";
import type { BarDesignation } from "@/lib/bar/types";
import { RitChatPanel } from "./rit/RitChatPanel";
import { shareOrCopy, withRef } from "@/lib/share";

export interface ResultScreenProps {
  attempt_id?: string | null;
  is_correct: boolean;
  points_awarded: number;
  explanation: string | null;
  correct_answer_summary: string;
  per_question?: { id: string; prompt: string; submitted: string; correct: string; got_right: boolean }[];
  challenge_meta?: {
    title?: string | null;
    question_type?: string | null;
  };
  new_stats: {
    total_points: number;
    accuracy_pct: number;
    current_streak: number;
    longest_streak: number;
    designation: BarDesignation;
    designation_changed: boolean;
    previous_designation: BarDesignation | null;
  };
}

function CountUp({ to, duration = 800 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (to === 0) { setV(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{v}</>;
}

export function ResultScreen(props: ResultScreenProps) {
  const { attempt_id, is_correct, points_awarded, explanation, correct_answer_summary, per_question, new_stats, challenge_meta } = props;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {new_stats.designation_changed && (
        <Card className="border-2 border-accent bg-accent/10 p-5 flex items-center gap-3 animate-pulse-once">
          <Sparkles className="text-accent flex-shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-wider text-accent font-semibold">Rank up!</div>
            <div className="text-lg font-extrabold font-heading text-foreground">
              You ranked up to {formatDesignation(new_stats.designation)}
            </div>
          </div>
        </Card>
      )}

      <Card className={`border-2 p-8 text-center ${is_correct ? "border-emerald-500/60" : "border-rose-500/60"}`}>
        <div className="flex justify-center mb-4">
          {is_correct ? (
            <CheckCircle2 size={64} className="text-emerald-500" />
          ) : (
            <XCircle size={64} className="text-rose-500" />
          )}
        </div>
        <h2 className="text-3xl font-extrabold font-heading text-foreground mb-2">
          {is_correct ? "Correct!" : "Not quite"}
        </h2>
        <div className="text-4xl font-extrabold font-heading text-accent mb-4">
          {is_correct || points_awarded > 0 ? "+" : ""}<CountUp to={points_awarded} /> pts
        </div>
        <p className="text-sm text-muted-foreground italic">{correct_answer_summary}</p>
      </Card>

      {explanation && (
        <Card className="border-2 border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Why?
          </div>
          <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
        </Card>
      )}

      {attempt_id && (
        <RitChatPanel
          attemptId={attempt_id}
          challenge={{
            title: challenge_meta?.title ?? null,
            question_type: challenge_meta?.question_type ?? null,
            correct_answer_summary,
          }}
        />
      )}

      {per_question && per_question.length > 0 && (
        <Card className="border-2 border-border p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Round breakdown
          </div>
          <div className="space-y-2">
            {per_question.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">
                  {q.got_right ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-rose-500" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{i + 1}. {q.prompt}</div>
                  <div className="text-xs text-muted-foreground">
                    You: <span className={q.got_right ? "text-emerald-500" : "text-rose-500"}>{q.submitted || "—"}</span>
                    {!q.got_right && <span className="ml-2 text-emerald-500">→ {q.correct}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-2 border-border p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Your stats now
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl font-extrabold font-heading text-foreground">{new_stats.total_points.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</div>
          </div>
          <div>
            <div className="text-xl font-extrabold font-heading text-foreground">{Number(new_stats.accuracy_pct).toFixed(1)}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</div>
          </div>
          <div>
            <div className="text-xl font-extrabold font-heading text-foreground">{new_stats.current_streak}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div>
          </div>
          <div>
            <div className="text-xl font-extrabold font-heading text-foreground capitalize">{formatDesignation(new_stats.designation)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rank</div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/the-bar/browse">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            Another Challenge <ArrowRight size={16} />
          </Button>
        </Link>
        <Link to="/the-bar">
          <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
            <Home size={16} /> Back to Dashboard
          </Button>
        </Link>
        <Button
          size="lg"
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={async () => {
            const type = challenge_meta?.question_type?.replace(/_/g, " ") ?? "legal";
            const text = is_correct
              ? `Just earned ${points_awarded} pts on a ${type} challenge at Locus — practice law for free.`
              : `Just attempted a ${type} challenge at Locus — sharpening my legal reasoning.`;
            const url = withRef("https://locus.legal/the-bar", "bar-result");
            const r = await shareOrCopy({ title: "Locus — The Bar", text, url });
            if (r === "copied") toast.success("Result copied to clipboard");
            else if (r === "failed") toast.error("Couldn't share");
          }}
        >
          <Share2 size={16} /> Share result
        </Button>
      </div>
    </div>
  );
}
