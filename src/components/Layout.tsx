import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BetaBanner from "./BetaBanner";
import LaunchBanner from "./LaunchBanner";
import AppTour from "./tour/AppTour";
import { useTrackPageViews } from "@/hooks/useTrackPageViews";

// Defer the mobile dock — it's a fixed-position overlay that only appears on
// scroll, so it doesn't need to be in the home-page critical bundle.
const MobileBottomDock = lazy(() => import("./MobileBottomDock"));
const InstallLocusButton = lazy(() => import("./InstallLocusButton"));

export default function Layout() {
  useTrackPageViews();
  // Auth state is handled by useAuthSession + Auth.tsx directly. We deliberately
  // do NOT attach a global onAuthStateChange listener here: it was firing on
  // every TOKEN_REFRESHED event and racing the profile lookup, occasionally
  // bouncing logged-in users to /choose-username mid-session. The
  // handle_new_user DB trigger guarantees every signup gets a username, so
  // the safety-net query is unnecessary.

  return (
    <AppTour>
      <div className="min-h-screen">
        <LaunchBanner />
        <BetaBanner />
        <Navbar />
        <Outlet />
        <Footer />
        <Suspense fallback={null}>
          <MobileBottomDock />
          <InstallLocusButton />
        </Suspense>
      </div>
    </AppTour>
  );
}
