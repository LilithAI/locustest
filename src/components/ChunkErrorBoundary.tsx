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
}

/**
 * Catches errors thrown inside the lazy-route <Suspense> tree.
 *
 * Stale chunk-load failures (the #1 cause of post-deploy "Not Found" /
 * blank-screen reports) trigger a single cache-busting hard reload via
 * `tryRecoverFromChunkError`. Any other error renders a small branded
 * fallback so the user is never left staring at an empty page.
 */
export default class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (tryRecoverFromChunkError(error)) {
      // Hard reload is in flight — nothing else to do.
      return;
    }
    // Real bug — log it so we can see it in the browser console / error reporter.
    console.error("[ChunkErrorBoundary]", error, info);
  }

  private handleReload = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("v", Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // If it's a chunk error, the reload is already triggered — render nothing
    // briefly to avoid a flash of fallback before the page navigates away.
    if (isChunkLoadError(error)) return null;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="border-2 border-border bg-card p-6 max-w-md w-full shadow-[3px_3px_0_0_hsl(var(--border))] space-y-4">
          <h1 className="font-heading text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReload}
            className="border-2 border-border bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow-[2px_2px_0_0_hsl(var(--border))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_hsl(var(--border))] transition-transform"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
