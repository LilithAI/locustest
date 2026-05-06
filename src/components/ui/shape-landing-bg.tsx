/**
 * ShapeLandingBg — decorative floating shapes.
 *
 * Mounts only after the page is idle (or on reduced-motion: never). Paints
 * a static radial-gradient tint immediately so the background isn't empty
 * during the wait. Removed backdrop-blur and the blur-3xl tint layer — both
 * were expensive on mobile GPUs and visually invisible against the dark bg.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type ShapeProps = {
  className?: string;
  delayMs?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
};

function ElegantShape({
  className,
  delayMs = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: ShapeProps) {
  // Pure CSS keyframe entry + float — no React state, no rAF.
  const style: CSSProperties = {
    width,
    height,
    transform: `rotate(${rotate}deg)`,
    animation: `shapeEnter 1.6s cubic-bezier(0.23, 0.86, 0.39, 0.96) ${delayMs}ms both, shapeFloat 12s ease-in-out ${delayMs + 1600}ms infinite`,
    opacity: 0,
  };

  return (
    <div className={cn("absolute", className)} style={style}>
      <div
        style={{ width, height }}
        className={cn(
          "relative rounded-full",
          "bg-gradient-to-r to-transparent",
          gradient,
          "border-2 border-white/[0.08]"
        )}
      />
    </div>
  );
}

export default function ShapeLandingBg() {
  const [mountShapes, setMountShapes] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const nav = navigator as unknown as { deviceMemory?: number };
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return;

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) ric(() => setMountShapes(true), { timeout: 4000 });
    else setTimeout(() => setMountShapes(true), 2500);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden z-0"
      // Static radial tint via inline background — no extra layer, no blur filter.
      style={{
        background:
          "radial-gradient(ellipse at 20% 20%, hsl(var(--accent)/0.05), transparent 55%), radial-gradient(ellipse at 80% 80%, hsl(0 0% 100%/0.03), transparent 60%)",
      }}
    >
      {mountShapes && (
        <>
          <ElegantShape
            delayMs={300}
            width={600}
            height={140}
            rotate={-8}
            gradient="from-white/[0.10]"
            className="left-[-10%] md:left-[-6%] top-[14%] md:top-[18%]"
          />
          <ElegantShape
            delayMs={500}
            width={500}
            height={120}
            rotate={15}
            gradient="from-accent/[0.16]"
            className="right-[-6%] md:right-[-4%] top-[68%] md:top-[72%]"
          />
          <ElegantShape
            delayMs={400}
            width={300}
            height={80}
            rotate={-20}
            gradient="from-white/[0.10]"
            className="left-[4%] md:left-[6%] bottom-[6%] md:bottom-[10%]"
          />
          <ElegantShape
            delayMs={600}
            width={200}
            height={60}
            rotate={25}
            gradient="from-accent/[0.16]"
            className="right-[12%] md:right-[16%] top-[8%] md:top-[10%]"
          />
          <ElegantShape
            delayMs={700}
            width={150}
            height={40}
            rotate={-25}
            gradient="from-white/[0.10]"
            className="left-[18%] md:left-[22%] top-[4%] md:top-[6%]"
          />
        </>
      )}
    </div>
  );
}
