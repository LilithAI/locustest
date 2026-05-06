import { useState } from "react";
import { Plus, X } from "lucide-react";
import { NAV_ITEMS } from "../shared/navItems";

export default function OrbDock() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const radius = 110;
  const startAngle = 180; // pointing left
  const endAngle = 270; // pointing up
  const step = (endAngle - startAngle) / (NAV_ITEMS.length - 1);

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm"
        />
      )}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {NAV_ITEMS.map(({ key, label, icon: Icon }, i) => {
            const angle = (startAngle + step * i) * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const isActive = active === key;
            return (
              <button
                key={key}
                aria-label={label}
                onClick={() => {
                  setActive(key);
                  setOpen(false);
                }}
                style={{
                  transform: open ? `translate(${x}px, ${y}px) scale(1)` : "translate(0,0) scale(0)",
                  transitionDelay: open ? `${i * 30}ms` : `${(NAV_ITEMS.length - i) * 20}ms`,
                }}
                className={`absolute bottom-0 right-0 w-12 h-12 flex items-center justify-center rounded-full bg-background border-2 border-foreground transition-all duration-300 ${isActive ? "shadow-[3px_3px_0_0_hsl(var(--accent))]" : "shadow-[3px_3px_0_0_hsl(var(--foreground))]"}`}
              >
                <Icon size={20} className={isActive ? "text-accent" : "text-foreground"} />
              </button>
            );
          })}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="relative w-16 h-16 flex items-center justify-center rounded-full bg-accent border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
          >
            {open ? <X size={26} className="text-foreground" strokeWidth={2.5} /> : <Plus size={26} className="text-foreground" strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </>
  );
}
