// DocumentReviewRenderer — clickable spans → category popover → flag store.
// Review mode shows hit/miss/false-flag overlay + WHY YOU LOST POINTS block.
import { useMemo } from "react";
import { Check, X, AlertTriangle, Flag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Span { id: string; text: string }
interface Category { id: string; label: string }
interface CorrectFlag { span_id: string; category_id: string }

interface Payload {
  document_html: string; // text with {{span_id}} markers OR raw text + spans for highlight
  spans: Span[];
  categories: Category[];
  correct_flags?: CorrectFlag[];
  /** Optional pedagogical fields (Agreement Review Trainer). */
  reviewer_brief?: string;
  agreement_type?: string;
  rationale?: Record<string, string>;
  suggested_redline?: Record<string, string>;
}

export interface DocReviewAnswerState {
  flagged: { span_id: string; category_id: string }[];
}

interface AnswerProps {
  mode: "answer";
  payload: Payload;
  value: DocReviewAnswerState;
  onChange: (next: DocReviewAnswerState) => void;
}

interface ReviewProps {
  mode: "review";
  payload: Payload;
  submitted: DocReviewAnswerState;
  correct_flags: CorrectFlag[];
}

export function DocumentReviewRenderer(props: AnswerProps | ReviewProps) {
  const { payload } = props;
  const correctMap = useMemo(() => {
    const m = new Map<string, string>();
    const list = props.mode === "review" ? props.correct_flags : (payload.correct_flags ?? []);
    for (const f of list) m.set(f.span_id, f.category_id);
    return m;
  }, [props, payload]);

  const submittedMap = useMemo(() => {
    const m = new Map<string, string>();
    if (props.mode === "review") for (const f of props.submitted.flagged) m.set(f.span_id, f.category_id);
    return m;
  }, [props]);

  const answerMap = useMemo(() => {
    const m = new Map<string, string>();
    if (props.mode === "answer") for (const f of props.value.flagged) m.set(f.span_id, f.category_id);
    return m;
  }, [props]);

  const setFlag = (spanId: string, catId: string | null) => {
    if (props.mode !== "answer") return;
    const next = props.value.flagged.filter((f) => f.span_id !== spanId);
    if (catId) next.push({ span_id: spanId, category_id: catId });
    props.onChange({ flagged: next });
  };

  // Render document_html, replacing {{span_id}} with interactive marks.
  const segments = useMemo(() => {
    const re = /\{\{(.+?)\}\}/g;
    const result: Array<{ kind: "text" | "span"; text?: string; id?: string }> = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(payload.document_html)) !== null) {
      if (m.index > lastIndex) result.push({ kind: "text", text: payload.document_html.slice(lastIndex, m.index) });
      result.push({ kind: "span", id: m[1] });
      lastIndex = re.lastIndex;
    }
    if (lastIndex < payload.document_html.length) {
      result.push({ kind: "text", text: payload.document_html.slice(lastIndex) });
    }
    return result;
  }, [payload.document_html]);

  const spanText = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of payload.spans) m.set(s.id, s.text);
    return m;
  }, [payload.spans]);

  const catLabel = (id?: string | null) =>
    id ? payload.categories.find((c) => c.id === id)?.label ?? id : "";

  return (
    <div className="space-y-4">
      {/* Reviewer brief — partner's instruction, only when supplied */}
      {payload.reviewer_brief && (
        <div className="border-2 border-accent bg-accent/10 p-4 rounded-md">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1.5">
            Brief from Partner{payload.agreement_type ? ` · ${payload.agreement_type}` : ""}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{payload.reviewer_brief}</p>
        </div>
      )}

      {/* Document card — light surface for legal-text legibility */}
      <article
        className={cn(
          "relative border-2 border-foreground bg-secondary text-secondary-foreground p-5 md:p-6",
          "shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-md",
        )}
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
          {payload.agreement_type ? `${payload.agreement_type} · For Review` : "Clause · For Review"}
        </div>
        <div className="font-serif text-[15px] leading-7 whitespace-pre-wrap">
          {segments.map((seg, i) => {
            if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
            const id = seg.id!;
            const text = spanText.get(id) ?? id;
            if (props.mode === "review") {
              const submitted = submittedMap.get(id);
              const correct = correctMap.get(id);
              const isCorrectHit = !!submitted && submitted === correct;
              const isMissed = !submitted && !!correct;
              const isFalseFlag = !!submitted && !correct;
              const isWrongCat = !!submitted && !!correct && submitted !== correct;
              return (
                <span
                  key={i}
                  className={cn(
                    "px-1 rounded-sm border-b-[3px] inline",
                    isCorrectHit && "border-emerald-500 bg-emerald-500/15",
                    isMissed && "border-rose-500 bg-rose-500/15",
                    isFalseFlag && "border-dashed border-amber-500 bg-amber-500/15",
                    isWrongCat && "border-rose-500 bg-rose-500/10",
                    !submitted && !correct && "border-transparent",
                  )}
                  title={
                    isCorrectHit
                      ? `Correct: ${catLabel(correct)}`
                      : isMissed
                        ? `Missed: ${catLabel(correct)}`
                        : isFalseFlag
                          ? `False flag: ${catLabel(submitted)}`
                          : isWrongCat
                            ? `Wrong category — chose ${catLabel(submitted)}, was ${catLabel(correct)}`
                            : ""
                  }
                >
                  {text}
                </span>
              );
            }
            // Answer mode → popover
            const chosen = answerMap.get(id);
            return (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "px-1 mx-0.5 rounded-sm border-b-[3px] inline cursor-pointer transition-colors",
                      chosen
                        ? "border-accent bg-accent/20 text-foreground"
                        : "border-dashed border-foreground/40 hover:border-foreground hover:bg-foreground/5",
                    )}
                  >
                    {text}
                    {chosen && (
                      <span className="ml-1 text-[9px] font-bold uppercase tracking-wider align-middle">
                        · {catLabel(chosen)}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 border-2 border-foreground p-2 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Flag this clause
                  </div>
                  <div className="space-y-1">
                    {payload.categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFlag(id, c.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs border-2 rounded-sm transition-colors",
                          chosen === c.id
                            ? "border-accent bg-accent/15"
                            : "border-border hover:border-foreground hover:bg-muted",
                        )}
                      >
                        <Flag size={11} className="inline mr-1.5 -mt-0.5" />
                        {c.label}
                      </button>
                    ))}
                    {chosen && (
                      <button
                        type="button"
                        onClick={() => setFlag(id, null)}
                        className="w-full text-left px-2 py-1.5 text-xs border-2 border-border hover:border-rose-500 hover:bg-rose-500/10 rounded-sm transition-colors text-muted-foreground"
                      >
                        <X size={11} className="inline mr-1.5 -mt-0.5" />
                        Clear flag
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </article>

      {props.mode === "answer" && (
        <div className="text-[11px] text-muted-foreground">
          Click any underlined phrase to flag it with a category.{" "}
          <span className="font-semibold text-foreground">
            {props.value.flagged.length} flagged
          </span>
          .
        </div>
      )}

      {props.mode === "review" && (
        <ReviewBreakdown
          payload={payload}
          submitted={props.submitted}
          correct_flags={props.correct_flags}
        />
      )}
    </div>
  );
}

function ReviewBreakdown({
  payload,
  submitted,
  correct_flags,
}: {
  payload: Payload;
  submitted: DocReviewAnswerState;
  correct_flags: CorrectFlag[];
}) {
  const correctSet = new Map(correct_flags.map((f) => [f.span_id, f.category_id]));
  const submittedMap = new Map(submitted.flagged.map((f) => [f.span_id, f.category_id]));
  const spanText = new Map(payload.spans.map((s) => [s.id, s.text]));
  const catLabel = (id: string) => payload.categories.find((c) => c.id === id)?.label ?? id;

  const missed = correct_flags.filter((f) => !submittedMap.has(f.span_id));
  const falseFlags = submitted.flagged.filter((f) => !correctSet.has(f.span_id));
  const wrongCats = submitted.flagged.filter(
    (f) => correctSet.has(f.span_id) && correctSet.get(f.span_id) !== f.category_id,
  );

  if (missed.length === 0 && falseFlags.length === 0 && wrongCats.length === 0) {
    return (
      <div className="border-2 border-emerald-500/60 bg-emerald-500/10 p-4 rounded-md flex items-start gap-3">
        <Check size={18} className="text-emerald-500 mt-0.5" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-0.5">
            Clean Pass
          </div>
          <p className="text-sm text-foreground">
            Every flag landed on the right span with the right category. Excellent close-read.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground bg-card p-4 rounded-md space-y-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-accent" />
        <span className="font-heading text-xs font-extrabold uppercase tracking-[0.18em]">
          Why You Lost Points
        </span>
      </div>
      {missed.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">
            Missed ({missed.length})
          </div>
          <ul className="space-y-2 text-xs">
            {missed.map((f) => (
              <li key={f.span_id} className="text-foreground">
                <span className="italic">"{spanText.get(f.span_id)}"</span> — should have been
                flagged as <strong>{catLabel(f.category_id)}</strong>.
                <Pedagogy spanId={f.span_id} payload={payload} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {falseFlags.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">
            False Flags ({falseFlags.length})
          </div>
          <ul className="space-y-2 text-xs">
            {falseFlags.map((f) => (
              <li key={f.span_id} className="text-foreground">
                <span className="italic">"{spanText.get(f.span_id)}"</span> — flagged as{" "}
                <strong>{catLabel(f.category_id)}</strong>, but this clause is fine.
              </li>
            ))}
          </ul>
        </div>
      )}
      {wrongCats.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">
            Wrong Category ({wrongCats.length})
          </div>
          <ul className="space-y-2 text-xs">
            {wrongCats.map((f) => (
              <li key={f.span_id} className="text-foreground">
                <span className="italic">"{spanText.get(f.span_id)}"</span> — you flagged{" "}
                <strong>{catLabel(f.category_id)}</strong>, was{" "}
                <strong>{catLabel(correctSet.get(f.span_id)!)}</strong>.
                <Pedagogy spanId={f.span_id} payload={payload} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Pedagogy({ spanId, payload }: { spanId: string; payload: Payload }) {
  const why = payload.rationale?.[spanId];
  const fix = payload.suggested_redline?.[spanId];
  if (!why && !fix) return null;
  return (
    <div className="mt-1.5 ml-3 pl-3 border-l-2 border-accent/40 space-y-1">
      {why && (
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-bold uppercase tracking-wider text-accent text-[9px] mr-1.5">Why</span>
          {why}
        </div>
      )}
      {fix && (
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-bold uppercase tracking-wider text-emerald-500 text-[9px] mr-1.5">Redline</span>
          {fix}
        </div>
      )}
    </div>
  );
}
