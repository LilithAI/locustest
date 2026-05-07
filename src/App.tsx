import { lazy, Suspense, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

// Run once before React mounts: if we landed on the legacy
// `locuslegal.lovable.app` host (e.g. an old OAuth redirect), bounce to the
// canonical `locus.legal` domain so the user's persisted session is visible.
// Without this the auth token in localStorage on locus.legal is invisible to
// the lovable.app subdomain and the user appears signed out.
if (typeof window !== "undefined") {
  const h = window.location.hostname;
  if (h === "locuslegal.lovable.app") {
    const target = "https://locus.legal" + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
  }
}
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import RouteSkeleton from "./components/RouteSkeleton";
import Unsubscribe from "./pages/Unsubscribe";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { routeImports, prefetchCommonRoutes } from "@/lib/prefetch";
import { CommandPaletteProvider } from "@/components/search/useCommandPalette";
import CommandPalette from "@/components/search/CommandPalette";
import SearchFab from "@/components/search/SearchFab";

// Lazy-load every non-landing route so the home page ships only what it needs.
// All importers live in `lib/prefetch.ts` so hover/idle prefetching shares the
// exact same module promise as React.lazy() — chunks are downloaded only once.
const Waitlist = lazy(routeImports.waitlist as never);
const Directory = lazy(routeImports.directory as never);
const FirmProfile = lazy(routeImports.firmProfile as never);
const Resources = lazy(routeImports.resources as never);
const Playbook = lazy(routeImports.playbook as never);
const PlaybookGuide = lazy(routeImports.playbookGuide as never);
const Tools = lazy(routeImports.tools as never);
const CvAnalyser = lazy(routeImports.cvAnalyser as never);
const TheBar = lazy(routeImports.theBar as never);
const AppHome = lazy(routeImports.appHome as never);
const TheBarPreview = lazy(routeImports.theBarPreview as never);
const TheBarBrowse = lazy(routeImports.theBarBrowse as never);
const TheBarChallenge = lazy(routeImports.theBarChallenge as never);
const TheBarHistory = lazy(routeImports.theBarHistory as never);
const TheBarLeaderboard = lazy(routeImports.theBarLeaderboard as never);
const Auth = lazy(routeImports.auth as never);
const ResetPassword = lazy(routeImports.resetPassword as never);
const ChooseUsername = lazy(routeImports.chooseUsername as never);
const ProfileEdit = lazy(routeImports.profileEdit as never);
const PublicProfile = lazy(routeImports.publicProfile as never);
const AdminWaitlist = lazy(routeImports.adminWaitlist as never);
const AdminBar = lazy(routeImports.adminBar as never);
const AdminBeta = lazy(routeImports.adminBeta as never);

const AdminVacancies = lazy(routeImports.adminVacancies as never);
const AdminDashboard = lazy(routeImports.adminDashboard as never);
const AdminFirmSuggestions = lazy(routeImports.adminFirmSuggestions as never);
const AdminBroadcasts = lazy(routeImports.adminBroadcasts as never);
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ApplicationTracker = lazy(routeImports.applicationTracker as never);
const BetaChecklist = lazy(routeImports.betaChecklist as never);
const BetaRound2 = lazy(routeImports.betaRound2 as never);
const NotFound = lazy(routeImports.notFound as never);
const DockLab = lazy(() => import("./pages/DockLab"));
const TourLab = lazy(() => import("./pages/TourLab"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const AdminOpportunities = lazy(() => import("./pages/AdminOpportunities"));
const AdminAdmins = lazy(() => import("./pages/AdminAdmins"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Treat data as fresh for 30s — eliminates the burst of refetches
      // that fire whenever a page remounts during navigation.
      staleTime: 30_000,
      // Keep cached data around for 5 minutes after last use, so back/forward
      // navigation pulls from cache instead of re-querying Supabase.
      gcTime: 5 * 60_000,
      // Tab-switching back into the app shouldn't blast the network.
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
    },
  },
});

const VersionWatcher = () => {
  useVersionCheck(() => {
    const hardReload = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("v", Date.now().toString());
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };
    toast("New version of Locus available", {
      description: "Refresh to get the latest updates.",
      duration: Infinity,
      action: {
        label: "Refresh",
        onClick: hardReload,
      },
    });
  });
  return null;
};

const IdlePrefetcher = () => {
  useEffect(() => {
    prefetchCommonRoutes();
  }, []);
  return null;
};

// Defensive: when the tab becomes visible after a long gap, proactively
// refresh the auth session so a returning user never sees a flicker of
// signed-out UI before autoRefresh catches up.
const SessionKeepAlive = () => {
  useEffect(() => {
    let lastRefresh = Date.now();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      // Only refresh if it's been >12h since the last refresh attempt.
      if (now - lastRefresh < 12 * 60 * 60 * 1000) return;
      lastRefresh = now;
      void supabase.auth.refreshSession().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return null;
};

// Re-fires Meta Pixel PageView on every client-side route change. The base
// snippet in index.html only tracks the initial hard load; SPA navigations
// need a manual fbq() call so retargeting + conversion attribution works.
const MetaPixelTracker = () => {
  const location = useLocation();
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [location.pathname, location.search]);
  return null;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VersionWatcher />
        <IdlePrefetcher />
        <SessionKeepAlive />
        <BrowserRouter>
          <MetaPixelTracker />
          <CommandPaletteProvider>
            <Suspense fallback={<RouteSkeleton />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/app" element={<AppHome />} />
                  <Route path="/waitlist" element={<Waitlist />} />
                  <Route path="/directory" element={<Directory />} />
                  <Route path="/directory/firm/:slug" element={<FirmProfile />} />
                  <Route path="/playbook" element={<Playbook />} />
                  <Route path="/playbook/:slug" element={<PlaybookGuide />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/tools/cv-analyser" element={<CvAnalyser />} />
                  <Route path="/the-bar" element={<TheBar />} />
                  <Route path="/the-bar/preview" element={<TheBarPreview />} />
                  <Route path="/the-bar/browse" element={<TheBarBrowse />} />
                  <Route path="/the-bar/challenge/:id" element={<TheBarChallenge />} />
                  <Route path="/the-bar/history" element={<TheBarHistory />} />
                  <Route path="/the-bar/leaderboard" element={<TheBarLeaderboard />} />
                  <Route path="/applications" element={<ApplicationTracker />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="waitlist" element={<AdminWaitlist />} />
                    <Route path="bar" element={<AdminBar />} />
                    <Route path="beta" element={<AdminBeta />} />
                    <Route path="vacancies" element={<Navigate to="/admin/opportunities" replace />} />
                    <Route path="opportunities" element={<AdminOpportunities />} />
                    <Route path="firm-suggestions" element={<AdminFirmSuggestions />} />
                    <Route path="broadcasts" element={<AdminBroadcasts />} />
                    <Route path="admins" element={<AdminAdmins />} />
                    <Route path="insights" element={<AdminInsights />} />
                  </Route>
                  <Route path="/vacancies" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/opportunities-preview" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/dock-lab" element={<DockLab />} />
                  <Route path="/tour-lab" element={<TourLab />} />
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/choose-username" element={<ChooseUsername />} />
                <Route path="/beta" element={<BetaChecklist />} />
                <Route path="/beta/round-2" element={<BetaRound2 />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CommandPalette />
            <SearchFab />
          </CommandPaletteProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
