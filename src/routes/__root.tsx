import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteSkeleton from "@/components/RouteSkeleton";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { prefetchCommonRoutes } from "@/lib/prefetch";
import { CommandPaletteProvider } from "@/components/search/useCommandPalette";
import CommandPalette from "@/components/search/CommandPalette";
import SearchFab from "@/components/search/SearchFab";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";

if (typeof window !== "undefined") {
  const h = window.location.hostname;
  if (h === "locuslegal.lovable.app") {
    const target = "https://locus.legal" + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
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
      action: { label: "Refresh", onClick: hardReload },
    });
  });
  return null;
};

const IdlePrefetcher = () => {
  useEffect(() => { prefetchCommonRoutes(); }, []);
  return null;
};

const SessionKeepAlive = () => {
  useEffect(() => {
    let lastRefresh = Date.now();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < 12 * 60 * 60 * 1000) return;
      lastRefresh = now;
      void supabase.auth.refreshSession().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  return null;
};

const MetaPixelTracker = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [pathname, search]);
  return null;
};

function RootShell() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <VersionWatcher />
          <IdlePrefetcher />
          <SessionKeepAlive />
          <MetaPixelTracker />
          <CommandPaletteProvider>
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
            <CommandPalette />
            <SearchFab />
          </CommandPaletteProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootShell,
  notFoundComponent: () => <NotFound />,
});
