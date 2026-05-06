import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  /** Delay (ms) before morph cycle starts. Lets the LCP candidate paint stably first. */
  startDelayMs?: number;
  className?: string;
  textClassName?: string;
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  startDelayMs = 1600,
  className,
  textClassName,
}: GooeyTextProps) {
  const [filterReady, setFilterReady] = React.useState(false);
  const [animateReady, setAnimateReady] = React.useState(false);
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    // Never animate under reduced-motion — render text statically.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const t = window.setTimeout(() => setAnimateReady(true), startDelayMs);
    return () => window.clearTimeout(t);
  }, [startDelayMs]);

  React.useEffect(() => {
    if (!animateReady) return;
    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;
    let animationId: number;

    const setMorph = (fraction: number) => {
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

        const f = 1 - fraction;
        text1Ref.current.style.filter = `blur(${Math.min(8 / f - 8, 100)}px)`;
        text1Ref.current.style.opacity = `${Math.pow(f, 0.4) * 100}%`;
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "100%";
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0%";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    function animate() {
      if (document.hidden) {
        // Pause work entirely while the tab is in the background — this was
        // the main cause of "everything is laggy when I come back to the tab".
        animationId = requestAnimationFrame(animate);
        time = new Date();
        return;
      }
      animationId = requestAnimationFrame(animate);
      const newTime = new Date();
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime.getTime() - time.getTime()) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex % texts.length];
            text2Ref.current.textContent =
              texts[(textIndex + 1) % texts.length];
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [texts, morphTime, cooldownTime, animateReady]);

  React.useEffect(() => {
    // Defer SVG filter to avoid blocking LCP paint
    const id = requestAnimationFrame(() => setFilterReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={cn("relative inline-block", className)}>
      {animateReady && filterReady && (
        <svg className="absolute h-0 w-0" aria-hidden="true">
          <defs>
            <filter id="gooey-text-threshold">
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 255 -140"
              />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="relative"
        style={
          animateReady && filterReady
            ? { filter: "url(#gooey-text-threshold)" }
            : undefined
        }
      >
        {/*
          LCP-critical text: rendered visibly in normal flow on first paint,
          at full opacity, with no absolute-positioned opacity:0 sibling.
          Lighthouse picks this span as the LCP candidate and sees it painted
          in frame 1.
        */}
        <span
          ref={text2Ref}
          className={cn("inline-block", textClassName)}
        >
          {texts[0]}
        </span>
        {/*
          Hidden morph layer mounts only after the page is idle. Until then
          there is no opacity:0 sibling for Lighthouse to flag as an LCP
          render-delay culprit.
        */}
        {animateReady && (
          <span
            ref={text1Ref}
            aria-hidden="true"
            className={cn("absolute inset-0", textClassName)}
            style={{ opacity: "0%" }}
          />
        )}
      </div>
    </div>
  );
}
