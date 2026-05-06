import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function ReaderTOC({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) return setProgress(100);
      setProgress(Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (items.length === 0) return null;

  const activeIndex = Math.max(0, items.findIndex((i) => i.id === activeId));
  const total = items.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Table of contents"
      className="group/toc relative flex items-start"
    >
      {/* Collapsed state: rail + dots (always visible, fades on hover) */}
      <div className="flex items-center gap-3 transition-opacity duration-200 group-hover/toc:opacity-0 group-focus-within/toc:opacity-0 pointer-events-none">
        <div className="relative w-[2px] h-[140px] bg-border/60 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full bg-[hsl(var(--prose-anchor))] transition-[height] duration-150 ease-out"
            style={{ height: `${progress}%` }}
          />
        </div>
        <ol className="flex flex-col gap-2 list-none m-0 p-0">
          {items.map((item, i) => {
            const isActive = activeId === item.id;
            return (
              <li key={item.id} className="m-0 p-0 flex items-center">
                <span
                  className={`block rounded-full transition-all ${
                    isActive
                      ? "w-2 h-2 bg-[hsl(var(--prose-anchor))]"
                      : "w-1.5 h-1.5 bg-muted-foreground/40"
                  }`}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Expanded state: full TOC panel (absolute over collapsed, reveals on hover) */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[260px] opacity-0 -translate-x-2 pointer-events-none group-hover/toc:opacity-100 group-hover/toc:translate-x-0 group-hover/toc:pointer-events-auto group-focus-within/toc:opacity-100 group-focus-within/toc:translate-x-0 group-focus-within/toc:pointer-events-auto transition-all duration-300 ease-out">
        <div className="bg-background/85 backdrop-blur-md border border-border/60 rounded-lg shadow-xl p-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Contents
            </p>
            <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
              {pad(activeIndex + 1)} / {pad(total)}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative w-[2px] shrink-0 bg-border/60 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full bg-[hsl(var(--prose-anchor))] transition-[height] duration-150 ease-out"
                style={{ height: `${progress}%` }}
              />
            </div>

            <ol className="flex-1 space-y-2 list-none m-0 p-0">
              {items.map((item, i) => {
                const isActive = activeId === item.id;
                return (
                  <li key={item.id} className="m-0 p-0">
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleClick(e, item.id)}
                      className={`group flex gap-2.5 items-baseline text-xs leading-snug transition-all ${
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] tracking-wider shrink-0 transition-colors ${
                          isActive
                            ? "text-[hsl(var(--prose-anchor))]"
                            : "text-muted-foreground/60 group-hover:text-foreground/70"
                        }`}
                      >
                        {pad(i + 1)}
                      </span>
                      <span
                        className={`flex-1 transition-all ${
                          isActive ? "font-semibold" : "font-normal"
                        } ${item.level === 3 ? "pl-3" : ""}`}
                      >
                        {item.text}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </nav>
  );
}
