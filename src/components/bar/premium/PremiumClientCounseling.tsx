// Locus+ Client Counseling — 2-col chat | decision panel.
import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
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
  correct_option_id?: string;
  model_followup?: string;
}
export interface CounselingPayload {
  matter: string;
  /** Optional client display name (defaults to matter title). */
  client_name?: string;
  transcript: CounselingTranscriptTurn[];
  decision_turns: CounselingDecisionTurn[];
}
export interface CounselingAnswerState {
  turn_picks: { turn: number; selected_option_id: string; followup_text?: string }[];
}

interface AnswerProps {
  mode: "answer";
  payload: CounselingPayload;
  currentTurn: number;
  value: CounselingAnswerState;
  onChange: (next: CounselingAnswerState) => void;
}
interface ReviewProps {
  mode: "review";
  payload: CounselingPayload;
  submitted: CounselingAnswerState;
}

export function PremiumClientCounseling(props: AnswerProps | ReviewProps) {
  const { payload } = props;
  const totalTurns = payload.decision_turns.length;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on state change
  const scrollKey = props.mode === "answer" ? props.currentTurn : props.submitted.turn_picks.length;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scrollKey]);

  const clientName = payload.client_name ?? payload.matter;
  const initial = clientName.trim().charAt(0).toUpperCase() || "C";

  // ───────── REVIEW MODE ─────────
  if (props.mode === "review") {
    const correctCount = payload.decision_turns.filter((dt) => {
      const pick = props.submitted.turn_picks.find((p) => p.turn === dt.turn);
      return !!dt.correct_option_id && pick?.selected_option_id === dt.correct_option_id;
    }).length;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5 max-w-[1220px] mx-auto">
        <ChatPanel
          clientName={clientName}
          initial={initial}
          subtitle={`${totalTurns} TURNS · COMPLETE`}
          scrollRef={scrollRef}
        >
          {payload.transcript.map((t) => (
            <Bubble key={`tr-${t.turn}-${t.role}`} role={t.role} text={t.text} />
          ))}
          {payload.decision_turns.map((dt) => {
            const pick = props.submitted.turn_picks.find((p) => p.turn === dt.turn);
            const chosen = dt.options.find((o) => o.id === pick?.selected_option_id);
            const ok = !!dt.correct_option_id && pick?.selected_option_id === dt.correct_option_id;
            return (
              <div key={`dt-${dt.turn}`} className="contents">
                <Bubble role="client" text={dt.prompt} meta={`CLIENT · TURN ${dt.turn}`} />
                <Bubble
                  role="lawyer"
                  text={chosen ? `${chosen.letter}. ${chosen.text}` : "—"}
                  evaluation={dt.correct_option_id ? (ok ? "ok" : "miss") : undefined}
                  meta={`YOU · TURN ${dt.turn}`}
                />
              </div>
            );
          })}
        </ChatPanel>

        <div className="border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] p-5 flex flex-col min-h-0">
          <h3
            className="m-0 mb-1 text-[17px] font-bold tracking-[-0.01em] text-[hsl(var(--lp-text))]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Session Review
          </h3>
          <div
            className="uppercase tracking-[0.14em] text-[10.5px] text-[hsl(var(--lp-text-3))] mb-4"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {correctCount} / {totalTurns} CORRECT
          </div>
          <ul className="flex flex-col gap-2 m-0 p-0 list-none overflow-y-auto lp-scroll">
            {payload.decision_turns.map((dt) => {
              const pick = props.submitted.turn_picks.find((p) => p.turn === dt.turn);
              const chosen = dt.options.find((o) => o.id === pick?.selected_option_id);
              const correct = dt.correct_option_id
                ? dt.options.find((o) => o.id === dt.correct_option_id)
                : undefined;
              const graded = !!dt.correct_option_id;
              const ok = graded && pick?.selected_option_id === dt.correct_option_id;
              return (
                <li
                  key={dt.turn}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 border-2 rounded-[4px] tracking-[0.04em] bg-[hsl(var(--lp-bg-1))]",
                    graded
                      ? (ok
                          ? "border-[hsl(152_55%_53%/0.55)] bg-[hsl(var(--lp-good-soft))]"
                          : "border-[hsl(358_100%_67%/0.5)] bg-[hsl(var(--lp-bad-soft))]")
                      : "border-[hsl(var(--lp-line))]",
                  )}
                >
                  <span
                    className={cn(
                      "grid place-items-center w-[18px] h-[18px] rounded-[3px] text-[11px] font-bold shrink-0 mt-0.5",
                      graded
                        ? (ok
                            ? "bg-[hsl(var(--lp-good))] text-[hsl(150_30%_8%)]"
                            : "bg-[hsl(var(--lp-bad))] text-[hsl(0_0%_5%)]")
                        : "bg-[hsl(var(--lp-bg-3))] text-[hsl(var(--lp-text-3))]",
                    )}
                  >
                    {graded ? (ok ? <Check size={11} /> : <X size={11} />) : "·"}
                  </span>
                  <div className="text-[13px] text-[hsl(var(--lp-text-2))]">
                    <div
                      className="uppercase text-[10.5px] tracking-[0.1em] text-[hsl(var(--lp-text-3))] mb-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Turn {dt.turn}
                    </div>
                    <div className="text-[hsl(var(--lp-text))]">
                      {chosen ? `${chosen.letter}. ${chosen.text}` : "—"}
                    </div>
                    {graded && !ok && correct && (
                      <div className="mt-1 italic text-[hsl(var(--lp-text-3))]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Better: {correct.letter}. {correct.text}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // ───────── ANSWER MODE ─────────
  // `currentTurn` from the host is a 1-based position into decision_turns,
  // not the absolute `turn` field on each decision (which often continues the
  // transcript numbering, e.g. 4,5,6). Resolve by position to stay robust.
  const currentIdx = props.currentTurn - 1;
  const currentDt = payload.decision_turns[currentIdx];
  const currentDtTurn = currentDt?.turn;
  const currentPick = currentDtTurn != null
    ? props.value.turn_picks.find((p) => p.turn === currentDtTurn)
    : undefined;
  // Show all transcript entries up to (and including) the current decision's turn.
  const transcriptCutoff = currentDtTurn ?? Number.POSITIVE_INFINITY;
  const visibleTranscript = payload.transcript.filter((t) => t.turn <= transcriptCutoff);
  const handledDecisions = payload.decision_turns.slice(0, currentIdx);

  const setPick = (id: string) => {
    if (props.mode !== "answer" || !currentDt) return;
    const next = props.value.turn_picks.filter((p) => p.turn !== currentDt.turn);
    next.push({ turn: currentDt.turn, selected_option_id: id });
    props.onChange({ turn_picks: next });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5 max-w-[1220px] mx-auto lg:h-[calc(100vh-260px)] min-h-[520px]">
      {/* CHAT */}
      <ChatPanel
        clientName={clientName}
        initial={initial}
        subtitle={`TURN ${props.currentTurn} OF ${totalTurns}`}
        scrollRef={scrollRef}
      >
        {visibleTranscript.map((t) => (
          <Bubble key={`tr-${t.turn}-${t.role}`} role={t.role} text={t.text} />
        ))}
        {handledDecisions.map((dt) => {
          const pick = props.value.turn_picks.find((p) => p.turn === dt.turn);
          const chosen = dt.options.find((o) => o.id === pick?.selected_option_id);
          return (
            <div key={`hist-${dt.turn}`} className="contents">
              <Bubble role="client" text={dt.prompt} meta={`CLIENT · TURN ${dt.turn}`} />
              <Bubble role="lawyer" text={chosen ? `${chosen.letter}. ${chosen.text}` : "—"} meta={`YOU · TURN ${dt.turn}`} />
            </div>
          );
        })}
        {currentDt && (
          <>
            <Bubble role="client" text={currentDt.prompt} meta={`CLIENT · TURN ${currentDt.turn}`} />
            {/* Typing indicator while user hasn't picked yet */}
            {!currentPick && (
              <div className="flex justify-end">
                <div
                  className="inline-flex gap-1 items-center px-3.5 py-2.5 border-2 border-dashed border-[hsl(var(--lp-line-2))] rounded-[6px] uppercase tracking-[0.08em] text-[11px] text-[hsl(var(--lp-text-3))]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="lp-dot" />
                  <span className="lp-dot" />
                  <span className="lp-dot" />
                  <span className="ml-2">AWAITING INPUT</span>
                </div>
              </div>
            )}
          </>
        )}
        {!currentDt && (
          <div className="text-center text-[13px] italic text-[hsl(var(--lp-text-3))] py-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Consult complete.
          </div>
        )}
      </ChatPanel>

      {/* DECISION PANEL */}
      <div className="border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] p-5 flex flex-col min-h-0">
        <h3
          className="m-0 mb-1 text-[17px] font-bold tracking-[-0.01em] text-[hsl(var(--lp-text))]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {currentDt ? "How do you respond?" : "Consultation complete"}
        </h3>
        <div
          className="uppercase tracking-[0.14em] text-[10.5px] text-[hsl(var(--lp-text-3))] mb-4"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          TURN {props.currentTurn} OF {totalTurns}
        </div>
        <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 flex-1 lp-scroll">
          {currentDt?.options.map((o) => {
            const isSel = currentPick?.selected_option_id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setPick(o.id)}
                className={cn(
                  "border-2 rounded-[6px] px-3.5 py-3 text-left w-full transition-colors text-[15.5px] leading-[1.5] text-[hsl(var(--lp-text))]",
                  "bg-[hsl(var(--lp-bg-2))] border-[hsl(var(--lp-line))]",
                  "hover:border-[hsl(var(--lp-line-2))] hover:bg-[hsl(var(--lp-bg-3))]",
                  isSel && "border-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)]",
                )}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                <span
                  className={cn(
                    "mr-2.5 uppercase tracking-[0.12em] text-[10.5px]",
                    isSel ? "text-[hsl(var(--lp-accent))]" : "text-[hsl(var(--lp-text-3))]",
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {o.letter}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
        <div className="pt-3.5 mt-3.5 border-t-2 border-[hsl(var(--lp-line))] flex items-center justify-between gap-3 shrink-0">
          <span className="italic text-[13px] text-[hsl(var(--lp-text-3))]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Read the room before you read the law.
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  clientName,
  initial,
  subtitle,
  children,
  scrollRef,
}: {
  clientName: string;
  initial: string;
  subtitle: string;
  children: React.ReactNode;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="flex flex-col border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] min-h-[480px] max-h-[calc(100vh-220px)] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b-2 border-[hsl(var(--lp-line))] bg-[hsl(var(--lp-bg-2))]">
        <div
          className="w-[34px] h-[34px] grid place-items-center text-[13px] font-bold border-2 border-[hsl(var(--lp-line))] rounded-[4px] bg-[hsl(var(--lp-bg-3))] text-[hsl(var(--lp-text))]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[hsl(var(--lp-text))] truncate">{clientName}</div>
          <div
            className="uppercase tracking-[0.12em] text-[10.5px] text-[hsl(var(--lp-text-3))]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 lp-scroll">
        {children}
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  evaluation,
  meta,
}: {
  role: "client" | "lawyer";
  text: string;
  evaluation?: "ok" | "miss";
  meta?: string;
}) {
  const isYou = role === "lawyer";
  return (
    <div className={cn("flex", isYou ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%]", isYou ? "items-end" : "items-start", "flex flex-col gap-1")}>
        {meta && (
          <div
            className={cn(
              "uppercase text-[10px] tracking-[0.08em] text-[hsl(var(--lp-text-3))]",
              isYou ? "text-right" : "text-left",
            )}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {meta}
            {evaluation === "ok" && <span className="ml-2 text-[hsl(var(--lp-good))]">✓</span>}
            {evaluation === "miss" && <span className="ml-2 text-[hsl(var(--lp-bad))]">✗</span>}
          </div>
        )}
        <div
          className={cn(
            "border-2 rounded-[6px] px-3.5 py-3 text-[14px] leading-[1.55]",
            isYou
              ? "bg-[hsl(45_100%_63%/0.12)] border-[hsl(45_100%_63%/0.3)] text-[hsl(var(--lp-text))]"
              : "bg-[hsl(var(--lp-bg-2))] border-[hsl(var(--lp-line))] text-[hsl(var(--lp-text))]",
            evaluation === "miss" && "border-[hsl(358_100%_67%/0.5)]",
            evaluation === "ok" && "border-[hsl(152_55%_53%/0.55)]",
          )}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
