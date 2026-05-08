import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { tryRecoverFromChunkError } from "./lib/chunkRecovery";

// Catch chunk-load failures that escape React's render tree (e.g. prefetches
// fired on hover, or background imports). Triggers a single cache-busting
// reload — see `lib/chunkRecovery.ts` for the loop guard.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (tryRecoverFromChunkError(event.reason)) {
      event.preventDefault();
    }
  });
  window.addEventListener("error", (event) => {
    if (tryRecoverFromChunkError(event.error)) {
      event.preventDefault();
    }
  });
}

// Fire pwa_session_start once when the app boots in standalone (installed) mode.
try {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) {
    // Lazy import to avoid blocking initial render
    void import("./lib/analytics").then((m) => m.track("pwa_session_start"));
  }
} catch {
  /* noop */
}

createRoot(document.getElementById("root")!).render(<App />);
