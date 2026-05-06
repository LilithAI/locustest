import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { TourProvider, useTour } from "./TourProvider";
import WelcomeModal from "./WelcomeModal";
import { APP_TOUR_STEPS } from "./appTourSteps";
import { useAuthSession } from "@/hooks/useAuthSession";

const STORAGE_PREFIX = "locus_tour_completed_v1:";

declare global {
  interface Window {
    __locusReplayTour?: () => void;
  }
}

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

function hasCompleted(uid: string | null): boolean {
  if (!uid) return true;
  try {
    return !!localStorage.getItem(storageKey(uid));
  } catch {
    return true;
  }
}

function markCompleted(uid: string | null) {
  if (!uid) return;
  try {
    localStorage.setItem(storageKey(uid), "1");
  } catch {
    /* noop */
  }
}

function clearCompleted(uid: string | null) {
  if (!uid) return;
  try {
    localStorage.removeItem(storageKey(uid));
  } catch {
    /* noop */
  }
}

function AppTourInner({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { userId, ready } = useAuthSession();
  const { start } = useTour();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const triggeredForUser = useRef<string | null>(null);

  // Auto-trigger on first visit to /app for an authed user
  useEffect(() => {
    if (!ready || !userId) return;
    if (pathname !== "/app") return;
    if (triggeredForUser.current === userId) return;
    if (hasCompleted(userId)) {
      triggeredForUser.current = userId;
      return;
    }
    triggeredForUser.current = userId;
    // Let /app's data fetch settle so anchor elements are mounted
    const t = window.setTimeout(() => setWelcomeOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [pathname, userId, ready]);

  const beginTour = useCallback(() => {
    setWelcomeOpen(false);
    // tiny delay so the modal close animation doesn't overlap measurements
    window.setTimeout(() => start(APP_TOUR_STEPS), 150);
  }, [start]);

  const handleWelcomeClose = useCallback(() => {
    setWelcomeOpen(false);
    markCompleted(userId);
  }, [userId]);

  // Expose a global replay trigger for ProfileMenu (avoids prop drilling
  // through the Layout / outlet boundary)
  useEffect(() => {
    window.__locusReplayTour = () => {
      clearCompleted(userId);
      setWelcomeOpen(false);
      // Replay users skip the welcome carousel
      window.setTimeout(() => start(APP_TOUR_STEPS), 50);
    };
    return () => {
      if (window.__locusReplayTour) delete window.__locusReplayTour;
    };
  }, [userId, start]);

  return (
    <>
      {children}
      <WelcomeModal
        open={welcomeOpen}
        onClose={handleWelcomeClose}
        onStartTour={beginTour}
      />
    </>
  );
}

export default function AppTour({ children }: { children: ReactNode }) {
  const { userId } = useAuthSession();

  const handleFinish = useCallback(() => {
    markCompleted(userId);
  }, [userId]);

  const handleSkip = useCallback(() => {
    markCompleted(userId);
  }, [userId]);

  return (
    <TourProvider onFinish={handleFinish} onSkip={handleSkip}>
      <AppTourInner>{children}</AppTourInner>
    </TourProvider>
  );
}
