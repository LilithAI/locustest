// EthicsRenderer — 2-stage MCQ (Decision → Consequence → Reveal).
import { Scale, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EthicsOption { id: string; letter: string; text: string }
export interface EthicsPayload {
  scenario: string;
  decision_options: EthicsOption[];
  correct_decision_id: string;
  consequence_text: string;
  followup_options: EthicsOption[];
  correct_followup_id: string;
  model_reasoning: string;
}

export interface EthicsAnswerState {
  selected_decision_id: string;
  selected_followup_id: string;
}

export type EthicsStage = "decision" | "consequence" | "reveal";

interface AnswerProps {
  mode: "answer";
  payload: EthicsPayload;
  stage: EthicsStage; // "decision" | "consequence"
  value: Partial<EthicsAnswerState>;
  onChange: (next: Partial<EthicsAnswerState>) => void;
}
interface ReviewProps {
  mode: "review";
  payload: EthicsPayload;
  submitted: EthicsAnswerState;
  stage: "reveal";
}

export function EthicsRenderer(props: AnswerProps | ReviewProps) {
  const { payload } = props;
  const stage = props.stage;

  return (
    <div className="space-y-4">
      <Stepper current={stage} />
      <div className="border-2 border-foreground bg-card p-4 md:p-5 rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 border-2 border-foreground bg-accent flex items-center justify-center rounded-sm">
            <Scale size={18} className="text-accent-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
              The Situation
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{payload.scenario}</p>
          </div>
        </div>
      </div>

      {stage === "decision" && (
        <OptionGrid
          title="Your Decision"
          options={payload.decision_options}
          selected={props.mode === "answer" ? props.value.selected_decision_id ?? null : null}
          onSelect={(id) =>
            props.mode === "answer" && props.onChange({ ...props.value, selected_decision_id: id })
          }
        />
      )}

      {stage === "consequence" && (
        <>
          <Recap
            label="Stage 1 · You chose"
            choice={
              payload.decision_options.find(
                (o) => o.id === (props.mode === "answer" ? props.value.selected_decision_id : ""),
              ) ?? null
            }
          />
          <div className="border-2 border-foreground bg-card p-4 rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
              The Consequence
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{payload.consequence_text}</p>
          </div>
          <OptionGrid
            title="What now?"
            options={payload.followup_options}
            selected={props.mode === "answer" ? props.value.selected_followup_id ?? null : null}
            onSelect={(id) =>
              props.mode === "answer" && props.onChange({ ...props.value, selected_followup_id: id })
            }
          />
        </>
      )}

      {stage === "reveal" && props.mode === "review" && (
        <RevealPane payload={payload} submitted={props.submitted} />
      )}
    </div>
  );
}

function Stepper({ current }: { current: EthicsStage }) {
  const steps: { key: EthicsStage; label: string }[] = [
    { key: "decision", label: "Your Decision" },
    { key: "consequence", label: "The Consequence" },
    { key: "reveal", label: "Reveal" },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={cn(
            "px-2 py-1.5 border-2 rounded-sm font-heading text-[10px] font-extrabold uppercase tracking-wider truncate text-center",
            i === idx
              ? "border-accent bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              : i < idx
                ? "border-emerald-500/60 text-emerald-500 bg-emerald-500/10"
                : "border-border text-muted-foreground bg-card",
          )}
        >
          {i + 1} · {s.label}
        </div>
      ))}
    </div>
  );
}

function Recap({ label, choice }: { label: string; choice: EthicsOption | null }) {
  return (
    <div className="border-2 border-emerald-500/60 bg-emerald-500/10 p-3 rounded-md flex items-center gap-3">
      <span className="font-heading text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">
        {choice ? `${choice.letter}. ${choice.text}` : "—"}
      </span>
    </div>
  );
}

function OptionGrid({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: EthicsOption[];
  selected: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((o) => {
          const isSel = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect?.(o.id)}
              className={cn(
                "text-left p-3 border-2 rounded-md transition-colors flex gap-3 items-start",
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
    </div>
  );
}

function RevealPane({
  payload,
  submitted,
}: {
  payload: EthicsPayload;
  submitted: EthicsAnswerState;
}) {
  const dec = payload.decision_options.find((o) => o.id === submitted.selected_decision_id);
  const fol = payload.followup_options.find((o) => o.id === submitted.selected_followup_id);
  const correctDec = payload.decision_options.find((o) => o.id === payload.correct_decision_id);
  const correctFol = payload.followup_options.find((o) => o.id === payload.correct_followup_id);
  const decOk = submitted.selected_decision_id === payload.correct_decision_id;
  const folOk = submitted.selected_followup_id === payload.correct_followup_id;

  return (
    <div className="space-y-3">
      <RevealRow
        stage="Stage 1 · Your Decision"
        chose={dec ? `${dec.letter}. ${dec.text}` : "—"}
        correct={correctDec ? `${correctDec.letter}. ${correctDec.text}` : "—"}
        ok={decOk}
      />
      <RevealRow
        stage="Stage 2 · The Consequence"
        chose={fol ? `${fol.letter}. ${fol.text}` : "—"}
        correct={correctFol ? `${correctFol.letter}. ${correctFol.text}` : "—"}
        ok={folOk}
      />
      <div className="border-2 border-accent bg-accent/10 p-4 rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div className="font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent mb-2">
          Why This Was The Right Call
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{payload.model_reasoning}</p>
      </div>
    </div>
  );
}

function RevealRow({
  stage,
  chose,
  correct,
  ok,
}: {
  stage: string;
  chose: string;
  correct: string;
  ok: boolean;
}) {
  return (
    <div
      className={cn(
        "border-2 p-3 rounded-md space-y-1.5",
        ok ? "border-emerald-500/60 bg-emerald-500/10" : "border-rose-500/60 bg-rose-500/10",
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-rose-500" />}
        <span className="font-heading text-[10px] font-extrabold uppercase tracking-wider">
          {stage}
        </span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">You chose: </span>
        <span className="font-semibold text-foreground">{chose}</span>
      </div>
      {!ok && (
        <div className="text-xs">
          <span className="text-muted-foreground">Was: </span>
          <span className="font-semibold text-emerald-500">{correct}</span>
        </div>
      )}
    </div>
  );
}
