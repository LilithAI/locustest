import { useState } from "react";
import { Home, Search, Plus, Bell, User, MoreHorizontal, Filter, GitCompare, Bookmark, MessageSquare } from "lucide-react";

const SECTIONS = [
  { key: "home", label: "Home", items: [Home, Search, Bell, User, MoreHorizontal] },
  { key: "the-bar", label: "The Bar", items: [Home, MessageSquare, Plus, Bell, MoreHorizontal] },
  { key: "directory", label: "Directory", items: [Home, Filter, GitCompare, Bookmark, MoreHorizontal] },
];

const LABELS: Record<string, string[]> = {
  home: ["Home", "Search", "Alerts", "Profile", "More"],
  "the-bar": ["Home", "Threads", "New", "Alerts", "More"],
  directory: ["Home", "Filter", "Compare", "Saved", "More"],
};

export default function ContextualDock() {
  const [section, setSection] = useState("home");
  const items = SECTIONS.find((s) => s.key === section)!.items;
  const labels = LABELS[section];

  return (
    <>
      <div className="fixed bottom-24 left-4 right-4 z-40 flex justify-center gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-3 py-1.5 text-xs font-sora border-2 border-foreground transition-all ${section === s.key ? "bg-accent text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]" : "bg-background text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <nav className="fixed bottom-5 left-4 right-4 z-40">
        <div className="flex items-center justify-around px-2 py-3 rounded-2xl bg-background border-2 border-foreground shadow-[4px_4px_0_0_hsl(var(--accent))]">
          {items.map((Icon, i) => (
            <button key={i} aria-label={labels[i]} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
              <Icon size={20} className={i === 0 ? "text-accent" : "text-foreground"} strokeWidth={i === 0 ? 2.5 : 1.8} />
              <span className="text-[9px] font-sora text-muted-foreground">{labels[i]}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
