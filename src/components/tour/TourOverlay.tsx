import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep, TourPlacement } from "./types";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 360;
const TOOLTIP_OFFSET = 16;
const MOBILE_BREAKPOINT = 640;

function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function pickPlacement(
  preferred: TourPlacement | undefined,
  rect: Rect,
  vw: number,
  vh: number,
  tooltipH: number
): TourPlacement {
  if (preferred && preferred !== "auto") return preferred;
  const spaceBottom = vh - (rect.top + rect.height);
  const spaceTop = rect.top;
  const spaceRight = vw - (rect.left + rect.width);
  const spaceLeft = rect.left;
  if (spaceBottom > tooltipH + 40) return "bottom";
  if (spaceTop > tooltipH + 40) return "top";
  if (spaceRight > TOOLTIP_WIDTH + 40) return "right";
  if (spaceLeft > TOOLTIP_WIDTH + 40) return "left";
  return "bottom";
}

function computeTooltipPos(
  placement: TourPlacement,
  rect: Rect,
  vw: number,
  vh: number,
  tooltipH: number
): { top: number; left: number } {
  let top = 0;
  let left = 0;
  switch (placement) {
    case "bottom":
      top = rect.top + rect.height + TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "top":
      top = rect.top - tooltipH - TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left + rect.width + TOOLTIP_OFFSET;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
      break;
    default:
      top = rect.top + rect.height + TOOLTIP_OFFSET;
      left = rect.left;
  }
  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));
  return { top, left };
}

export default function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipH, setTooltipH] = useState(180);
  const reduceMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  // Find target & track its position
  useLayoutEffect(() => {
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(getRect(el));
    update();
    // Scroll into view if offscreen
    el.scrollIntoView({ behavior: reduceMotion.current ? "auto" : "smooth", block: "center", inline: "center" });

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    // Re-measure after smooth scroll settles
    const tid = window.setTimeout(update, 350);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearTimeout(tid);
    };
  }, [step.target]);

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setTooltipH(tooltipRef.current.offsetHeight);
    }
  }, [step, rect, viewport]);

  const isMobile = viewport.w <= MOBILE_BREAKPOINT;
  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  // SVG mask: dim everything, cut out the target rect
  const cutout = rect
    ? {
        x: Math.max(0, rect.left - PADDING),
        y: Math.max(0, rect.top - PADDING),
        w: rect.width + PADDING * 2,
        h: rect.height + PADDING * 2,
      }
    : null;

  const placement = rect
    ? pickPlacement(step.placement, rect, viewport.w, viewport.h, tooltipH)
    : "bottom";
  const tooltipPos = rect
    ? computeTooltipPos(placement, rect, viewport.w, viewport.h, tooltipH)
    : { top: 0, left: 0 };

  const transitionClass = reduceMotion.current
    ? ""
    : "transition-all duration-200 ease-out";

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
    >
      {/* Dim layer with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={(e) => {
          // Clicking dim area does nothing (prevents underlying interaction)
          e.stopPropagation();
        }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.w}
                height={cutout.h}
                rx="12"
                ry="12"
                fill="black"
                className={transitionClass}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(0 0% 0% / 0.72)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Yellow spotlight border around target */}
      {cutout && (
        <div
          className={`absolute pointer-events-none border-2 border-accent rounded-[12px] shadow-[4px_4px_0_0_hsl(var(--accent))] ${transitionClass}`}
          style={{
            top: cutout.y,
            left: cutout.x,
            width: cutout.w,
            height: cutout.h,
          }}
          aria-hidden
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`absolute pointer-events-auto bg-card border-2 border-foreground/80 rounded-2xl p-5 shadow-[6px_6px_0_0_hsl(var(--accent))] ${transitionClass}`}
        style={
          isMobile
            ? {
                left: 12,
                right: 12,
                bottom: 88,
                width: "auto",
                maxWidth: "none",
              }
            : {
                top: tooltipPos.top,
                left: tooltipPos.left,
                width: TOOLTIP_WIDTH,
              }
        }
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
            {stepIndex + 1} of {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="font-heading text-base font-extrabold uppercase tracking-wider text-foreground mb-1.5">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {step.body}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="neutral" size="sm" onClick={onBack}>
                <ArrowLeft size={14} />
                Back
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onNext}>
              {isLast ? "Finish" : "Next"}
              {!isLast && <ArrowRight size={14} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
