/**
 * RotatingHero — homepage hero.
 *
 * The LCP element is the static <h1> text. We render it as plain text on the
 * first commit (no Suspense, no lazy boundary, no useEffect→setState gate),
 * then optionally swap in the GooeyText morph effect once the page is idle.
 * On reduced-motion or weak devices, GooeyText never mounts.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Target, FileText, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import ShapeLandingBg from "@/components/ui/shape-landing-bg";

const FEATURES = [
  { icon: Building2, label: "3,890+ Firms Directory" },
  { icon: Target, label: "Daily Skill Challenges" },
  { icon: FileText, label: "Templates & Tools" },
  { icon: LineChart, label: "Application Tracker" },
];

const MORPH_TEXTS = [
  "not the one your college got you.",
  "based on your skills, not your campus.",
  "earned through merit, not connections.",
];

// Lightweight component that mounts GooeyText only after idle on capable
// devices. Keeps the gooey-text-morphing chunk out of the LCP critical path.
type MorphProps = {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  startDelayMs?: number;
  className?: string;
  textClassName?: string;
};

function MorphingTagline() {
  const [Component, setComponent] = useState<null | React.ComponentType<MorphProps>>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const nav = navigator as unknown as { deviceMemory?: number };
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return;

    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      import("@/components/ui/gooey-text-morphing").then((m) => {
        if (!cancelled) setComponent(() => m.GooeyText as React.ComponentType<MorphProps>);
      });
    };
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) ric(load, { timeout: 5000 });
    else setTimeout(load, 3500);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Component) {
    return (
      <span className="block mt-2 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px] text-accent">
        {MORPH_TEXTS[0]}
      </span>
    );
  }

  return (
    <Component
      texts={MORPH_TEXTS}
      morphTime={2}
      cooldownTime={1.5}
      startDelayMs={500}
      className="block mt-2 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]"
      textClassName="text-accent font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
    />
  );
}

export default function RotatingHero() {
  return (
    <section
      aria-label="Locus introduction"
      className="relative min-h-[88vh] flex items-center overflow-hidden"
    >
      <ShapeLandingBg />

      <div className="container mx-auto px-4 md:px-8 relative z-10 py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/*
            Above-the-fold elements render at opacity:1 on first paint to
            keep the LCP element from being delayed by entry animations.
          */}
          <RainbowButton className="mb-8 font-heading text-sm font-semibold tracking-widest uppercase">
            Your merit. Your internship.
          </RainbowButton>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-8 text-foreground">
            Get the internship you deserve —{" "}
            <MorphingTagline />
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-12">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 border-2 border-border bg-card/60 rounded-xl px-4 py-3 text-left"
              >
                <Icon className="h-5 w-5 text-accent shrink-0" />
                <span className="font-heading text-xs sm:text-sm font-semibold text-foreground leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="font-heading text-base px-8 py-4">
                Start your journey
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/directory">
              <Button variant="neutral" size="lg" className="font-heading text-base px-8 py-4">
                Explore Locus
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
