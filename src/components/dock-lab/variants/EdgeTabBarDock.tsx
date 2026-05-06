import { useState } from "react";
import { Home, Building2, Plus, Library, Gavel } from "lucide-react";

export default function EdgeTabBarDock() {
  const [active, setActive] = useState("home");
  const left = [
    { key: "home", label: "Home", icon: Home },
    { key: "directory", label: "Directory", icon: Building2 },
  ];
  const right = [
    { key: "resources", label: "Resources", icon: Library },
    { key: "the-bar", label: "Bar", icon: Gavel },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t-2 border-foreground">
      <div className="relative grid grid-cols-5 items-end pt-2 pb-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        {left.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)} className="flex flex-col items-center gap-1">
              <Icon size={22} className={isActive ? "text-accent" : "text-muted-foreground"} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-sora ${isActive ? "text-accent" : "text-muted-foreground"}`}>{label}</span>
            </button>
          );
        })}
        <div className="flex justify-center">
          <button
            aria-label="New"
            className="-mt-8 w-14 h-14 rounded-full bg-accent border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))] transition-all"
          >
            <Plus size={28} className="text-foreground" strokeWidth={2.5} />
          </button>
        </div>
        {right.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)} className="flex flex-col items-center gap-1">
              <Icon size={22} className={isActive ? "text-accent" : "text-muted-foreground"} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-sora ${isActive ? "text-accent" : "text-muted-foreground"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
