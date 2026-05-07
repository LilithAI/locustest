import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import RouteSkeleton from "./components/RouteSkeleton";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadDelay: 50,
  defaultPendingComponent: RouteSkeleton,
  defaultPendingMs: 0,
  defaultPendingMinMs: 150,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
