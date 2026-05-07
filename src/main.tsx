import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
