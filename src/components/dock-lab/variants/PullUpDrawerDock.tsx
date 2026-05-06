import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { NAV_ITEMS } from "../shared/navItems";

export default function PullUpDrawerDock() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");

  return (
    <>
      {open && <button aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm" />}
      <div
        className={`fixed left-0 right-0 z-40 bg-background border-t-2 border-foreground transition-transform duration-300 ${open ? "translate-y-0 shadow-[0_-6px_0_0_hsl(var(--accent))]" : ""}`}
        style={{ bottom: 0, transform: open ? "translateY(0)" : "translateY(calc(100% - 32px))" }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="w-full flex items-center justify-center py-2 gap-2"
        >
          <span className="block w-12 h-1 rounded-full bg-foreground/40" />
          <ChevronUp size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="px-4 pb-6 pt-2 grid grid-cols-3 gap-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActive(key);
                  setOpen(false);
                }}
                className={`flex flex-col items-center gap-2 p-4 border-2 border-foreground transition-all ${isActive ? "bg-accent shadow-[3px_3px_0_0_hsl(var(--foreground))]" : "bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"}`}
              >
                <Icon size={22} className="text-foreground" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[11px] font-sora text-foreground">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
