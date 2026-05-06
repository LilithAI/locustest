import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, Send, Plus, X, Slash } from "lucide-react";
import { NAV_ITEMS } from "../shared/navItems";

type MorphState = "hidden" | "pill" | "split" | "search" | "orb";

const STATES: { key: MorphState; label: string; hint: string }[] = [
  { key: "hidden", label: "Hidden", hint: "Hero in view" },
  { key: "pill", label: "Pill", hint: "Browsing" },
  { key: "split", label: "Split", hint: "Convert" },
  { key: "search", label: "Search", hint: "Directory" },
  { key: "orb", label: "Orb", hint: "Practice" },
];

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const DURATION = 0.32;

export default function MorphDock() {
  const [state, setState] = useState<MorphState>("pill");
  const [orbOpen, setOrbOpen] = useState(false);

  return (
    <>
      {/* Sandbox-only morph state toggle */}
      <div className="fixed bottom-28 left-4 right-4 z-40 flex flex-wrap justify-center gap-2">
        {STATES.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setState(s.key);
              setOrbOpen(false);
            }}
            className={`px-2.5 py-1 text-[11px] font-sora border-2 border-foreground transition-all ${
              state === s.key
                ? "bg-accent text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
            <span className="ml-1.5 text-[9px] font-mono opacity-60">{s.hint}</span>
          </button>
        ))}
      </div>

      <LayoutGroup>
        {/* Orb scrim — outside the morph container so it doesn't fight layout */}
        <AnimatePresence>
          {state === "orb" && orbOpen && (
            <motion.button
              key="scrim"
              aria-label="Close menu"
              onClick={() => setOrbOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-background/40 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state !== "hidden" && (
            <motion.div
              key="morph-anchor"
              className="fixed bottom-5 z-40 pointer-events-none"
              initial={{ opacity: 0, y: 24 }}
              animate={{
                opacity: 1,
                y: 0,
                left: state === "orb" ? "auto" : "1rem",
                right: state === "orb" ? "1.5rem" : "1rem",
                justifyContent: state === "orb" ? "flex-end" : "center",
              }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: DURATION, ease: EASE }}
              style={{ display: "flex" }}
            >
              {/* The morphing dock body */}
              <motion.div
                layout
                transition={{ duration: DURATION, ease: EASE }}
                className={`pointer-events-auto bg-background border-2 border-foreground overflow-hidden ${
                  state === "orb"
                    ? "shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                    : "shadow-[3px_3px_0_0_hsl(var(--accent))]"
                }`}
                style={{
                  borderRadius: state === "orb" ? 9999 : state === "search" ? 9999 : 9999,
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {state === "pill" && <PillContents key="pill" />}
                  {state === "split" && <SplitContents key="split" />}
                  {state === "search" && <SearchContents key="search" />}
                  {state === "orb" && (
                    <OrbContents
                      key="orb"
                      open={orbOpen}
                      onToggle={() => setOrbOpen((v) => !v)}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </>
  );
}

// ---------- Sub-states ----------

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { delay: 0.12, duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function PillContents() {
  const [active, setActive] = useState("home");
  return (
    <motion.div {...fade} className="flex items-center gap-3 px-4 py-2.5">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            aria-label={label}
            onClick={() => setActive(key)}
            className="relative w-9 h-9 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.8}
              className={isActive ? "text-accent" : "text-muted-foreground"}
            />
            {isActive && <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent" />}
          </button>
        );
      })}
    </motion.div>
  );
}

function SplitContents() {
  const [active, setActive] = useState("home");
  const navs = NAV_ITEMS.slice(0, 3);
  return (
    <motion.div {...fade} className="flex items-center gap-2 pl-2 pr-1.5 py-1.5">
      {navs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            aria-label={label}
            onClick={() => setActive(key)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
              isActive ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
          </button>
        );
      })}
      <span className="w-px h-6 bg-foreground/30 mx-0.5" />
      <button className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-accent text-foreground active:translate-x-[1px] active:translate-y-[1px] transition-transform">
        <Send size={14} strokeWidth={2.5} />
        <span className="font-sora text-xs font-bold">Join</span>
      </button>
    </motion.div>
  );
}

function SearchContents() {
  return (
    <motion.div {...fade} className="flex items-center gap-2.5 px-4 py-3 min-w-[280px]">
      <Search size={16} className="text-foreground shrink-0" />
      <input
        placeholder="Search firms, cities, PQE…"
        className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground font-inter"
      />
      <span className="flex items-center justify-center w-5 h-5 border border-foreground text-foreground font-mono text-[10px]">
        <Slash size={10} strokeWidth={2.5} />
      </span>
    </motion.div>
  );
}

function OrbContents({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const radius = 95;
  const startAngle = 180;
  const endAngle = 270;
  const step = (endAngle - startAngle) / (NAV_ITEMS.length - 1);

  return (
    <motion.div {...fade} className="relative w-14 h-14">
      {/* Fan-out icons */}
      {NAV_ITEMS.map(({ key, label, icon: Icon }, i) => {
        const angle = (startAngle + step * i) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.button
            key={key}
            aria-label={label}
            initial={false}
            animate={{
              x: open ? x : 0,
              y: open ? y : 0,
              scale: open ? 1 : 0,
              opacity: open ? 1 : 0,
            }}
            transition={{
              duration: 0.28,
              ease: EASE,
              delay: open ? i * 0.025 : (NAV_ITEMS.length - i) * 0.018,
            }}
            className="absolute inset-0 m-auto w-11 h-11 flex items-center justify-center rounded-full bg-background border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
          >
            <Icon size={18} className="text-foreground" />
          </motion.button>
        );
      })}
      {/* FAB */}
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={onToggle}
        className="absolute inset-0 m-auto w-14 h-14 flex items-center justify-center rounded-full bg-accent text-foreground active:translate-x-[1px] active:translate-y-[1px] transition-transform"
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          style={{ display: "flex" }}
        >
          {open ? <X size={22} strokeWidth={2.5} /> : <Plus size={22} strokeWidth={2.5} />}
        </motion.span>
      </button>
    </motion.div>
  );
}
