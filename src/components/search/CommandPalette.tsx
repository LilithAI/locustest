import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Clock, Sparkles, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPalette } from "./useCommandPalette";
import { ensureFirmsLoaded, runSearch, SEARCH_SUGGESTIONS, KIND_LABELS } from "./searchEngine";
import type { SearchGroup, SearchResult } from "./types";
import { track } from "@/lib/analytics";

type FirmRow = { name: string; city: string; area: string; tier: string; rating: number | null };

export default function CommandPalette() {
  const { open, setOpen, recents, pushRecent, clearRecents } = useCommandPalette();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [firms, setFirms] = useState<FirmRow[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lazy load firms on first open
  useEffect(() => {
    if (!open) return;
    void track("search_opened");
    if (firms) return;
    ensureFirmsLoaded().then((rows) => setFirms(rows as FirmRow[]));
  }, [open, firms]);

  // Fire search_query (debounced) when query changes meaningfully
  useEffect(() => {
    if (debounced.trim().length >= 2) {
      void track("search_query", { length: debounced.length });
    }
  }, [debounced]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setActiveIndex(0);
    } else {
      // Focus shortly after open animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const { groups, flat } = useMemo(() => {
    const out = runSearch(debounced, firms);
    const flatList: SearchResult[] = [];
    for (const g of out.groups) for (const r of g.results) flatList.push(r);
    return { groups: out.groups, flat: flatList };
  }, [debounced, firms]);

  // Clamp active index
  useEffect(() => {
    setActiveIndex(0);
  }, [debounced, firms]);
  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(Math.max(0, flat.length - 1));
  }, [flat.length, activeIndex]);

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-result-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onSelect = (r: SearchResult, opts?: { newTab?: boolean }) => {
    pushRecent(debounced || query);
    void track("search_result_clicked", { kind: r.kind, query: (debounced || query).slice(0, 64) });
    setOpen(false);
    if (r.externalDownload) {
      const a = document.createElement("a");
      a.href = r.href;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    if (opts?.newTab) {
      window.open(r.href, "_blank", "noopener");
    } else {
      navigate(r.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[activeIndex];
      if (target) onSelect(target, { newTab: e.metaKey || e.ctrlKey });
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl w-[95vw] sm:w-full top-[10vh] sm:top-1/2 translate-y-0 sm:-translate-y-1/2 border-2 border-foreground/70 bg-background/85 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_24px_64px_-12px_hsl(var(--accent)/0.4),4px_4px_0_0_hsl(var(--accent))] rounded-2xl overflow-hidden [&>button]:hidden"
        style={{ WebkitBackdropFilter: "blur(24px) saturate(160%)" }}
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b-2 border-foreground/30">
          <Search size={18} className="text-accent shrink-0" strokeWidth={2.5} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search firms, guides, tools, resources…"
            className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground font-inter min-w-0"
            aria-label="Search"
            aria-controls="command-results"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-foreground/40 text-muted-foreground">
            esc
          </kbd>
        </div>

        {/* Results / empty state */}
        <div ref={listRef} id="command-results" role="listbox" className="max-h-[60vh] sm:max-h-[55vh] overflow-y-auto">
          {!debounced ? (
            <EmptyState
              suggestions={SEARCH_SUGGESTIONS}
              recents={recents}
              onPick={(q) => { setQuery(q); inputRef.current?.focus(); }}
              onClearRecents={clearRecents}
            />
          ) : flat.length === 0 ? (
            <NoResults query={debounced} />
          ) : (
            <ResultsList
              groups={groups}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={onSelect}
            />
          )}
        </div>

        {/* Footer hint bar */}
        <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-2.5 border-t-2 border-foreground/30 bg-background/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft size={10} /></Kbd> open</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-foreground/40 text-foreground bg-background/60 font-mono text-[10px]">
      {children}
    </span>
  );
}

function EmptyState({
  suggestions,
  recents,
  onPick,
  onClearRecents,
}: {
  suggestions: string[];
  recents: string[];
  onPick: (q: string) => void;
  onClearRecents: () => void;
}) {
  return (
    <div className="px-4 py-5 space-y-5">
      {recents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
              <Clock size={11} /> Recent
            </p>
            <button
              onClick={onClearRecents}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recents.map((r) => (
              <button
                key={r}
                onClick={() => onPick(r)}
                className="px-3 py-1.5 text-xs font-inter text-foreground bg-background/60 border-2 border-foreground/50 rounded-full hover:border-accent hover:text-accent transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles size={11} /> Try
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="px-3 py-1.5 text-xs font-inter text-muted-foreground bg-background/40 border-2 border-foreground/30 rounded-full hover:border-accent hover:text-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-foreground/15">
        <p className="text-xs text-muted-foreground font-inter">
          Search across <span className="text-foreground font-semibold">3,800+ firms</span>, playbook guides, tools, resources, and pages.
        </p>
      </div>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-sora text-sm font-bold text-foreground">No results for "{query}"</p>
      <p className="text-xs text-muted-foreground mt-1.5 font-inter">
        Try a city ("Mumbai"), a topic ("cold email"), or a tool ("NDA").
      </p>
    </div>
  );
}

function ResultsList({
  groups,
  activeIndex,
  onHover,
  onSelect,
}: {
  groups: SearchGroup[];
  activeIndex: number;
  onHover: (i: number) => void;
  onSelect: (r: SearchResult) => void;
}) {
  let cursor = 0;
  return (
    <div className="py-2">
      {groups.map((g, gi) => {
        const Icon = g.icon;
        const startIdx = cursor;
        cursor += g.results.length;
        return (
          <div key={g.kind} className={gi > 0 ? "mt-1" : ""}>
            <div className="px-4 py-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <Icon size={11} className="text-accent" strokeWidth={2.5} />
              {g.label}
              <span className="text-foreground/30">·</span>
              <span className="text-foreground/50">{g.results.length}</span>
            </div>
            <div>
              {g.results.map((r, ri) => {
                const idx = startIdx + ri;
                const isActive = idx === activeIndex;
                return (
                  <ResultRow
                    key={r.id}
                    result={r}
                    active={isActive}
                    index={idx}
                    onHover={() => onHover(idx)}
                    onSelect={() => onSelect(r)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultRow({
  result,
  active,
  index,
  onHover,
  onSelect,
}: {
  result: SearchResult;
  active: boolean;
  index: number;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-result-idx={index}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-all border-l-[3px] ${
        active
          ? "bg-accent/15 border-l-accent translate-x-[2px]"
          : "border-l-transparent hover:bg-foreground/[0.04]"
      }`}
    >
      <div className={`shrink-0 w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-mono font-bold uppercase tracking-tight ${
        active ? "border-accent text-accent bg-accent/10" : "border-foreground/30 text-muted-foreground"
      }`}>
        {KIND_LABELS[result.kind].slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sora text-sm font-bold text-foreground truncate">{result.title}</div>
        {result.subtitle && (
          <div className="text-[11px] text-muted-foreground font-inter truncate">{result.subtitle}</div>
        )}
      </div>
      {result.meta && (
        <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-foreground/20 px-1.5 py-0.5 rounded shrink-0">
          {result.meta}
        </span>
      )}
      <ArrowRight
        size={14}
        className={`shrink-0 transition-all ${active ? "text-accent translate-x-0.5" : "text-foreground/30"}`}
      />
    </button>
  );
}
