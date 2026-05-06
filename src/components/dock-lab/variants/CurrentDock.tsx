import { useState } from "react";
import { NAV_ITEMS } from "../shared/navItems";

export default function CurrentDock() {
  const [active, setActive] = useState("home");
  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-4 px-6 py-3 rounded-full bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl shadow-black/10">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              aria-label={label}
              onClick={() => setActive(key)}
              className="relative w-10 h-10 flex items-center justify-center transition-transform duration-150 active:scale-90"
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? "text-accent drop-shadow-[0_0_6px_hsl(var(--accent)/0.5)]" : "text-muted-foreground"} />
              {isActive && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
