import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RotatingHero from "@/components/home/RotatingHero";
import FeatureBento from "@/components/home/FeatureBento";
import AudienceMiniRow from "@/components/home/AudienceMiniRow";
import FinalCTA from "@/components/home/FinalCTA";
import { usePageMeta } from "@/hooks/usePageMeta";
import { prefetchRoute } from "@/lib/prefetch";

/**
 * The home page is a public marketing landing — anonymous visitors are the
 * vast majority of first-time loads. We deliberately keep all Supabase code
 * out of the critical render path so the supabase chunk (~42 KiB raw) never
 * lands in the home bundle.
 *
 * The "redirect already-logged-in users to /app" behavior is preserved, but
 * delayed: it runs only after the page goes idle. The auth hook (which pulls
 * the supabase client) is dynamically imported there.
 */
const Index = () => {
  usePageMeta({
    title: "Locus — Everything a Law Student in India Actually Needs",
    description:
      "Directory of 3,890+ firms, daily skill challenges, templates, tools, and a tracker. The merit-first platform for India's law students.",
    path: "/",
  });

  return (
    <>
      <RotatingHero />
      <FeatureBento />
      <AudienceMiniRow />
      <FinalCTA />
      <DeferredAuthRedirect />
    </>
  );
};

export default Index;

/* ------------------------------------------------------------------ */
/* Deferred auth check                                                 */
/* ------------------------------------------------------------------ */
/**
 * Three-stage gate so the supabase chunk is NOT included in the home page's
 * critical bundle:
 *   1. <DeferredAuthRedirect/> renders nothing on first paint.
 *   2. After requestIdleCallback fires (or 2.5s timeout), it dynamically
 *      imports useAuthSession and mounts <AuthRedirectInner/>.
 *   3. <AuthRedirectInner/> runs the hook and navigates to /app if a session
 *      exists. Anonymous visitors hit step 2 and idle there harmlessly.
 *
 * Same pattern as AdminNavLink.tsx — proven to keep supabase out of the
 * home chunk while still preserving the behavior for returning users.
 */
function DeferredAuthRedirect() {
  const [Hook, setHook] = useState<null | (() => { ready: boolean; userId: string | null })>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      import("@/hooks/useAuthSession").then((m) => {
        if (!cancelled) {
          setHook(() => m.useAuthSession as () => { ready: boolean; userId: string | null });
        }
      });
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    let timerId: number | null = null;
    if (ric) {
      ric(load, { timeout: 4000 });
    } else {
      timerId = window.setTimeout(load, 2500);
    }

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, []);

  if (!Hook) return null;
  return <AuthRedirectInner Hook={Hook} />;
}

function AuthRedirectInner({
  Hook,
}: {
  Hook: () => { ready: boolean; userId: string | null };
}) {
  const navigate = useNavigate();
  const { ready, userId } = Hook();

  useEffect(() => {
    if (ready && userId) {
      // Prefetch /app's chunk before navigating so the redirect doesn't
      // dump the user on a blank Suspense fallback. prefetchRoute shares its
      // module promise with React.lazy — no duplicate downloads.
      prefetchRoute("/app");
      navigate("/app", { replace: true });
    }
  }, [ready, userId, navigate]);

  return null;
}
