import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Timer, Check, X } from "lucide-react";
import { toast } from "sonner";

interface SpeedQ { id: string; prompt: string }
interface SpeedPayload { questions: SpeedQ[]; time_limit_seconds: number }

export interface SpeedRoundAnswerState {
  answers: { question_id: string; submitted: string }[];
}

interface AnswerModeProps {
  mode: "answer";
  payload: SpeedPayload;
  onComplete: (answer: SpeedRoundAnswerState) => void;
}

interface ReviewModeProps {
  mode: "review";
  perQuestion: { id: string; prompt: string; submitted: string; correct: string; got_right: boolean }[];
}

export function SpeedRoundRenderer(props: AnswerModeProps | ReviewModeProps) {
  if (props.mode === "review") {
    return (
      <div className="space-y-2">
        {props.perQuestion.map((q, i) => (
          <div
            key={q.id}
            className={`p-4 border-2 rounded-lg ${
              q.got_right ? "border-emerald-500/60 bg-emerald-500/10" : "border-rose-500/60 bg-rose-500/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {q.got_right ? <Check size={16} className="text-emerald-500" /> : <X size={16} className="text-rose-500" />}
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Question {i + 1}
                </div>
                <div className="text-sm font-semibold text-foreground mb-2">{q.prompt}</div>
                <div className="text-xs text-muted-foreground">
                  You: <span className={q.got_right ? "text-emerald-500" : "text-rose-500"}>{q.submitted || "—"}</span>
                </div>
                {!q.got_right && (
                  <div className="text-xs text-emerald-500 mt-1">
                    Correct: {q.correct}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <SpeedRoundAnswerInner payload={props.payload} onComplete={props.onComplete} />;
}

function SpeedRoundAnswerInner({
  payload,
  onComplete,
}: {
  payload: SpeedPayload;
  onComplete: (answer: SpeedRoundAnswerState) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [current, setCurrent] = useState("");
  const answersRef = useRef<{ question_id: string; submitted: string }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(payload.time_limit_seconds);
  const completedRef = useRef(false);

  useEffect(() => {
    const intv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intv);
          if (!completedRef.current) {
            completedRef.current = true;
            // Persist current pending answer
            const all = [...answersRef.current];
            const pendingId = payload.questions[idx]?.id;
            if (pendingId && current.trim().length > 0 && !all.some((a) => a.question_id === pendingId)) {
              all.push({ question_id: pendingId, submitted: current });
            }
            toast.warning("Time's up!");
            onComplete({ answers: all });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = payload.questions.length;
  const q = payload.questions[idx];
  const isLast = idx === total - 1;

  const next = () => {
    if (completedRef.current) return;
    answersRef.current.push({ question_id: q.id, submitted: current });
    setCurrent("");
    if (isLast) {
      completedRef.current = true;
      onComplete({ answers: [...answersRef.current] });
    } else {
      setIdx((i) => i + 1);
    }
  };

  const pct = ((idx + 1) / total) * 100;
  const timerLow = secondsLeft <= 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted-foreground">
          Question {idx + 1} of {total}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border-2 ${
          timerLow ? "border-rose-500 text-rose-500 animate-pulse" : "border-border text-foreground"
        }`}>
          <Timer size={16} />
          <span className="font-mono font-bold">{secondsLeft}s</span>
        </div>
      </div>
      <Progress value={pct} className="h-2" />

      <div className="p-6 border-2 border-border rounded-lg bg-card">
        <div className="text-base font-semibold text-foreground mb-4">{q.prompt}</div>
        <Input
          autoFocus
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") next();
          }}
          placeholder="Type your answer…"
          className="text-base"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={next} size="lg" className="gap-2">
          {isLast ? "Submit" : "Next"}
        </Button>
      </div>
    </div>
  );
}
