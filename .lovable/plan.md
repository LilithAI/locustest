# Fix stale "Not Found" chunk recovery

## Context (corrected)
- `locus.legal` = production (real users).
- `lexleaks.com` = private staging (just you).
- Two domains serving two deployments is **intentional** — not split-brain.
- The "Not Found" you keep seeing is on **lexleaks.com while iterating**, i.e. the classic post-publish stale-chunk pattern. Real users on `locus.legal` would hit the same bug whenever you promote a build, so it's still worth fixing properly.

## Real problems to fix
1. **One-shot reload guard is too strict.** `chunkRecovery.ts` uses a `sessionStorage` flag that allows exactly **one** reload per session. After that, every subsequent chunk failure is silently suppressed and the boundary renders `null` forever.
2. **`ChunkErrorBoundary` returns `null` after suppression.** When recovery is suppressed, the user is left with a blank screen instead of a usable fallback.
3. **`prefetchCommonRoutes()` swallows errors.** A failed background prefetch deletes the key but never routes the error into `tryRecoverFromChunkError`. Only `prefetchRoute` (hover prefetch) does that.
4. **Leftover cross-domain plumbing.** Not breaking anything, but stale and confusing. Worth cleaning while we're in here.

## Changes

### 1. `src/lib/chunkRecovery.ts` — allow up to 2 reloads per session
- Replace the boolean `RELOAD_FLAG` with a **counter** in `sessionStorage` (`locus_chunk_reload_count`).
- Allow up to **2** reloads per session. Third+ failure → return `false` so the boundary renders the styled fallback instead.
- Keep the cache-busting `?v=<timestamp>` query param.
- Export a new helper `getReloadAttempts(): number` so the boundary can decide between "silently reloading" and "show fallback".

### 2. `src/components/ChunkErrorBoundary.tsx` — never render null forever
- When a chunk error is caught:
  - If `tryRecoverFromChunkError` returned `true` → render a small "Reloading…" placeholder (matches `RouteSkeleton` styling), not `null`. This avoids a flash of blank screen during the reload.
  - If it returned `false` (limit reached) → render the styled fallback with a manual Reload button **and** a "Go home" link. Reload button should clear the session counter so the user gets a fresh 2 attempts.
- For non-chunk errors, keep the existing branded fallback.

### 3. `src/lib/prefetch.ts` — route prefetch failures through recovery
- In `prefetchCommonRoutes()`'s `run()` loop, change the `catch {}` to call `tryRecoverFromChunkError(err)` (same pattern as `prefetchRoute`). Background prefetch failures are the **earliest** signal that the deployed bundle no longer matches the user's HTML — using them proactively means users get bounced to the fresh build before they ever click.

### 4. Cleanup of stale cross-domain code in `src/App.tsx`
- Remove the `locuslegal.lovable.app → locus.legal` redirect block (host no longer exists; the published Lovable URL now redirects to `lexleaks.com`).
- Leave the `post_oauth_redirect` and implicit-flow `#access_token=` rescuers — those are still correct and host-agnostic.

### 5. (Optional, flagged for your decision) `index.html` canonical
- The HTML still emits `<link rel="canonical" href="https://locus.legal/" />` even when served from lexleaks.com. That's actually what you want for SEO — Google should index `locus.legal`, not the staging host. **No change recommended.** Just calling it out so you know it's intentional, not a bug.

## Files

```text
src/lib/chunkRecovery.ts            EDIT  — counter-based reload guard + getReloadAttempts()
src/components/ChunkErrorBoundary.tsx  EDIT  — render placeholder mid-reload, fallback after limit
src/lib/prefetch.ts                 EDIT  — route prefetchCommonRoutes errors through recovery
src/App.tsx                         EDIT  — remove dead locuslegal.lovable.app redirect
```

## Out of scope
- No changes to `useVersionCheck` (it works correctly per-host).
- No changes to routing library (still react-router-dom).
- No service-worker / PWA changes.
- No production deploy changes — this all lives in client code and ships with the next publish.

## Verification
- After implementation, on lexleaks.com: trigger a chunk error (simulate by renaming a file in DevTools network blocklist) → confirm silent reload happens, capped at 2.
- Force a 3rd failure → confirm styled fallback renders with working Reload + Go home buttons.
- Confirm `prefetchCommonRoutes()` failures also trigger the recovery path (check Network tab after a publish).