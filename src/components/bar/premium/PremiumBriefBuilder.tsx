// Locus+ Brief Builder — sticky cream fact card + dark wizard with 4-step stepper.
import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { LetterBadge } from "./PremiumPrimitives";

export interface BriefMcqOption {
  id: string;
  letter: string;
  title: string;
  desc?: string;
  meta?: string;
}
export interface BriefBlock { id: string; text: string }
export interface BriefStep {
  kind: "mcq" | "order";
  label: string;
  prompt: string;
  options?: BriefMcqOption[];
  correct_option_id?: string;
  blocks?: BriefBlock[];
  correct_order?: string[];
}
export interface BriefPayload {
  fact_pattern: string;
  citation?: string;
  /** Optional matter tag (e.g. "Priya v. QuickMart (2024)"). */
  matter_tag?: string;
  steps: BriefStep[];
}
export interface BriefStepAnswer {
  step_index: number;
  selected_option_id?: string;
  ordered_block_ids?: string[];
}
export interface BriefAnswerState {
  step_answers: BriefStepAnswer[];
}

interface CommonProps {
  payload: BriefPayload;
  currentStep: number;
}
interface AnswerProps extends CommonProps {
  mode: "answer";
  value: BriefAnswerState;
  onChange: (next: BriefAnswerState) => void;
  onAdvance: () => void;
}
interface ReviewProps extends CommonProps {
  mode: "review";
  submitted: BriefAnswerState;
}

export function PremiumBriefBuilder(props: AnswerProps | ReviewProps) {
  const { payload, currentStep } = props;
  const step = payload.steps[currentStep];
  if (!step) return null;

  return (
    <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-7">
      {/* Sticky cream fact card */}
      <aside className="lg:sticky lg:top-[110px] self-start lp-paper p-6 sm:p-7">
        <div
          className="uppercase tracking-[0.18em] text-[10.5px] mb-2.5"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "hsl(var(--lp-paper-ink) / 0.55)",
          }}
        >
          The Brief · Fact Pattern
        </div>
        <p
          className="text-[16.5px] leading-[1.6] text-[hsl(var(--lp-paper-ink))] whitespace-pre-wrap m-0"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {payload.fact_pattern}
        </p>
        {(payload.matter_tag || payload.citation) && (
          <div className="mt-4 space-y-2">
            {payload.matter_tag && (
              <span
                className="inline-block px-2 py-1 text-[10px] uppercase tracking-[0.18em] bg-[hsl(var(--lp-paper-ink))] text-[hsl(var(--lp-paper))] rounded-[3px]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {payload.matter_tag}
              </span>
            )}
            {payload.citation && (
              <div
                className="text-[11.5px] italic"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "hsl(var(--lp-paper-ink) / 0.6)",
                }}
              >
                {payload.citation}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Dark wizard */}
      <div className="space-y-5 min-w-0">
        <Stepper steps={payload.steps} current={currentStep} />

        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2
            className="text-[20px] sm:text-[22px] font-bold tracking-[-0.02em] text-[hsl(var(--lp-text))] m-0"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {step.prompt}
          </h2>
          <span
            className="uppercase tracking-[0.1em] text-[11px] text-[hsl(var(--lp-text-3))]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Step {currentStep + 1} / {payload.steps.length} · {step.label}
          </span>
        </div>

        {step.kind === "mcq" && (
          <McqBlock
            step={step}
            mode={props.mode}
            selected={
              props.mode === "answer"
                ? props.value.step_answers.find((a) => a.step_index === currentStep)?.selected_option_id ?? null
                : props.submitted.step_answers.find((a) => a.step_index === currentStep)?.selected_option_id ?? null
            }
            onSelect={
              props.mode === "answer"
                ? (id) => {
                    const next = (props as AnswerProps).value.step_answers.filter(
                      (a) => a.step_index !== currentStep,
                    );
                    next.push({ step_index: currentStep, selected_option_id: id });
                    (props as AnswerProps).onChange({ step_answers: next });
                  }
                : undefined
            }
          />
        )}
        {step.kind === "order" && (
          <OrderBlock
            step={step}
            mode={props.mode}
            order={
              props.mode === "answer"
                ? props.value.step_answers.find((a) => a.step_index === currentStep)?.ordered_block_ids ??
                  (step.blocks?.map((b) => b.id) ?? [])
                : props.submitted.step_answers.find((a) => a.step_index === currentStep)?.ordered_block_ids ?? []
            }
            onChange={
              props.mode === "answer"
                ? (order) => {
                    const next = (props as AnswerProps).value.step_answers.filter(
                      (a) => a.step_index !== currentStep,
                    );
                    next.push({ step_index: currentStep, ordered_block_ids: order });
                    (props as AnswerProps).onChange({ step_answers: next });
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function Stepper({ steps, current }: { steps: BriefStep[]; current: number }) {
  return (
    <div
      className="grid border-2 border-[hsl(var(--lp-line))] rounded-[6px] overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s, i) => {
        const state = i === current ? "active" : i < current ? "done" : "todo";
        return (
          <div
            key={i}
            className={cn(
              "px-3 py-3 flex items-center gap-2.5 border-r-2 last:border-r-0 border-[hsl(var(--lp-line))]",
              state === "active" && "bg-[hsl(var(--lp-bg-2))]",
              state !== "active" && "bg-[hsl(var(--lp-bg-1))]",
            )}
          >
            <span
              className={cn(
                "inline-grid place-items-center w-[22px] h-[22px] rounded-[3px] border-[1.5px] text-[11px] shrink-0",
                state === "todo" && "border-[hsl(var(--lp-line-2))] text-[hsl(var(--lp-text-3))]",
                state === "active" && "border-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent))]",
                state === "done" && "border-[hsl(var(--lp-accent))] bg-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent-ink))]",
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {state === "done" ? <Check size={11} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[12.5px] truncate",
                state === "active" && "text-[hsl(var(--lp-text))] font-semibold",
                state === "done" && "text-[hsl(var(--lp-text))] font-medium",
                state === "todo" && "text-[hsl(var(--lp-text-3))] font-medium",
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function McqBlock({
  step,
  mode,
  selected,
  onSelect,
}: {
  step: BriefStep;
  mode: "answer" | "review";
  selected: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {(step.options ?? []).map((o) => {
        const isSelected = selected === o.id;
        const isCorrect = mode === "review" && o.id === step.correct_option_id;
        const isWrong = mode === "review" && isSelected && !isCorrect;
        return (
          <button
            key={o.id}
            type="button"
            disabled={mode === "review"}
            onClick={() => onSelect?.(o.id)}
            className={cn(
              "grid grid-cols-[28px_1fr_auto] gap-3.5 items-start text-left",
              "p-4 border-2 rounded-[6px] transition-colors bg-[hsl(var(--lp-bg-1))]",
              "border-[hsl(var(--lp-line))]",
              !isCorrect && !isWrong && "hover:border-[hsl(var(--lp-line-2))] hover:bg-[hsl(var(--lp-bg-2))]",
              isSelected && !isCorrect && !isWrong &&
                "border-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)]",
              isCorrect && "border-[hsl(152_55%_53%/0.55)] bg-[hsl(var(--lp-good-soft))]",
              isWrong && "border-[hsl(358_100%_67%/0.5)] bg-[hsl(var(--lp-bad-soft))]",
            )}
          >
            <LetterBadge
              letter={o.letter}
              selected={isSelected && !isCorrect && !isWrong}
              state={isCorrect ? "correct" : isWrong ? "wrong" : undefined}
            />
            <div className="min-w-0">
              <div className="font-semibold text-[14.5px] text-[hsl(var(--lp-text))] mb-1">
                {o.title}
              </div>
              {o.desc && <div className="text-[13px] text-[hsl(var(--lp-text-2))] leading-[1.5]">{o.desc}</div>}
              {o.meta && (
                <div
                  className="mt-1.5 text-[10.5px] text-[hsl(var(--lp-text-3))] tracking-[0.05em]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {o.meta}
                </div>
              )}
            </div>
            {mode === "review" && (isCorrect || isWrong) && (
              <span
                className={cn(
                  "px-1.5 py-[3px] rounded-[3px] uppercase tracking-[0.1em] text-[10px] font-bold self-start",
                  isCorrect ? "bg-[hsl(var(--lp-good))] text-[hsl(150_30%_8%)]" : "bg-[hsl(var(--lp-bad))] text-[hsl(0_0%_5%)]",
                )}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {isCorrect ? "Correct" : "Wrong"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function OrderBlock({
  step,
  mode,
  order,
  onChange,
}: {
  step: BriefStep;
  mode: "answer" | "review";
  order: string[];
  onChange?: (next: string[]) => void;
}) {
  const blocks = useMemo(() => step.blocks ?? [], [step.blocks]);
  const blockMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of blocks) m.set(b.id, b.text);
    return m;
  }, [blocks]);
  const correctOrder = useMemo(() => step.correct_order ?? [], [step.correct_order]);
  const correctIndex = useMemo(() => {
    const m = new Map<string, number>();
    correctOrder.forEach((id, i) => m.set(id, i));
    return m;
  }, [correctOrder]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!onChange) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(order, oldIdx, newIdx));
  };

  if (mode === "review") {
    return (
      <div className="flex flex-col gap-2.5">
        {(order.length ? order : blocks.map((b) => b.id)).map((id, i) => {
          const expectedAt = correctIndex.get(id);
          const correct = expectedAt === i;
          return (
            <div
              key={id}
              className={cn(
                "grid grid-cols-[24px_1fr_auto] gap-3.5 items-center p-3.5 border-2 rounded-[6px] bg-[hsl(var(--lp-bg-1))]",
                correct
                  ? "border-[hsl(152_55%_53%/0.55)] bg-[hsl(var(--lp-good-soft))]"
                  : "border-[hsl(358_100%_67%/0.5)] bg-[hsl(var(--lp-bad-soft))]",
              )}
            >
              <span
                className="text-[11px] text-[hsl(var(--lp-text-3))]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13.5px] text-[hsl(var(--lp-text))] leading-relaxed">
                {blockMap.get(id) ?? id}
              </span>
              {correct ? (
                <Check size={14} className="text-[hsl(var(--lp-good))]" />
              ) : (
                <span
                  className="text-[10px] uppercase tracking-[0.1em] text-[hsl(var(--lp-bad))]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  was #{(expectedAt ?? 0) + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5">
          {order.map((id, i) => (
            <SortableRow key={id} id={id} index={i} text={blockMap.get(id) ?? id} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, index, text }: { id: string; index: number; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[18px_24px_1fr] gap-3.5 items-center p-3.5 border-2 rounded-[6px] cursor-grab active:cursor-grabbing select-none transition-colors bg-[hsl(var(--lp-bg-1))]",
        isDragging
          ? "border-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)] z-10"
          : "border-[hsl(var(--lp-line))] hover:border-[hsl(var(--lp-line-2))] hover:bg-[hsl(var(--lp-bg-2))]",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} className="text-[hsl(var(--lp-text-3))]" />
      <span
        className="text-[11px] text-[hsl(var(--lp-text-3))]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="text-[13.5px] text-[hsl(var(--lp-text))] leading-relaxed">{text}</span>
    </div>
  );
}
