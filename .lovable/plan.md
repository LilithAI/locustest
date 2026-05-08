# Fix: Tools→CV Analyser 404 and Login Flash-to-404

Two unrelated bugs, both rooted in the same anti-pattern: doing a **hard browser navigation** (`window.location.href = ...` / OAuth callback redirect) on a SPA where the served HTML and the in-memory route table can fall out of sync on a stale build.

---

## Bug 1 — "CV Analyser" 404 from the Tools page

### Root cause
`src/pages/Tools.tsx` line 636 navigates with a **full page reload**:
```ts
onClick={() => { ... window.location.href = tool.href; ... }}
```
Every other place that links to `/tools/cv-analyser` (Resources page, ShowcasePane, FeatureBento, search engine) uses React Router's `<Link>` — which works.

`window.location.href` causes the browser to re-fetch `index.html` + a fresh JS bundle. On lexleaks.com the cached HTML often points to chunk hashes that no longer exist after a new build, so the lazy `CvAnalyser` chunk fails to resolve → `ChunkErrorBoundary` triggers → after recovery attempts the user lands on a blank/NotFound-looking screen. From the Resources page the same target opens fine because it stays inside the SPA (no HTML refetch, no chunk-hash mismatch).

### Fix
Replace the hard navigation in the Tools catalogue card with SPA navigation, matching the Resources/Showcase pattern.

```tsx
// src/pages/Tools.tsx
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
...
onClick={() => {
  if (tool.comingSoon) return;
  if (tool.href) navigate(tool.href);
  else openTool(tool.id);
}}
```

(No change needed in `tools.ts` — `href: "/tools/cv-analyser"` already matches the route in `App.tsx`.)

---

## Bug 2 — Google login: dashboard flashes, then NotFound

### Root cause
In `src/App.tsx` (top-of-file rescuer) we handle two OAuth shapes:

1. `sessionStorage.post_oauth_redirect` set + broker drops us back at `/`
2. Legacy implicit-flow `#access_token=` in the hash

Both run **asynchronously** (`supabase.auth.getSession().then(...)` / `setSession().then(...)`), but the `<BrowserRouter><Routes>` tree mounts **synchronously** on the same render. So the sequence is:

1. Browser lands on the redirect URI (e.g. `/` with a hash, or `/app` after the broker bounce).
2. Routes mount → `AppHome` (or another protected page) renders → user sees the dashboard for a frame.
3. The async rescuer finishes → calls `window.location.replace(stashed)` → during the unload window React unmounts; if a lazy chunk for the destination is being prefetched and fails (stale build), `ChunkErrorBoundary` swallows and re-renders, but on the wrong path → `*` route → `NotFound`.
4. A manual reload uses the now-clean URL + valid session → everything works.

### Fix
Short-circuit the render tree while we are mid-OAuth, so no route ever mounts with tokens still in the URL.

In `src/App.tsx`:

1. Move the two rescuer blocks into a small `useEffect`-driven component (`OAuthCallbackHandler`) that lives **above** `<BrowserRouter>`.
2. Compute a synchronous `isOAuthInFlight` flag at module/render time:
   - `window.location.hash.includes("access_token=")`, **or**
   - a non-null `sessionStorage.post_oauth_redirect` AND no current session yet
3. While `isOAuthInFlight` is true, return a minimal full-screen loader (same skeleton as `RouteSkeleton`) instead of mounting `<BrowserRouter>`.
4. Inside the handler, after `setSession` / `getSession` resolves:
   - Clear the hash with `history.replaceState(null, "", window.location.pathname + window.location.search)`.
   - Then `window.location.replace(stashed || "/app")` (or use `navigate` after BrowserRouter is allowed to mount).
5. Remove `post_oauth_redirect` from sessionStorage in a `finally` so a stuck value can never cause a future false-positive in-flight state.

Net effect: no route ever paints while `#access_token=...` is still in the URL, so there is no dashboard flash and no NotFound fallback.

### Optional hardening (same file, same fix)
- In `Auth.tsx#handleGoogleSignIn`, set `post_oauth_redirect` only after a successful `signInWithOAuth` call (not before). Prevents an orphan key blocking future loads if the user cancels Google's screen.
- Add `window.location.hash = ""` immediately after `setSession` succeeds, even before the redirect, so any error during redirect doesn't leave tokens in the URL bar.

---

## Files touched
- `src/pages/Tools.tsx` — swap `window.location.href` for `useNavigate()` in the catalogue card click handler.
- `src/App.tsx` — extract OAuth rescuer into a component above `<BrowserRouter>`; render a loader while `isOAuthInFlight`; clean the hash before replacing the URL.
- `src/pages/Auth.tsx` *(optional hardening only)* — guard `post_oauth_redirect` write.

## Out of scope
- No router library swap, no hosting/_redirects changes (Lovable hosting already handles SPA fallback).
- No changes to `ChunkErrorBoundary` / `chunkRecovery` — they keep working as the safety net for genuinely stale chunks.
- No backend / Supabase config changes.

## Verification
1. From `/tools`, click the CV Analyser card → opens `/tools/cv-analyser` with no reload, no 404.
2. Sign out, then sign in with Google → land directly on `/app` with no dashboard flash and no NotFound flash. URL bar contains no `#access_token=`.
3. Hard-refresh `/tools/cv-analyser` directly → still loads (confirms hosting fallback is fine and we didn't regress it).
4. Cancel the Google consent screen mid-flow → returning to the app does not get stuck on the loader (verifies the `finally` cleanup of `post_oauth_redirect`).
