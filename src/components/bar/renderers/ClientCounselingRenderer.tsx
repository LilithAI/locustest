// ClientCounselingRenderer — multi-turn chat consult with per-turn MCQs.
import { Check, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CounselingTranscriptTurn {
  turn: number;
  role: "client" | "lawyer";
  text: string;
}
export interface CounselingOption { id: string; letter: string; text: string }
export interface CounselingDecisionTurn {
  turn: number;
  prompt: string;
  options: CounselingOption[];
  correct_option_id: string;
  model_followup?: string;
}
export interface CounselingPayload {
  matter: string;
  transcript: CounselingTranscriptTurn[];
  decision_turns: CounselingDecisionTurn[];
}

export interface CounselingAnswerState {
  turn_picks: { turn: number; selected_option_id: string; followup_text?: string }[];
}

interface AnswerProps {
  mode: "answer";
  payload: CounselingPayload;
  currentTurn: number; // active decision-turn `turn` value
  value: CounselingAnswerState;
  onChange: (next: CounselingAnswerState) => void;
}
interface ReviewProps {
  mode: "review";
  payload: CounselingPayload;
  submitted: CounselingAnswerState;
}

export function ClientCounselingRenderer(props: AnswerProps | ReviewProps) {
  const { payload } = props;
  const totalTurns = payload.decision_turns.length;

  if (props.mode === "review") {
    return (
      <div className="space-y-3">
        <Header matter={payload.matter} />
        <div className="border-2 border-foreground bg-card rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))] divide-y-2 divide-border">
          {payload.transcript.map((t) => (
            <Bubble key={`tr-${t.turn}-${t.role}`} role={t.role} text={t.text} />
          ))}
          {payload.decision_turns.map((dt) => {
            const pick = props.submitted.turn_picks.find((p) => p.turn === dt.turn);
            const chosen = dt.options.find((o) => o.id === pick?.selected_option_id);
            const correct = dt.options.find((o) => o.id === dt.correct_option_id);
            const ok = pick?.selected_option_id === dt.correct_option_id;
            return (
              <div key={`dt-${dt.turn}`} className="p-3 space-y-2">
                <Bubble role="client" text={dt.prompt} compact />
                <div
                  className={cn(
                    "ml-6 p-2.5 border-2 rounded-md flex items-start gap-2",
                    ok ? "border-emerald-500/60 bg-emerald-500/10" : "border-rose-500/60 bg-rose-500/10",
                  )}
                >
                  {ok ? (
                    <Check size={14} className="text-emerald-500 mt-0.5" />
                  ) : (
                    <X size={14} className="text-rose-500 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">You replied: </span>
                      <span className="font-semibold text-foreground">
                        {chosen ? `${chosen.letter}. ${chosen.text}` : "—"}
                      </span>
                    </div>
                    {!ok && (
                      <div className="mt-1">
                        <span className="text-muted-foreground">Better: </span>
                        <span className="font-semibold text-emerald-500">
                          {correct ? `${correct.letter}. ${correct.text}` : "—"}
                        </span>
                      </div>
                    )}
                    {dt.model_followup && (
                      <div className="mt-1.5 text-[11px] italic text-muted-foreground border-t border-border pt-1.5">
                        Coach note: {dt.model_followup}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <MessageSquare size={12} /> Consultation Review · {totalTurns} turns
        </div>
      </div>
    );
  }

  // Answer mode
  const currentDt = payload.decision_turns.find((d) => d.turn === props.currentTurn);
  const currentPick = props.value.turn_picks.find((p) => p.turn === props.currentTurn);
  const visibleTranscript = payload.transcript.filter((t) => t.turn <= props.currentTurn);
  const handledDecisions = payload.decision_turns.filter((d) => d.turn < props.currentTurn);

  const setPick = (id: string) => {
    if (props.mode !== "answer" || !currentDt) return;
    const next = props.value.turn_picks.filter((p) => p.turn !== currentDt.turn);
    next.push({ turn: currentDt.turn, selected_option_id: id });
    props.onChange({ turn_picks: next });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <div className="space-y-3">
        <Header matter={payload.matter} />
        <div className="border-2 border-foreground bg-card rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))] divide-y-2 divide-border max-h-[480px] overflow-y-auto">
          {visibleTranscript.map((t) => (
            <Bubble key={`tr-${t.turn}-${t.role}`} role={t.role} text={t.text} />
          ))}
          {handledDecisions.map((dt) => {
            const pick = props.value.turn_picks.find((p) => p.turn === dt.turn);
            const chosen = dt.options.find((o) => o.id === pick?.selected_option_id);
            return (
              <div key={`hist-${dt.turn}`} className="space-y-1">
                <Bubble role="client" text={dt.prompt} compact />
                <Bubble role="lawyer" text={chosen ? `${chosen.letter}. ${chosen.text}` : "—"} compact />
              </div>
            );
          })}
          {currentDt && <Bubble role="client" text={currentDt.prompt} />}
          {currentDt && !currentPick && (
            <div className="p-3 ml-6 border-2 border-dashed border-foreground/40 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground rounded-md m-3">
              Awaiting Input
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          Turn {props.currentTurn} / {totalTurns} · How do you respond?
        </div>
        {currentDt ? (
          <div className="space-y-2">
            {currentDt.options.map((o) => {
              const isSel = currentPick?.selected_option_id === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPick(o.id)}
                  className={cn(
                    "w-full text-left p-3 border-2 rounded-md transition-colors flex gap-3 items-start",
                    isSel
                      ? "border-accent bg-accent/10 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                      : "border-border bg-card hover:border-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-7 h-7 shrink-0 border-2 font-heading font-extrabold text-xs rounded-sm",
                      isSel
                        ? "border-foreground bg-accent text-accent-foreground"
                        : "border-border text-foreground bg-background",
                    )}
                  >
                    {o.letter}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed">{o.text}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">Consult complete.</div>
        )}
      </div>
    </div>
  );
}

function Header({ matter }: { matter: string }) {
  return (
    <div className="border-2 border-foreground bg-card p-3 rounded-md flex items-center gap-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
      <div className="w-9 h-9 border-2 border-foreground bg-accent flex items-center justify-center rounded-sm">
        <MessageSquare size={16} className="text-accent-foreground" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Matter
        </div>
        <div className="text-sm font-heading font-extrabold">{matter}</div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  compact,
}: {
  role: "client" | "lawyer";
  text: string;
  compact?: boolean;
}) {
  const isLawyer = role === "lawyer";
  return (
    <div className={cn("flex p-3", isLawyer ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] border-2 rounded-md text-sm leading-relaxed",
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2",
          isLawyer
            ? "border-accent bg-accent/10 text-foreground"
            : "border-border bg-background text-foreground",
        )}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
          {role}
        </div>
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}
