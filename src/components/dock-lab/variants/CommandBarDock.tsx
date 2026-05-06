import { useState } from "react";
import { Search, X } from "lucide-react";
import { NAV_ITEMS } from "../shared/navItems";

export default function CommandBarDock() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center gap-2 p-4 border-b-2 border-foreground">
            <Search size={20} className="text-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Locus…"
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-sora"
            />
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X size={22} className="text-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sections</p>
            {filtered.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 p-3 border-2 border-foreground bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))] transition-all"
              >
                <Icon size={20} className="text-accent" />
                <span className="font-sora text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="fixed bottom-5 left-4 right-4 z-30">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-full bg-background border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--accent))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--accent))] transition-all"
        >
          <Search size={18} className="text-foreground" />
          <span className="text-muted-foreground font-sora text-sm">Search Locus…</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 border border-foreground text-foreground font-mono">/</span>
        </button>
      </div>
    </>
  );
}
