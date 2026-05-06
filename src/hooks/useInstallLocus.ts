import { useEffect, useState, useCallback } from "react";
import { track } from "@/lib/analytics";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "locus_install_dismissed_at";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

// Module-scoped so the captured beforeinstallprompt event is shared across
// every consumer (floating pill + profile menu item). The event can only be
// captured once per page load, so multiple listeners would otherwise miss it.
let cachedPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
let listenerInstalled = false;

function notify() {
  listeners.forEach((l) => l());
}

function ensureGlobalListeners() {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    cachedPrompt = null;
    void track("app_installed");
    notify();
  });
}

export type InstallPlatform = "android" | "ios" | "other";

export interface InstallApi {
  /** True if the app is already running as an installed PWA. */
  isInstalled: boolean;
  /** True if we can trigger an install (Android prompt captured OR iOS Safari). */
  canInstall: boolean;
  platform: InstallPlatform;
  /**
   * Trigger install. Returns:
   * - "prompted" — native Android prompt fired
   * - "ios" — caller should show iOS instructions UI
   * - "unsupported" — caller should show "open on your phone" message
   */
  triggerInstall: () => Promise<"prompted" | "ios" | "unsupported">;
  /** Mark the floating pill as dismissed (7-day cooldown). */
  markDismissed: () => void;
}

export function useInstallLocus(): InstallApi {
  const [, force] = useState(0);

  useEffect(() => {
    ensureGlobalListeners();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const isIos = detectIOS();
  const platform: InstallPlatform = cachedPrompt
    ? "android"
    : isIos
      ? "ios"
      : "other";
  const isInstalled = installed || isStandalone();
  const canInstall = !isInstalled && (cachedPrompt !== null || isIos);

  const triggerInstall = useCallback(async () => {
    if (cachedPrompt) {
      void track("install_prompt_clicked", { platform: "android" });
      try {
        await cachedPrompt.prompt();
        const choice = await cachedPrompt.userChoice;
        void track(
          choice.outcome === "accepted"
            ? "install_outcome_accepted"
            : "install_outcome_dismissed",
          { platform: "android" }
        );
      } catch {
        /* noop */
      }
      cachedPrompt = null;
      notify();
      return "prompted" as const;
    }
    if (isIos) {
      void track("install_prompt_clicked", { platform: "ios" });
      return "ios" as const;
    }
    return "unsupported" as const;
  }, [isIos]);

  const markDismissed = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
  }, []);

  return { isInstalled, canInstall, platform, triggerInstall, markDismissed };
}
