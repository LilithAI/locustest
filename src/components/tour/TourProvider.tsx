import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { TourStep } from "./types";
import TourOverlay from "./TourOverlay";

interface TourContextValue {
  running: boolean;
  stepIndex: number;
  steps: TourStep[];
  start: (steps: TourStep[]) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}

interface Props {
  children: ReactNode;
  onFinish?: () => void;
  onSkip?: () => void;
}

export function TourProvider({ children, onFinish, onSkip }: Props) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);

  const start = useCallback((s: TourStep[]) => {
    // Filter out steps whose anchor isn't in the DOM right now OR is rendered
    // with zero layout (e.g. SearchFab is `hidden md:flex` on mobile — it
    // matches querySelector but has 0×0 box, which would put the spotlight
    // on the page edge). Keeps tour graceful instead of floating tooltips
    // in empty corners.
    const resolvable =
      typeof document === "undefined"
        ? s
        : s.filter((step) => {
            const el = document.querySelector(step.target);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
    if (resolvable.length === 0) return;
    setSteps(resolvable);
    setStepIndex(0);
    setRunning(true);
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    onFinish?.();
  }, [onFinish]);

  const skip = useCallback(() => {
    setRunning(false);
    onSkip?.();
  }, [onSkip]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        setRunning(false);
        onFinish?.();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, onFinish]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Keyboard nav
  useEffect(() => {
    if (!running) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, next, back, skip]);

  const value = useMemo<TourContextValue>(
    () => ({ running, stepIndex, steps, start, next, back, skip, finish }),
    [running, stepIndex, steps, start, next, back, skip, finish]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {running && steps[stepIndex] && (
        <TourOverlay
          step={steps[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      )}
    </TourContext.Provider>
  );
}
