import { Search } from "lucide-react";
import { useCommandPalette } from "./useCommandPalette";

export default function SearchFab() {
  const { toggle } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Search (Cmd+K)"
      data-tour="search"
      className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 h-12 pl-3 pr-4 bg-background/55 backdrop-blur-2xl backdrop-saturate-150 border-2 border-foreground/70 rounded-full text-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_8px_32px_-8px_hsl(var(--accent)/0.35),3px_3px_0_0_hsl(var(--accent))] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_12px_36px_-8px_hsl(var(--accent)/0.45),4px_4px_0_0_hsl(var(--accent))] active:translate-x-[1px] active:translate-y-[1px] transition-all"
      style={{ WebkitBackdropFilter: "blur(24px) saturate(160%)" }}
    >
      <Search size={16} strokeWidth={2.5} className="text-accent" />
      <span className="font-sora text-xs font-bold">Search</span>
      <span className="ml-1 flex items-center gap-0.5">
        <kbd className="font-mono text-[10px] font-bold px-1 rounded border border-foreground/40 bg-background/60">⌘</kbd>
        <kbd className="font-mono text-[10px] font-bold px-1 rounded border border-foreground/40 bg-background/60">K</kbd>
      </span>
    </button>
  );
}
