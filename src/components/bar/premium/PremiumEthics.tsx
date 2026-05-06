// Locus+ Ethics — single column, scenario card with watermark, 3-stage rail.
import { Scale, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LetterBadge } from "./PremiumPrimitives";

export interface EthicsOption { id: string; letter: string; text: string }
export interface EthicsPayload {
  scenario: string;
  decision_options: EthicsOption[];
  correct_decision_id?: string;
  consequence_text: string;
  followup_options: EthicsOption[];
  correct_followup_id?: string;
  model_reasoning?: string;
}
export interface EthicsAnswerState {
  selected_decision_id: string;
  selected_followup_id: string;
}
export type EthicsStage = "decision" | "consequence" | "reveal";

interface AnswerProps {
  mode: "answer";
  payload: EthicsPayload;
  stage: EthicsStage;
  value: Partial<EthicsAnswerState>;
  onChange: (next: Partial<EthicsAnswerState>) => void;
}
interface ReviewProps {
  mode: "review";
  payload: EthicsPayload;
  submitted: EthicsAnswerState;
  stage: "reveal";
}

export function PremiumEthics(props: AnswerProps | ReviewProps) {
  const { payload, stage } = props;

  return (
    <div className="max-w-[820px] mx-auto space-y-5">
      <StageRail current={stage} />

      {/* Scenario card with subtle scales watermark */}
      <div className="relative overflow-hidden border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] p-7 sm:p-8">
        <Scale
          size={80}
          strokeWidth={1.6}
          className="absolute top-5 right-6 text-[hsl(var(--lp-accent))] opacity-25 pointer-events-none"
        />
        <div
          className="uppercase tracking-[0.22em] text-[10.5px] text-[hsl(var(--lp-text-3))] mb-3.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          The Situation
        </div>
        <p
          className="text-[19px] sm:text-[20px] leading-[1.55] max-w-[620px] text-[hsl(var(--lp-text))] m-0 whitespace-pre-wrap"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {payload.scenario}
        </p>
      </div>

      {stage === "decision" && (
        <div className="space-y-4">
          <h2
            className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] text-[hsl(var(--lp-text))] m-0"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Your decision — what do you do first?
          </h2>
          <ChoiceList
            options={payload.decision_options}
            selected={props.mode === "answer" ? props.value.selected_decision_id ?? null : null}
            onSelect={(id) =>
              props.mode === "answer" && props.onChange({ ...props.value, selected_decision_id: id })
            }
          />
        </div>
      )}

      {stage === "consequence" && (
        <div className="space-y-5">
          <EchoBanner
            label="Stage 1 · You chose"
            choice={
              payload.decision_options.find(
                (o) => o.id === (props.mode === "answer" ? props.value.selected_decision_id : ""),
              ) ?? null
            }
          />
          <div className="border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] p-6">
            <div
              className="uppercase tracking-[0.22em] text-[10.5px] text-[hsl(var(--lp-accent))] mb-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              The Consequence
            </div>
            <p
              className="text-[17px] leading-[1.65] text-[hsl(var(--lp-text))] m-0 whitespace-pre-wrap"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {payload.consequence_text}
            </p>
          </div>
          <h2
            className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] text-[hsl(var(--lp-text))] m-0"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            What now?
          </h2>
          <ChoiceList
            options={payload.followup_options}
            selected={props.mode === "answer" ? props.value.selected_followup_id ?? null : null}
            onSelect={(id) =>
              props.mode === "answer" && props.onChange({ ...props.value, selected_followup_id: id })
            }
          />
        </div>
      )}

      {stage === "reveal" && props.mode === "review" && (
        <RevealPane payload={payload} submitted={props.submitted} />
      )}
    </div>
  );
}

function StageRail({ current }: { current: EthicsStage }) {
  const steps: { key: EthicsStage; label: string }[] = [
    { key: "decision", label: "Your decision" },
    { key: "consequence", label: "The consequence" },
    { key: "reveal", label: "Reveal" },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div
      className="flex items-center gap-3 uppercase tracking-[0.14em] text-[11px] text-[hsl(var(--lp-text-3))]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {steps.map((s, i) => {
        const state = i === idx ? "active" : i < idx ? "done" : "todo";
        return (
          <div key={s.key} className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "inline-grid place-items-center w-5 h-5 rounded-[3px] border-[1.5px] text-[10.5px]",
                  state === "todo" && "border-[hsl(var(--lp-line-2))] text-[hsl(var(--lp-text-3))]",
                  state === "active" && "border-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent))]",
                  state === "done" && "border-[hsl(var(--lp-accent))] bg-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent-ink))]",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  state === "active" && "text-[hsl(var(--lp-text))]",
                  state === "done" && "text-[hsl(var(--lp-text-2))]",
                )}
              >
                {s.label}
              </span>
            </span>
            {i < steps.length - 1 && <span className="w-[22px] h-[1.5px] bg-[hsl(var(--lp-line-2))]" />}
          </div>
        );
      })}
    </div>
  );
}

function EchoBanner({ label, choice }: { label: string; choice: EthicsOption | null }) {
  return (
    <div className="border-2 border-[hsl(45_100%_63%/0.35)] bg-[hsl(45_100%_63%/0.12)] rounded-[6px] px-4 py-3 flex items-center gap-3 flex-wrap">
      <span
        className="uppercase tracking-[0.14em] text-[10.5px] text-[hsl(var(--lp-accent))]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </span>
      <span className="text-[13px] text-[hsl(var(--lp-text))] font-medium">
        {choice ? `${choice.letter}. ${choice.text}` : "—"}
      </span>
    </div>
  );
}

function ChoiceList({
  options,
  selected,
  onSelect,
}: {
  options: EthicsOption[];
  selected: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((o) => {
        const isSel = selected === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect?.(o.id)}
            className={cn(
              "grid grid-cols-[36px_1fr] gap-4 items-start text-left p-4 border-2 rounded-[6px] transition-colors w-full",
              "bg-[hsl(var(--lp-bg-1))] border-[hsl(var(--lp-line))]",
              "hover:border-[hsl(var(--lp-line-2))] hover:bg-[hsl(var(--lp-bg-2))]",
              isSel && "border-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)]",
            )}
          >
            <LetterBadge letter={o.letter} selected={isSel} className="w-7 h-7" />
            <span className="text-[15px] leading-[1.5] text-[hsl(var(--lp-text))]">{o.text}</span>
          </button>
        );
      })}
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
  const correctDec = payload.correct_decision_id
    ? payload.decision_options.find((o) => o.id === payload.correct_decision_id)
    : undefined;
  const correctFol = payload.correct_followup_id
    ? payload.followup_options.find((o) => o.id === payload.correct_followup_id)
    : undefined;
  const decOk = !!payload.correct_decision_id && submitted.selected_decision_id === payload.correct_decision_id;
  const folOk = !!payload.correct_followup_id && submitted.selected_followup_id === payload.correct_followup_id;

  return (
    <div className="space-y-4">
      <RevealRow stage="Stage 1 · Decision" chose={fmt(dec)} correct={fmt(correctDec)} ok={decOk} />
      <RevealRow stage="Stage 2 · Follow-up" chose={fmt(fol)} correct={fmt(correctFol)} ok={folOk} />
      {payload.model_reasoning && (
        <div className="border-2 border-[hsl(45_100%_63%/0.35)] bg-[hsl(45_100%_63%/0.12)] rounded-[6px] px-5 py-4">
          <h4
            className="m-0 mb-2 text-[14px] tracking-[0.02em] text-[hsl(var(--lp-accent))]"
            style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700 }}
          >
            Why this was the right call
          </h4>
          <p
            className="m-0 text-[15.5px] leading-[1.55] text-[hsl(var(--lp-text))]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {payload.model_reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

function fmt(o: EthicsOption | undefined) {
  return o ? `${o.letter}. ${o.text}` : "—";
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
        "border-2 rounded-[6px] p-4 space-y-1.5 bg-[hsl(var(--lp-bg-1))]",
        ok ? "border-[hsl(152_55%_53%/0.55)] bg-[hsl(var(--lp-good-soft))]" : "border-[hsl(358_100%_67%/0.5)] bg-[hsl(var(--lp-bad-soft))]",
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? (
          <Check size={14} className="text-[hsl(var(--lp-good))]" />
        ) : (
          <X size={14} className="text-[hsl(var(--lp-bad))]" />
        )}
        <span
          className="uppercase tracking-[0.14em] text-[10.5px] text-[hsl(var(--lp-text-2))]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {stage}
        </span>
      </div>
      <div className="text-[13.5px]">
        <span className="text-[hsl(var(--lp-text-3))]">You chose: </span>
        <span className="font-medium text-[hsl(var(--lp-text))]">{chose}</span>
      </div>
      {!ok && (
        <div className="text-[13.5px]">
          <span className="text-[hsl(var(--lp-text-3))]">Was: </span>
          <span className="font-medium text-[hsl(var(--lp-good))]">{correct}</span>
        </div>
      )}
    </div>
  );
}
