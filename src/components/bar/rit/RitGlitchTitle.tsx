// 3-layer chromatic glitch title for "Reason It Through".
// Base layer: foreground text. Two duplicates: cyan (offset left) and magenta (offset right),
// blended via mix-blend-mode for chromatic aberration. Glitch animation runs on mount,
// continuously while a parent has `.rit-hover-trigger:hover`, and as a quiet idle tic every 8s.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
}

export function RitGlitchTitle({ text, className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger one-shot mount glitch on next frame
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Base classes shared by all 3 layers
  const layerBase = "block font-heading font-extrabold tracking-tight leading-none";

  return (
    <span className={cn("relative inline-block select-none", className)}>
      {/* Invisible spacer that defines size — keeps layout stable */}
      <span className={cn(layerBase, "invisible")}>{text}</span>

      {/* Base layer */}
      <span
        className={cn(
          layerBase,
          "absolute inset-0 text-foreground",
          mounted && "animate-rit-idle-tic",
        )}
      >
        {text}
      </span>

      {/* Cyan offset layer */}
      <span
        aria-hidden
        className={cn(
          layerBase,
          "absolute inset-0 text-[hsl(180_90%_55%)] mix-blend-screen pointer-events-none",
          "translate-x-[-1px] translate-y-[0.5px] opacity-0",
          mounted && "animate-rit-glitch opacity-80",
          "group-hover/rit:animate-rit-glitch-loop group-hover/rit:opacity-90",
        )}
      >
        {text}
      </span>

      {/* Magenta offset layer */}
      <span
        aria-hidden
        className={cn(
          layerBase,
          "absolute inset-0 text-[hsl(330_95%_60%)] mix-blend-screen pointer-events-none",
          "translate-x-[1px] translate-y-[-0.5px] opacity-0",
          mounted && "animate-rit-glitch opacity-80",
          "group-hover/rit:animate-rit-glitch-loop group-hover/rit:opacity-90",
        )}
        style={{ animationDelay: "60ms" }}
      >
        {text}
      </span>
    </span>
  );
}
