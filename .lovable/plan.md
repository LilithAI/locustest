# Fix: Google OAuth → `/app` 404 (SPA navigation, not server redirect)

## Root cause
`src/App.tsx` `OAuthCallbackHandler`'s `finish()` uses `window.location.replace(safe)` after exchanging the OAuth session. That's a hard server request to `/app`, which the host doesn't serve as an SPA fallback for that deep link → 404. Email/password works because `Auth.tsx` uses React Router's `navigate()` instead.

## Change (single file: `src/App.tsx`)
Inside the existing `finish()` helper in the OAuth `useEffect`, replace the hard navigation with HTML5 History API + a synthetic `popstate` so `BrowserRouter` picks it up client-side. Keep the existing hash-strip and `sessionStorage.removeItem` lines exactly as they are.

```ts
// BEFORE
const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
window.location.replace(safe);

// AFTER
const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
window.history.replaceState({}, "", safe);
window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
setOauthInFlight(false); // unblock the loader so <Routes> mounts on the new path
```

Note: the current code centralises both OAuth shapes (hash tokens + stashed redirect) through one `finish()`, so a single edit covers both cases the user described.

## Out of scope
- No changes to `Auth.tsx`, `ChunkErrorBoundary`, `chunkRecovery`, `Tools.tsx`, or any backend/Supabase config.
- No router library swap, no hosting changes.

## Verification
1. Sign in with Google → lands on `/app` directly, no flash, no 404, URL has no `#access_token=`.
2. Sign in with email/password → still navigates to `/app` (unchanged path).
3. Cancel Google consent → returns without getting stuck on the loader (existing 8s safety + `finally` cleanup remain).
4. Hard-refresh `/app` while signed in → still works.
