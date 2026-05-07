import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./index.css";

// Fire pwa_session_start once when the app boots in standalone (installed) mode.
try {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) {
    void import("./lib/analytics").then((m) => m.track("pwa_session_start"));
  }
} catch {
  /* noop */
}

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
