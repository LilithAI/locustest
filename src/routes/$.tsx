// Single catch-all route: mounts the existing react-router-dom App for every
// path. We're using TanStack Start purely as the hosting/build shell so
// Lovable's published hosting serves the SPA shell on deep links instead of
// returning a host-level "Not Found". All actual routing is still handled by
// react-router-dom inside <App />.
import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

export const Route = createFileRoute("/$")({
  component: App,
});
