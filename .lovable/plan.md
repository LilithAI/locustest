## Goal
Eliminate the brief "Not Found" / styled-fallback flash during chunk recovery, and prevent the version-check force-reload from infinite-looping when a CDN keeps serving a stale shell.

## Fix #1 — Anticipate chunk recovery in the error boundary

**`src/lib/chunkRecovery.ts`** — append a new export:

```ts
/**
 * Whether another silent reload is still allowed this session.
 * Used by ChunkErrorBoundary to anticipate recovery in
 * getDerivedStateFromError, so we render the "Loading latest version…"
 * placeholder immediately instead of flashing the styled fallback during
 * React's commit transition.
 */
export function canReload(): boolean {
  if (typeof window === "undefined") return false;
  return getReloadAttempts() < MAX_RELOADS;
}
```

**`src/components/ChunkErrorBoundary.tsx`**:

- Add `canReload` to the existing import from `@/lib/chunkRecovery`.
- Replace `getDerivedStateFromError` so it predicts recovery on the first commit:

  ```ts
  static getDerivedStateFromError(error: Error): State {
    const willReload = isChunkLoadError(error) && canReload();
    return { error, reloading: willReload };
  }
  ```

- Update `componentDidCatch` to correct state if the actual reload was suppressed (limit hit, sessionStorage write blocked, etc.):

  ```ts
  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error)) {
      const triggered = tryRecoverFromChunkError(error);
      if (!triggered) {
        this.setState({ reloading: false });
      }
      return;
    }
    console.error("[ChunkErrorBoundary]", error, info);
  }
  ```

## Fix #2 — Loop guard on version-check force-reload

**`src/hooks/useVersionCheck.ts`**:

- Add `import { reloadOnce } from "@/lib/chunkRecovery";`.
- Delete the inline `forceReload` helper (the `const forceReload = () => { ... }` block, ~lines 83–91).
- Replace the `if (params.has("v"))` branch inside `check()` with:

  ```ts
  // If we already have a stale-version hint in the URL (?v=...) and the
  // build STILL doesn't match, the HTML itself is being served stale by a
  // CDN edge. Route through chunkRecovery's counter so we can't infinite-
  // loop if the CDN keeps serving the old shell. If the counter is
  // exhausted, fall back to the manual toast.
  const params = new URLSearchParams(window.location.search);
  if (params.has("v")) {
    if (!reloadOnce()) {
      callbackRef.current();
    }
    return;
  }

  callbackRef.current();
  ```

## Scope
- Only the three files above. No refactors elsewhere, no UI changes.
- Behavior is invisible in the happy path; verified by forcing a chunk error in DevTools (block a chunk URL → navigate) and confirming "Loading latest version…" shows with no flash and no blank screen.