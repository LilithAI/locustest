import { useRef, useState } from "react";
import { NAV_ITEMS } from "../shared/navItems";

export default function SwipeableDock() {
  const [active, setActive] = useState("home");
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <nav className="fixed bottom-5 left-4 right-4 z-40">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 px-2 py-2 rounded-full bg-background border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--accent))] overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`snap-center shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${isActive ? "bg-accent text-foreground" : "text-muted-foreground"}`}
              style={{ minWidth: "25%" }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="font-sora text-xs whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2 font-mono">← swipe →</p>
    </nav>
  );
}
