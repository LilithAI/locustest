import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BetaBanner from "@/components/BetaBanner";
import AppTour from "@/components/tour/AppTour";
import RouteSkeleton from "@/components/RouteSkeleton";
import { useTrackPageViews } from "@/hooks/useTrackPageViews";

const MobileBottomDock = lazy(() => import("@/components/MobileBottomDock"));
const InstallLocusButton = lazy(() => import("@/components/InstallLocusButton"));

function RouteTransitionShell() {
  const isPending = useRouterState({
    select: (s) =>
      s.status !== "idle" || s.isLoading || s.isTransitioning,
  });
  if (isPending) return <RouteSkeleton />;
  return <Outlet />;
}

function LayoutRoute() {
  useTrackPageViews();
  return (
    <AppTour>
      <div className="min-h-screen">
        <BetaBanner />
        <Navbar />
        <RouteTransitionShell />
        <Footer />
        <Suspense fallback={null}>
          <MobileBottomDock />
          <InstallLocusButton />
        </Suspense>
      </div>
    </AppTour>
  );
}

export const Route = createFileRoute("/_layout")({
  component: LayoutRoute,
});
