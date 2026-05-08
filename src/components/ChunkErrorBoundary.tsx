import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  tryRecoverFromChunkError,
  isChunkLoadError,
  resetReloadAttempts,
} from "@/lib/chunkRecovery";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  reloading: boolean;
}

/**
 * Catches errors thrown inside the lazy-route <Suspense> tree.
 *
 * Stale chunk-load failures trigger a cache-busting hard reload (capped at
 * 2 per session via chunkRecovery). When the reload limit is reached, we
 * render a styled fallback with a manual Reload button instead of a blank
 * screen. Non-chunk errors render the same branded fallback.
 */
export default class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, reloading: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error)) {
      const triggered = tryRecoverFromChunkError(error);
      if (triggered) {
        // Hard reload is in flight — show a "Reloading…" placeholder so the
        // user doesn't see a blank screen during the navigation.
        this.setState({ reloading: true });
      }
      return;
    }
    // Real bug — log it so we can see it in the browser console / error reporter.
    console.error("[ChunkErrorBoundary]", error, info);
  }

  private handleReload = () => {
    // Give the user a fresh quota of automatic reload attempts.
    resetReloadAttempts();
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("v", Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    // Reload is in flight — show a minimal placeholder, not blank.
    if (reloading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-sm text-muted-foreground font-mono">
            Loading latest version…
          </div>
        </div>
      );
    }

    const chunkErr = isChunkLoadError(error);

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="border-2 border-border bg-card p-6 max-w-md w-full shadow-[3px_3px_0_0_hsl(var(--border))] space-y-4">
          <h1 className="font-heading text-xl font-bold">
            {chunkErr ? "New version available" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {chunkErr
              ? "This page couldn't load because the app was updated. Reload to get the latest version."
              : "This page hit an unexpected error. Reloading usually fixes it."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="border-2 border-border bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0_hsl(var(--border))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_hsl(var(--border))] transition-transform"
            >
              Reload
            </button>
            <a
              href="/"
              className="text-sm font-medium underline underline-offset-4 hover:text-foreground text-muted-foreground"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
