import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";
import { track } from "@/lib/analytics";
import { useInstallLocus } from "@/hooks/useInstallLocus";

const DISMISS_KEY = "locus_install_dismissed_at";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Floating "Install Locus" pill.
 *
 * - Android/Chromium: captures `beforeinstallprompt`, tap → native prompt.
 * - iOS Safari: shows after 4s with Add-to-Home-Screen instructions card.
 * - Hidden when installed, dismissed (7d cooldown), CompareBar visible,
 *   or input focused (keyboard up). Sits above the mobile dock.
 */
export default function InstallLocusButton() {
  const { isInstalled, canInstall, platform, triggerInstall, markDismissed } = useInstallLocus();
  const iosMode = platform === "ios";
  const [visible, setVisible] = useState(false);
  const [iosCardOpen, setIosCardOpen] = useState(false);
  const [hasCompareBar, setHasCompareBar] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastScrollY = useRef(0);
  const shownRef = useRef(false);

  // Show pill when an install path is available
  useEffect(() => {
    if (isInstalled || recentlyDismissed()) return;
    if (!canInstall) return;
    if (iosMode) {
      const t = window.setTimeout(() => {
        setVisible(true);
        if (!shownRef.current) {
          shownRef.current = true;
          void track("install_prompt_shown", { platform: "ios" });
        }
      }, 4000);
      return () => window.clearTimeout(t);
    }
    setVisible(true);
    if (!shownRef.current) {
      shownRef.current = true;
      void track("install_prompt_shown", { platform: "android" });
    }
  }, [canInstall, isInstalled, iosMode]);

  // Hide alongside CompareBar (mirrors dock)
  useEffect(() => {
    const check = () =>
      setHasCompareBar(!!document.querySelector('[data-compare-bar="true"]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Hide when keyboard up (mirrors dock)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.("[data-install-pill]")) return;
      const tag = t.tagName;
      const editable = t.isContentEditable;
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

  // Fade on scroll-down, return on scroll-up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY.current;
      if (Math.abs(dy) > 8) {
        setScrollHidden(dy > 0 && y > 120);
        lastScrollY.current = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleInstall = useCallback(async () => {
    const result = await triggerInstall();
    if (result === "ios") {
      setIosCardOpen((v) => !v);
      return;
    }
    setVisible(false);
  }, [triggerInstall]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    void track("install_prompt_dismissed", { platform: iosMode ? "ios" : "android" });
    markDismissed();
    setVisible(false);
    setIosCardOpen(false);
  }, [iosMode, markDismissed]);

  const shouldShow = visible && !hasCompareBar && !inputFocused && !scrollHidden;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="install-pill"
          data-install-pill
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.94 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="fixed bottom-24 inset-x-0 z-30 px-4 flex justify-center pointer-events-none md:hidden"
          role="region"
          aria-label="Install Locus"
        >
          <div className="pointer-events-auto flex flex-col items-center gap-2 w-full max-w-[calc(100vw-2rem)]">
            {/* iOS instructions card */}
            <AnimatePresence>
              {iosCardOpen && iosMode && (
                <motion.div
                  key="ios-card"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="bg-background border-2 border-foreground rounded-2xl px-4 py-3 shadow-[4px_4px_0_0_hsl(var(--accent))] max-w-[280px]"
                >
                  <div className="font-sora font-bold text-sm text-foreground mb-2">
                    Install Loc<span className="text-accent">us</span> on iPhone
                  </div>
                  <ol className="space-y-1.5 text-muted-foreground font-inter text-xs leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground shrink-0">1.</span>
                      <span className="flex items-center flex-wrap gap-1.5">
                        <span>Tap</span>
                        <Share size={14} strokeWidth={2.4} className="text-accent" />
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground shrink-0">2.</span>
                      <span>Scroll down → tap <span className="font-medium text-foreground">View More</span></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground shrink-0">3.</span>
                      <span className="flex items-center flex-wrap gap-1.5">
                        <span>Tap</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-foreground/40 rounded">
                          <Plus size={11} strokeWidth={2.6} />
                          <span className="font-medium">Add to Home Screen</span>
                        </span>
                      </span>
                    </li>
                  </ol>
                  <div className="mt-2 pt-2 border-t border-foreground/10 text-muted-foreground/80 font-inter text-[11px] leading-snug">
                    Give it a second — iPhone fetches the icon after you tap Add.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pill: main button + sibling X chip — siblings, never nested */}
            <div
              className="inline-flex items-center gap-1 h-11 pl-1 pr-1 bg-accent text-foreground border-2 border-foreground rounded-full shadow-[3px_3px_0_0_hsl(var(--foreground))] max-w-full"
            >
              <button
                type="button"
                onClick={handleInstall}
                aria-label={iosMode ? "How to install Locus" : "Install Locus"}
                className="flex items-center gap-2 h-full pl-3 pr-3 rounded-full font-sora text-xs font-bold uppercase tracking-wide active:translate-x-[1px] active:translate-y-[1px] transition-transform min-w-0"
              >
                <Download size={15} strokeWidth={2.6} className="shrink-0" />
                <span className="truncate">
                  Install Loc<span className="opacity-70">us</span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="relative shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-foreground/15 hover:bg-foreground/25 active:bg-foreground/30 transition-colors before:absolute before:inset-[-8px] before:content-['']"
              >
                <X size={14} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
