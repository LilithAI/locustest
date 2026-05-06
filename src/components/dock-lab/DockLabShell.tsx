import { useState } from "react";
import CurrentDock from "./variants/CurrentDock";
import OrbDock from "./variants/OrbDock";
import CommandBarDock from "./variants/CommandBarDock";
import SwipeableDock from "./variants/SwipeableDock";
import ContextualDock from "./variants/ContextualDock";
import PullUpDrawerDock from "./variants/PullUpDrawerDock";
import SplitDock from "./variants/SplitDock";
import EdgeTabBarDock from "./variants/EdgeTabBarDock";
import MorphDock from "./variants/MorphDock";
import TwoPillDock from "./variants/TwoPillDock";

type Variant = {
  id: string;
  name: string;
  description: string;
  Component: () => JSX.Element;
};

const VARIANTS: Variant[] = [
  { id: "twopill", name: "Two-Pill Dock", description: "Persistent nav pill (left) + contextual action pill (right). Collapses to a circle on scroll-down. Use the chips above the dock to preview each route's action.", Component: TwoPillDock },
  { id: "morph", name: "Morph Dock", description: "Single dock that morphs shape based on context — pill, split, search, orb, or hidden.", Component: MorphDock },
  { id: "current", name: "Current Dock", description: "Today's glassmorphic pill — baseline.", Component: CurrentDock },
  { id: "orb", name: "Locus Orb", description: "FAB bottom-right; taps fan icons in an arc.", Component: OrbDock },
  { id: "command", name: "Command Bar", description: "Single search pill opens a full-screen menu sheet.", Component: CommandBarDock },
  { id: "swipe", name: "Swipeable Dock", description: "Pill with horizontal swipe to reveal more sections.", Component: SwipeableDock },
  { id: "contextual", name: "Contextual Dock", description: "Items adapt to the current section. Toggle the chips above.", Component: ContextualDock },
  { id: "drawer", name: "Pull-Up Drawer", description: "Tiny grab handle; tap or pull up for the full menu.", Component: PullUpDrawerDock },
  { id: "split", name: "Split Dock", description: "Left = nav, right = primary action. Frees thumb zone.", Component: SplitDock },
  { id: "edge", name: "Edge Tab Bar", description: "Full-width iOS-style bar flush to bottom with center FAB.", Component: EdgeTabBarDock },
];

export default function DockLabShell() {
  const [activeId, setActiveId] = useState("twopill");
  const variant = VARIANTS.find((v) => v.id === activeId)!;
  const ActiveDock = variant.Component;

  return (
    <div className="min-h-screen bg-background text-foreground pb-48">
      {/* Sticky control panel */}
      <div className="sticky top-0 z-50 bg-background border-b-2 border-foreground">
        <div className="px-4 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-sora text-lg font-bold">
              Dock <span className="text-accent">Lab</span>
            </h1>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">scroll to test auto-hide</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={`shrink-0 px-3 py-1.5 text-xs font-sora border-2 border-foreground transition-all ${activeId === v.id ? "bg-accent text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-inter">{variant.description}</p>
        </div>
      </div>

      {/* Fake content for scroll feel */}
      <div className="px-4 py-8 space-y-6 max-w-2xl mx-auto">
        <section>
          <h2 className="font-sora text-3xl font-bold mb-3">
            Mobile dock <span className="text-accent">concepts</span>
          </h2>
          <p className="text-muted-foreground font-inter">
            Pick a variant above. The active dock is rendered fixed at the bottom and is fully interactive — tap, swipe, pull, whatever it asks for. Best viewed at a phone-width viewport.
          </p>
        </section>

        <div className="hidden md:block p-4 border-2 border-accent bg-accent/10">
          <p className="text-sm font-inter">
            <span className="font-bold">Tip:</span> resize your window to ~390px wide (or open dev tools → mobile preview) to feel each dock the way users will.
          </p>
        </div>

        {Array.from({ length: 12 }).map((_, i) => (
          <article key={i} className="p-5 border-2 border-foreground bg-background shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <p className="text-xs uppercase tracking-wider text-accent font-mono mb-2">Sample {i + 1}</p>
            <h3 className="font-sora text-lg font-bold mb-2">A long enough page to scroll</h3>
            <p className="text-sm text-muted-foreground font-inter">
              The dock variants behave differently as you scroll, focus inputs, or open menus. Filler content makes those interactions feel real instead of stuck on a single hero.
            </p>
          </article>
        ))}
      </div>

      <ActiveDock />
    </div>
  );
}
