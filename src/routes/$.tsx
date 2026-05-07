import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Lazy-load the legacy SPA (BrowserRouter inside) so SSR doesn't try to
// execute browser-only code. The hosting layer prerenders the SPA shell for
// every URL via Start's `spa` mode, then this client-only component takes
// over and react-router-dom resolves the actual page.
const App = lazy(() => import("../App"));

export const Route = createFileRoute("/$")({
  component: SpaShell,
});

function SpaShell() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
