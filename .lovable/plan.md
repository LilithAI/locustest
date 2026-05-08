## What happened

You landed on `https://lexleaks.com/auth?v=1778216874835`. The `?v=…` timestamp is **not** a Google/Supabase param — it's our own cache-buster, appended by `reloadOnce()` in `src/lib/chunkRecovery.ts`.

Trace:
1. You clicked the Locus tab. The browser served a **stale HTML shell** from the CDN edge (the previous deploy).
2. `useVersionCheck` ran on first paint, fetched `/version.json`, saw the deployed version ≠ the bundled `__BUILD_VERSION__`.
3. It called `reloadOnce()` → hard reload with `?v=<timestamp>` to bust the CDN.
4. The reloaded page is the fresh build. Login worked (auth logs confirm: Google login at 05:09:50 succeeded).

So the **login itself is fine**. What you saw was a mid-flight forced reload right as you were trying to sign in. Two real problems with that:

### Problem 1: Version-check reload during the auth/OAuth flow
If `useVersionCheck` fires while the OAuth broker is mid-redirect (the hash-token rescue in `src/App.tsx`), the reload can race the session-set call and the user sees a flash/blink. Auth still completes here because the rescuer is sync, but it's ugly and on slower networks could interrupt `setSession`.

### Problem 2: `?v=` sticks in the URL forever
After the cache-buster reload succeeds, the `?v=…` stays in the address bar. Looks like spam, and it shows up in shared links / browser history / analytics. Worse, the reload-loop guard in `useVersionCheck` only fires when `?v=` is already present — so a leftover param from yesterday can short-circuit a real new-version reload tomorrow.

## Fix

Two tiny, scoped changes — no auth refactor, no chunkRecovery changes.

### Fix A — Skip version-check on auth-sensitive routes/states
In `src/hooks/useVersionCheck.ts`, bail out early if any of these are true:
- pathname is `/auth`, `/reset-password`, or `/choose-username`
- URL hash contains `access_token=` (legacy implicit OAuth in flight)
- `sessionStorage` has a `post_oauth_redirect` key (OAuth round-trip pending)

Effect: zero auto-reloads while the user is on a login screen or coming back from Google. The next page they navigate to (e.g. `/app`) will re-run the check normally.

### Fix B — Strip `?v=` from the URL after a successful boot
In `src/main.tsx` (or the top of `src/App.tsx`, before any router work), if `URLSearchParams` contains `v` AND `__BUILD_VERSION__` matches what's expected, call `history.replaceState` to remove just that param. Other query params untouched. Done once at startup.

Effect: the cache-buster does its job, then disappears. Address bar stays clean. Reload-loop guard stays accurate (only present when an active reload chain is in progress).

## What we deliberately do NOT change
- `chunkRecovery.ts` — the 2-attempt counter is correct.
- `Auth.tsx` — login path is fine; the issue is upstream.
- `App.tsx` OAuth rescuers — they work; they just shouldn't be racing the version-check.

## Verification
1. Open `https://lexleaks.com/auth` directly — no spontaneous `?v=` reload, even if a new deploy went out.
2. Sign in with Google from a stale tab — login completes without an extra reload mid-flow.
3. Force a stale shell (block the next deploy's HTML in DevTools, navigate fresh) — get exactly one reload with `?v=`, then the param is gone after the page settles.

Two files: `src/hooks/useVersionCheck.ts`, `src/main.tsx`. ~15 lines each.
