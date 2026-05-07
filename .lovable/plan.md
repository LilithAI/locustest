## The actual bug

The "Not Found" you see is **not** your styled `src/pages/NotFound.tsx` (which renders "404 / Oops! Page not found / Return to Home"). It's the bare server response — monospaced "Not Found" text, top-left, no styling.

That happens when a **lazy-loaded route chunk 404s**. Sequence:

1. You published a new build. The browser still has the old `index.html` cached (or an in-memory module graph from before the deploy).
2. You navigate to `/the-bar`, `/admin/...`, etc. React calls `import("@/pages/TheBar")` which resolves to the *old* hashed filename like `/assets/TheBar-abc123.js`.
3. That file no longer exists on the new build → 404.
4. The dynamic import rejects with `ChunkLoadError` / `Failed to fetch dynamically imported module`.
5. There is **no error boundary around `<Suspense>`** in `src/App.tsx`, so the rejection bubbles up, React unmounts the tree, and the user is stuck staring at a stripped-down page.

`useVersionCheck` only polls every 30s and its SW/cache cleanup is one-shot per browser, so it cannot rescue a chunk failure happening mid-session.

## The fix (3 layers, all needed)

### 1. Chunk-error boundary around the lazy `<Suspense>` (`src/App.tsx`)

New file `src/components/ChunkErrorBoundary.tsx` — a class component that catches errors in render. If the error message matches the known chunk-load patterns:
  - `ChunkLoadError`
  - `Failed to fetch dynamically imported module`
  - `error loading dynamically imported module`
  - `Importing a module script failed`

…it does a **one-time hard reload with a cache-busting `?v=<timestamp>` query param**, using `sessionStorage` to guarantee at most one reload per session (so we never get into a reload loop if the chunk is genuinely broken). For any other error, it renders a small branded fallback with a "Reload" button — same styling language as `RouteSkeleton`.

Wrap the existing `<Suspense fallback={<RouteSkeleton />}>` in `App.tsx` with `<ChunkErrorBoundary>`.

### 2. Global `unhandledrejection` listener (in `src/main.tsx`)

Some chunk failures surface as unhandled promise rejections (e.g. a prefetch from `prefetchCommonRoutes()` that loses its caller). Add a single `window.addEventListener('unhandledrejection', ...)` that:
  - Inspects `event.reason?.message` / `event.reason?.name` for the same chunk-load patterns.
  - If matched and the same one-shot `sessionStorage` flag isn't set, calls the same hard-reload helper (extracted to `src/lib/chunkRecovery.ts`).
  - Otherwise no-op.

Skipped in dev and inside iframes, identical guards to `useVersionCheck`.

### 3. Make `prefetch.ts` swallow chunk errors loudly-but-safely

Right now `prefetchRoute` does `.catch(() => fired.delete(key))`. That hides a genuine deploy mismatch. Change it to: on chunk-load error, *also* trigger the same recovery path from layer 2 (so a failed prefetch on hover proactively reloads the user onto the fresh build, instead of waiting for them to actually navigate and hit a blank screen).

### Side benefit

The styled `NotFound.tsx` will now actually render when the route is *genuinely* not in the route table, instead of getting masked by chunk-load failures that look like 404s.

## Out of scope

- No service worker / PWA changes.
- No router migration.
- No edits to `useVersionCheck` itself — it stays as the slow-path detector. The new error boundary is the fast-path catch.
- No changes to lazy-load structure or `routeImports`.

## Files

```text
src/lib/chunkRecovery.ts           NEW  — isChunkLoadError() + reloadOnce()
src/components/ChunkErrorBoundary.tsx  NEW  — class component, wraps Suspense
src/App.tsx                        EDIT — wrap <Suspense> with <ChunkErrorBoundary>
src/main.tsx                       EDIT — install unhandledrejection listener
src/lib/prefetch.ts                EDIT — route prefetch failures into chunkRecovery
```

## Verification after implementation

- Open the preview, navigate between a few lazy routes → no regression.
- Read `src/App.tsx` to confirm `<ChunkErrorBoundary>` wraps `<Suspense>` (not the other way around — boundary must be the parent so it catches Suspense's rethrow).
- Confirm `sessionStorage` key is checked before reload to prevent loops.
