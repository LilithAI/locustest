import { useState, useEffect, useRef } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Home,
  Building2,
  Briefcase,
  BookOpen,
  Library,
  Wrench,
  Gavel,
  Search,
  Send,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { prefetchRoute } from "@/lib/prefetch";
import { useCommandPalette } from "@/components/search/useCommandPalette";
import { useAuthSession } from "@/hooks/useAuthSession";

type NavItem = { to: string; label: string; icon: LucideIcon };

// The Home item's `to` is overridden at render-time to `/app` for logged-in
// users so tapping Home from any other route goes straight to the dashboard
// instead of flashing the marketing page through the deferred-redirect path.
const ALL_NAV: NavItem[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/directory", icon: Building2, label: "Directory" },
  { to: "/opportunities", icon: Briefcase, label: "Opportunities" },
  { to: "/playbook", icon: BookOpen, label: "Playbook" },
  { to: "/resources", icon: Library, label: "Resources" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/the-bar", icon: Gavel, label: "The Bar" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MORPH_SPRING = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 };
const IDLE_MS = 4500;

type ContextAction = "join" | "log" | null;

function getContextAction(pathname: string, scrolledPastHero: boolean): ContextAction {
  if (pathname === "/") return scrolledPastHero ? "join" : null;
  if (pathname.startsWith("/app") || pathname.startsWith("/applications")) return "log";
  return null;
}

function getActiveKey(pathname: string, homeHref: string): string {
  // Home pill should highlight on both `/` and `/app` (the auth-aware target).
  if (pathname === "/" || pathname.startsWith("/app")) return homeHref;
  const match = ALL_NAV.find((n) => n.to !== "/" && pathname.startsWith(n.to));
  return match?.to ?? homeHref;
}

export default function MobileBottomDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { setOpen: setSearchOpen } = useCommandPalette();
  const { userId } = useAuthSession();

  const homeHref = userId ? "/app" : "/";
  const navItems: NavItem[] = ALL_NAV.map((n) =>
    n.label === "Home" ? { ...n, to: homeHref } : n,
  );

  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [hasCompareBar, setHasCompareBar] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const idleTimer = useRef<number | null>(null);
  const resetIdle = () => {
    setCollapsed(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > window.innerHeight * 0.55);
      setCollapsed(false);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
    };
    onScroll();
    idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    setCollapsed(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setCollapsed(true), IDLE_MS);
  }, [pathname]);

  // Prefetch /app the moment we know the user is authenticated, so tapping
  // Home (now retargeted to /app) doesn't hit the lazy-load skeleton.
  useEffect(() => {
    if (userId) prefetchRoute("/app");
  }, [userId]);

  useEffect(() => {
    const check = () => setHasCompareBar(!!document.querySelector('[data-compare-bar="true"]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.("[data-morph-dock]")) return;
      const tag = t.tagName;
      const editable = (t as HTMLElement).isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) setInputFocused(true);
    };
    const onFocusOut = () => setInputFocused(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  if (pathname.startsWith("/dock-lab")) return null;
  if (hasCompareBar) return null;

  const contextAction = getContextAction(pathname, scrolledPastHero);
  const activeKey = getActiveKey(pathname, homeHref);
  const activeItem = navItems.find((n) => n.to === activeKey) ?? navItems[0];
  const ActiveIcon = activeItem.icon;

  const hidden = inputFocused || (pathname === "/" && !scrolledPastHero);

  const handleContextAction = () => {
    if (contextAction === "log") {
      window.dispatchEvent(new CustomEvent("open-log-application"));
      resetIdle();
      return;
    }
    if (contextAction === "join") {
      const target = document.getElementById("waitlist");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else void navigate({ to: "/waitlist" });
      resetIdle();
    }
  };

  const handleSearch = () => {
    setSearchOpen(true);
    resetIdle();
  };

  return (
    <AnimatePresence>
      {!hidden && (
        <LayoutGroup>
          <motion.nav
            key="dock"
            data-morph-dock
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed bottom-5 left-0 right-0 z-40 px-4 flex items-end justify-center gap-2 pointer-events-none md:hidden"
          >
            {/* LEFT pill — nav */}
            <motion.div
              layout
              transition={MORPH_SPRING}
              onClick={() => collapsed && resetIdle()}
              data-tour="opportunities-nav-mobile"
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
                      {activeItem.label}
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
                    {navItems.map(({ to, label, icon: Icon }) => {
                      const isActive = activeKey === to;
                      return (
                        <Link
                          key={to}
                          to={to as never}
                          aria-label={label}
                          onTouchStart={() => prefetchRoute(to)}
                          onMouseEnter={() => prefetchRoute(to)}
                          onClick={(e) => {
                            e.stopPropagation();
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
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* RIGHT — universal Search + optional contextual action */}
            <motion.div
              layout
              transition={MORPH_SPRING}
              className="pointer-events-auto flex items-center gap-1.5"
            >
              {/* Search is ALWAYS available */}
              <button
                type="button"
                onClick={handleSearch}
                aria-label="Search"
                data-tour="search-mobile"
                style={{ WebkitBackdropFilter: "blur(24px) saturate(160%)" }}
                className="w-12 h-12 flex items-center justify-center bg-background/55 backdrop-blur-2xl backdrop-saturate-150 border-2 border-foreground/70 rounded-full shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.18),0_8px_32px_-8px_hsl(var(--accent)/0.35),3px_3px_0_0_hsl(var(--accent))] active:translate-x-[1px] active:translate-y-[1px] transition-transform"
              >
                <Search size={18} strokeWidth={2.2} className="text-foreground" />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                {contextAction && (
                  <motion.button
                    key={`${pathname}-${contextAction}`}
                    type="button"
                    onClick={handleContextAction}
                    initial={{ opacity: 0, y: 6, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.94 }}
                    transition={{ duration: 0.16, ease: EASE }}
                    aria-label={contextAction === "join" ? "Join" : "Log"}
                    style={{ WebkitBackdropFilter: "blur(20px) saturate(180%)" }}
                    className="flex items-center gap-1.5 h-12 px-3.5 bg-accent/80 backdrop-blur-xl backdrop-saturate-150 text-foreground border-2 border-foreground/70 rounded-full shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),0_8px_28px_-8px_hsl(var(--accent)/0.6),3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] transition-transform"
                  >
                    {contextAction === "join" ? <Send size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                    <span className="font-sora text-xs font-bold">
                      {contextAction === "join" ? "Join" : "Log"}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.nav>
        </LayoutGroup>
      )}
    </AnimatePresence>
  );
}
