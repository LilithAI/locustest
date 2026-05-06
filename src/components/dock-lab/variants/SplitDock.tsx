import { useState } from "react";
import { Home, Gavel, Building2, Send } from "lucide-react";

export default function SplitDock() {
  const [active, setActive] = useState("home");
  const navs = [
    { key: "home", label: "Home", icon: Home },
    { key: "the-bar", label: "Bar", icon: Gavel },
    { key: "directory", label: "Directory", icon: Building2 },
  ];

  return (
    <div className="fixed bottom-5 left-4 right-4 z-40 flex items-center justify-between gap-3">
      <nav className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-background border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
        {navs.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              aria-label={label}
              onClick={() => setActive(key)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isActive ? "bg-accent text-foreground" : "text-muted-foreground"}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </button>
          );
        })}
      </nav>
      <button className="flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-foreground border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))] transition-all">
        <Send size={16} strokeWidth={2.5} />
        <span className="font-sora text-sm font-semibold">Submit</span>
      </button>
    </div>
  );
}
