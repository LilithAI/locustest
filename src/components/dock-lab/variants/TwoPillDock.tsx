import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Plus, Send, Search, type LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "../shared/navItems";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type ActionKind = "join" | "search" | "log" | "none";

const ACTION_PRESETS: { id: ActionKind; label: string }[] = [
  { id: "join", label: "Home" },
  { id: "search", label: "Directory" },
  { id: "log", label: "App" },
  { id: "none", label: "The Bar / Playbook" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MORPH_SPRING = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };

export default function TwoPillDock() {
  const [activeKey, setActiveKey] = useState("home");
  const [action, setAction] = useState<ActionKind>("log");
  const [collapsed, setCollapsed] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Idle-collapse: pill when stable, expand on activity
  const idleTimer = useRef<number | null>(null);
  const IDLE_MS = 1500;

  const resetIdle = () => {
    setCollapsed(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
  };

  useEffect(() => {
    // Start idle countdown on mount so dock collapses after first paint
    idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
    const onScroll = () => resetIdle();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  const ActiveIcon =
    NAV_ITEMS.find((n) => n.key === activeKey)?.icon ?? NAV_ITEMS[0].icon;

  return (
    <>
      {/* Action preset chips — lab-only control row, sits above the dock */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex gap-1.5 px-2 py-1.5 rounded-full bg-background border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
          {ACTION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setAction(p.id)}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-full transition-colors ${
                action === p.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <LayoutGroup>
        <nav className="fixed bottom-5 left-0 right-0 z-40 px-4 flex items-end justify-center gap-2 pointer-events-none">
          {/* LEFT pill — nav */}
          <motion.div
            layout
            transition={MORPH_SPRING}
            onClick={() => collapsed && resetIdle()}
            style={{ WebkitBackdropFilter: "blur(24px) saturate(160%)" }}
            className={`pointer-events-auto bg-background/55 backdrop-blur-2xl backdrop-saturate-150 border-2 border-foreground/70 rounded-full overflow-hidden shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_8px_32px_-8px_hsl(var(--accent)/0.35),3px_3px_0_0_hsl(var(--accent))] ${
              collapsed ? "cursor-pointer" : ""
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {collapsed ? (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: EASE }}
                  className="flex items-center gap-2 px-4 py-2.5"
                  aria-label="Expand navigation"
                >
                  <ActiveIcon size={18} strokeWidth={2.5} className="text-accent" />
                  <span className="font-sora text-xs font-bold text-foreground">
                    {NAV_ITEMS.find((n) => n.key === activeKey)?.label ?? "Home"}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.04, duration: 0.12, ease: EASE } }}
                  exit={{ opacity: 0, transition: { duration: 0.08, ease: EASE } }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                >
                  {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                    const isActive = activeKey === key;
                    return (
                      <button
                        key={key}
                        aria-label={label}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveKey(key);
                          resetIdle();
                        }}
                        className="relative w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Icon
                          size={20}
                          strokeWidth={isActive ? 2.5 : 1.8}
                          className={isActive ? "text-accent" : "text-muted-foreground"}
                        />
                        {isActive && (
                          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* RIGHT pill — contextual action */}
          <AnimatePresence>
            {action !== "none" && (
              <motion.div
                key={action}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.92 }}
                transition={MORPH_SPRING}
                className="pointer-events-auto"
              >
                <ActionPill kind={action} onSearch={() => setSearchOpen(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </LayoutGroup>

      {/* Search sheet — demo only */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent
          side="bottom"
          className="border-t-2 border-foreground rounded-t-2xl"
        >
          <div className="pt-2 pb-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Search
            </p>
            <div className="flex items-center gap-2 border-2 border-foreground rounded-full px-4 py-3 shadow-[3px_3px_0_0_hsl(var(--accent))]">
              <Search size={16} className="text-foreground shrink-0" />
              <input
                autoFocus
                placeholder="Search firms, cities, PQE…"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground font-inter"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 font-inter">
              Demo only — submission is wired up in the production dock.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ActionPill({
  kind,
  onSearch,
}: {
  kind: ActionKind;
  onSearch: () => void;
}) {
  const meta = getActionMeta(kind);
  if (!meta) return null;
  const Icon = meta.icon;

  if (kind === "search") {
    return (
      <button
        onClick={onSearch}
        aria-label="Search"
        style={{ WebkitBackdropFilter: "blur(24px) saturate(160%)" }}
        className="w-12 h-12 flex items-center justify-center bg-background/55 backdrop-blur-2xl backdrop-saturate-150 border-2 border-foreground/70 rounded-full shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_8px_32px_-8px_hsl(var(--accent)/0.35),3px_3px_0_0_hsl(var(--accent))] active:translate-x-[1px] active:translate-y-[1px] transition-transform"
      >
        <Icon size={18} strokeWidth={2.2} className="text-foreground" />
      </button>
    );
  }

  return (
    <button
      style={{ WebkitBackdropFilter: "blur(20px) saturate(180%)" }}
      className="flex items-center gap-1.5 h-12 px-4 bg-accent/80 backdrop-blur-xl backdrop-saturate-150 text-foreground border-2 border-foreground/70 rounded-full shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),0_8px_28px_-8px_hsl(var(--accent)/0.6),3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] transition-transform"
    >
      <Icon size={14} strokeWidth={2.5} />
      <span className="font-sora text-xs font-bold">{meta.label}</span>
    </button>
  );
}

function getActionMeta(kind: ActionKind): { label: string; icon: LucideIcon } | null {
  switch (kind) {
    case "join":
      return { label: "Join", icon: Send };
    case "log":
      return { label: "Log", icon: Plus };
    case "search":
      return { label: "Search", icon: Search };
    default:
      return null;
  }
}
