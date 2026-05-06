// Locus+ Document Review — cream paper card with click-to-flag dotted-underline phrases.
import { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Span { id: string; text: string }
interface Category { id: string; label: string }
interface CorrectFlag { span_id: string; category_id: string }

interface Payload {
  document_html: string;
  spans: Span[];
  categories: Category[];
  correct_flags?: CorrectFlag[];
  /** Optional cosmetic header (defaults below). */
  doc_id?: string;
  doc_title?: string;
  doc_subtitle?: string;
  doc_date?: string;
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
  /** When true, render a "Grading your review…" overlay over the paper. */
  grading?: boolean;
  /** When provided (review/result), render score banner above the paper. */
  resultBanner?: ResultBannerProps;
}
interface ReviewProps {
  mode: "review";
  payload: Payload;
  submitted: DocReviewAnswerState;
  correct_flags: CorrectFlag[];
  resultBanner?: ResultBannerProps;
}

export interface ResultBannerProps {
  found: number;
  total: number;
  falseFlags: number;
  pointsAwarded: number;
  pointsBase: number;
}

export function PremiumDocumentReview(props: AnswerProps | ReviewProps) {
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

  const grading = props.mode === "answer" && (props as AnswerProps).grading;
  const resultBanner = props.resultBanner;

  return (
    <div className="space-y-5 min-h-[60vh]">
      {resultBanner && <ResultBanner {...resultBanner} />}

      {payload.reviewer_brief && (
        <div className="max-w-[860px] mx-auto px-5 sm:px-6 py-4 border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))]">
          <div
            className="text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--lp-text-3))] mb-1.5"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Brief from Partner{payload.agreement_type ? ` · ${payload.agreement_type}` : ""}
          </div>
          <p
            className="text-[15px] leading-relaxed text-[hsl(var(--lp-text))] m-0"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {payload.reviewer_brief}
          </p>
        </div>
      )}

      <article className="lp-paper relative max-w-[860px] mx-auto px-6 sm:px-10 md:px-20 py-12 md:py-16">
        {/* meta header */}
        <div
          className="flex justify-between items-baseline border-b border-[hsl(var(--lp-paper-ink)/0.25)] pb-2.5 mb-7 uppercase tracking-[0.12em] text-[10.5px]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "hsl(var(--lp-paper-ink) / 0.55)",
          }}
        >
          <span>{payload.doc_id ?? "DOC-NDA-001"} · CONFIDENTIAL</span>
          <span>{payload.doc_date ?? "April 2024"}</span>
        </div>
        <h1
          className="m-0 mb-1 text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] text-[hsl(var(--lp-paper-ink))]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {payload.doc_title ?? "Mutual Non-Disclosure Agreement"}
        </h1>
        <p
          className="italic mb-8 text-[15px]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(var(--lp-paper-ink) / 0.6)",
          }}
        >
          {payload.doc_subtitle ?? "Excerpt for review — flag every clause that is unconscionable, overbroad, or contrary to law."}
        </p>

        {/* body */}
        <div
          className="text-[17px] sm:text-[18px] leading-[1.65] text-[hsl(var(--lp-paper-ink))] space-y-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {(() => {
            // Group segments into paragraphs split by \n\n in text segments.
            const paragraphs: Array<typeof segments> = [[]];
            for (const seg of segments) {
              if (seg.kind === "text" && seg.text) {
                const parts = seg.text.split(/\n{2,}/);
                parts.forEach((part, idx) => {
                  if (idx > 0) paragraphs.push([]);
                  if (part.length > 0) {
                    paragraphs[paragraphs.length - 1].push({ kind: "text", text: part });
                  }
                });
              } else {
                paragraphs[paragraphs.length - 1].push(seg);
              }
            }

            return paragraphs.map((para, pIdx) => (
              <p key={pIdx} className="whitespace-pre-wrap m-0">
                {para.map((seg, i) => {
                  if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
                  const id = seg.id!;
                  const text = spanText.get(id) ?? id;

                  if (props.mode === "review") {
                    const submitted = submittedMap.get(id);
                    const correct = correctMap.get(id);
                    const isCorrectHit = !!submitted && !!correct;
                    const isMissed = !submitted && !!correct;
                    const isFalseFlag = !!submitted && !correct;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "inline px-[2px] py-[1px] rounded-[2px] border-b-[1.5px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]",
                          isCorrectHit && "bg-[hsl(152_55%_53%/0.55)] border-b-[2px] border-[hsl(152_55%_27%)]",
                          isMissed && "border-b-[2px] border-[hsl(var(--lp-bad))]",
                          isFalseFlag && "border-b-[2px] border-dashed border-[hsl(45_100%_63%/0.9)]",
                          !isCorrectHit && !isMissed && !isFalseFlag &&
                            "border-dotted border-[hsl(var(--lp-paper-ink)/0.35)]",
                        )}
                      >
                        {text}
                      </span>
                    );
                  }

                  const chosen = answerMap.get(id);
                  return (
                    <Popover key={i}>
                      <PopoverTrigger asChild>
                        <span
                          role="button"
                          tabIndex={grading ? -1 : 0}
                          aria-disabled={grading || undefined}
                          onKeyDown={(e) => {
                            if (grading) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).click();
                            }
                          }}
                          className={cn(
                            "inline px-[2px] py-[1px] rounded-[2px] border-b-[1.5px] cursor-pointer transition-colors [box-decoration-break:clone] [-webkit-box-decoration-break:clone] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--lp-accent))]",
                            grading && "cursor-not-allowed opacity-70",
                            chosen
                              ? "bg-[hsl(var(--lp-accent))] border-b-2 border-[hsl(38_70%_43%)]"
                              : "border-dotted border-[hsl(var(--lp-paper-ink)/0.35)] hover:bg-[hsl(var(--lp-paper-ink)/0.08)]",
                          )}
                        >
                          {text}
                        </span>
                      </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="locus-plus w-72 border-2 border-[hsl(var(--lp-line))] bg-[hsl(var(--lp-bg-1))] p-2 rounded-[6px] shadow-none"
                >
                  <div
                    className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--lp-text-3))]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Flag this clause
                  </div>
                  <div className="space-y-0.5">
                    {payload.categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFlag(id, c.id)}
                        className={cn(
                          "w-full text-left px-2.5 py-2 text-[13px] rounded-[4px] transition-colors",
                          chosen === c.id
                            ? "bg-[hsl(45_100%_63%/0.15)] text-[hsl(var(--lp-accent))]"
                            : "text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-bg-2))]",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                    {chosen && (
                      <button
                        type="button"
                        onClick={() => setFlag(id, null)}
                        className="w-full text-left px-2.5 py-2 text-[12px] rounded-[4px] transition-colors text-[hsl(var(--lp-text-3))] hover:bg-[hsl(var(--lp-bg-2))]"
                      >
                        Clear flag
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
                  );
                })}
              </p>
            ));
          })()}
        </div>


        {/* Grading overlay */}
        {grading && (
          <div className="absolute inset-0 grid place-items-center bg-[hsl(var(--lp-paper)/0.7)] rounded-[6px] backdrop-blur-[1px]">
            <div
              className="flex items-center gap-3.5 px-6 py-5 bg-[hsl(var(--lp-bg))] border-2 border-[hsl(var(--lp-line))] rounded-[6px] uppercase tracking-[0.08em] text-[12px] text-[hsl(var(--lp-text))]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="lp-spinner" />
              Grading your review…
            </div>
          </div>
        )}
      </article>

      {props.mode === "review" && (
        <PremiumPedagogy
          payload={payload}
          submitted={props.submitted}
          correct_flags={props.correct_flags}
        />
      )}
    </div>
  );
}

function PremiumPedagogy({
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
  const wrongCats = submitted.flagged.filter(
    (f) => correctSet.has(f.span_id) && correctSet.get(f.span_id) !== f.category_id,
  );
  const items = [...missed, ...wrongCats];
  const hasPedagogy = !!(payload.rationale || payload.suggested_redline);
  if (items.length === 0 || !hasPedagogy) return null;

  return (
    <div className="max-w-[860px] mx-auto px-5 sm:px-6 py-5 border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] space-y-4">
      <div
        className="text-[10.5px] uppercase tracking-[0.18em] text-[hsl(var(--lp-text-3))]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        Partner's Memo · What you missed and the redline
      </div>
      <ul className="space-y-4">
        {items.map((f) => {
          const why = payload.rationale?.[f.span_id];
          const fix = payload.suggested_redline?.[f.span_id];
          return (
            <li key={f.span_id} className="space-y-1.5">
              <div
                className="text-[14px] italic text-[hsl(var(--lp-text-2))]"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                "{spanText.get(f.span_id)}" — <strong className="not-italic">{catLabel(f.category_id)}</strong>
              </div>
              {why && (
                <div className="text-[13px] leading-relaxed text-[hsl(var(--lp-text))]">
                  <span
                    className="text-[9.5px] uppercase tracking-[0.18em] text-[hsl(var(--lp-accent))] mr-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Why
                  </span>
                  {why}
                </div>
              )}
              {fix && (
                <div className="text-[13px] leading-relaxed text-[hsl(var(--lp-text))]">
                  <span
                    className="text-[9.5px] uppercase tracking-[0.18em] text-[hsl(var(--lp-good))] mr-2"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Redline
                  </span>
                  {fix}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResultBanner({ found, total, falseFlags, pointsAwarded, pointsBase }: ResultBannerProps) {
  return (
    <div className="max-w-[860px] mx-auto px-5 sm:px-6 py-4 border-2 border-[hsl(var(--lp-line))] rounded-[6px] bg-[hsl(var(--lp-bg-1))] flex items-center justify-between gap-5 flex-wrap">
      <div
        className="text-[28px] font-bold tracking-[-0.02em] text-[hsl(var(--lp-text))]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {pointsAwarded}
        <span className="text-[hsl(var(--lp-text-3))] font-medium"> / {pointsBase}</span>
      </div>
      <div className="flex gap-3.5 flex-wrap">
        <BdItem dot="g">{found} / {total} Found</BdItem>
        <BdItem dot="r">{Math.max(0, total - found)} Missed</BdItem>
        <BdItem dot="y">{falseFlags} False flag{falseFlags === 1 ? "" : "s"}</BdItem>
      </div>
    </div>
  );
}

function BdItem({ dot, children }: { dot: "g" | "r" | "y"; children: React.ReactNode }) {
  const color = dot === "g" ? "var(--lp-good)" : dot === "r" ? "var(--lp-bad)" : "var(--lp-accent)";
  return (
    <span
      className="inline-flex items-center gap-1.5 uppercase tracking-[0.08em] text-[11px] text-[hsl(var(--lp-text-2))]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="w-2 h-2 rounded-[2px] inline-block" style={{ background: `hsl(${color})` }} />
      {children}
    </span>
  );
}
