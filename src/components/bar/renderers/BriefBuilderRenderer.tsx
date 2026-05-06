// BriefBuilderRenderer — 4-step builder w/ MCQ + drag-to-order step.
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
import { Check, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onAdvance: () => void; // request to move to next step (parent controls navigation)
}

interface ReviewProps extends CommonProps {
  mode: "review";
  submitted: BriefAnswerState;
}

export function BriefBuilderRenderer(props: AnswerProps | ReviewProps) {
  const { payload, currentStep } = props;
  const step = payload.steps[currentStep];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
      {/* Left: fact pattern */}
      <div className="border-2 border-foreground bg-card p-4 md:p-5 rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))] space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          The Brief · Fact Pattern
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{payload.fact_pattern}</p>
        {payload.citation && (
          <div className="text-[11px] italic text-muted-foreground border-t-2 border-border pt-2">
            {payload.citation}
          </div>
        )}
      </div>

      {/* Right: step pane */}
      <div className="space-y-3">
        <StepPills steps={payload.steps} current={currentStep} />
        <div className="border-2 border-foreground bg-card p-4 md:p-5 rounded-md shadow-[4px_4px_0_0_hsl(var(--foreground))] space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-heading text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">
              {step.label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              · Step {currentStep + 1} / {payload.steps.length}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">{step.prompt}</p>

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
    </div>
  );
}

function StepPills({ steps, current }: { steps: BriefStep[]; current: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {steps.map((s, i) => (
        <div
          key={i}
          className={cn(
            "px-2.5 py-1.5 border-2 rounded-sm font-heading text-[10px] font-extrabold uppercase tracking-wider truncate",
            i === current
              ? "border-accent bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              : i < current
                ? "border-emerald-500/60 text-emerald-500 bg-emerald-500/10"
                : "border-border text-muted-foreground bg-card",
          )}
        >
          {String(i + 1).padStart(2, "0")} · {s.label}
        </div>
      ))}
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
    <div className="space-y-2">
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
              "w-full text-left p-3 border-2 rounded-md transition-colors flex gap-3 items-start",
              mode === "review"
                ? isCorrect
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : isWrong
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-border bg-card opacity-70"
                : isSelected
                  ? "border-accent bg-accent/10 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                  : "border-border bg-card hover:border-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center w-7 h-7 shrink-0 border-2 font-heading font-extrabold text-xs rounded-sm",
                isCorrect && mode === "review"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isWrong
                    ? "border-rose-500 bg-rose-500 text-white"
                    : isSelected
                      ? "border-foreground bg-accent text-accent-foreground"
                      : "border-border text-foreground bg-background",
              )}
            >
              {o.letter}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{o.title}</div>
              {o.desc && <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>}
              {o.meta && <div className="text-[10px] italic text-muted-foreground mt-1">{o.meta}</div>}
            </div>
            {mode === "review" && isCorrect && <Check size={16} className="text-emerald-500 mt-1" />}
            {mode === "review" && isWrong && <X size={16} className="text-rose-500 mt-1" />}
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
      <div className="space-y-1.5">
        {(order.length ? order : blocks.map((b) => b.id)).map((id, i) => {
          const expectedAt = correctIndex.get(id);
          const correct = expectedAt === i;
          return (
            <div
              key={id}
              className={cn(
                "flex items-center gap-3 p-3 border-2 rounded-sm",
                correct ? "border-emerald-500/60 bg-emerald-500/10" : "border-rose-500/60 bg-rose-500/10",
              )}
            >
              <span className="font-heading font-extrabold text-[10px] text-muted-foreground w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm">{blockMap.get(id) ?? id}</span>
              {correct ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
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
        <div className="space-y-1.5">
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
        "flex items-center gap-3 p-3 border-2 rounded-sm bg-card transition-shadow",
        isDragging
          ? "border-accent shadow-[4px_4px_0_0_hsl(var(--foreground))] z-10"
          : "border-border hover:border-foreground",
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <span className="font-heading font-extrabold text-[10px] text-muted-foreground w-6">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex-1 text-sm">{text}</span>
    </div>
  );
}
