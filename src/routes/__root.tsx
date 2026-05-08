import { createRootRoute, Outlet, ClientOnly } from "@tanstack/react-router";
import { lazy } from "react";

const App = lazy(() => import("../App"));

export const Route = createRootRoute({
  component: () => (
    <ClientOnly fallback={null}>
      <App />
    </ClientOnly>
  ),
});
