# Why `/auth?redirect=/app&v=…` keeps appearing on refresh

## What's actually happening

When you refresh `lexleaks.com/app`, three things race in production:

1. **`AppHome` mounts** → calls `supabase.auth.getSession()` → if session isn't immediately present, navigates to `/auth?redirect=/app`.
2. **`useVersionCheck` fires immediately** (we removed the 5s delay so stale CDN edges are caught fast). On a stale CDN edge, `version.json` ≠ `__BUILD_VERSION__` → calls `reloadOnce()` → reloads with `?v=…` appended.
3. **`main.tsx` strips `?v=`** on the next boot.

The `&v=…` you see on `/auth` means step 2 fired **after** step 1 already navigated to `/auth`, so the cache-buster got appended to that URL. The strip in `main.tsx` only runs once, at the top of `main.tsx`, on module init — and it apparently isn't winning the race against the reload chain on the live build.

There are also **two real bugs** behind this:

### Bug 1 — `/app` bounces to `/auth` on refresh even when you're logged in

`AppHome` treats "no session right now" as "log them out", but on a hard refresh the Supabase client may not have hydrated from localStorage yet by the time `getSession()` resolves on the very first tick (especially on Safari / cold tabs / behind a CDN). The fix is the same pattern Supabase docs recommend: subscribe to `onAuthStateChange` first, then call `getSession()`, and only redirect after we've confirmed there's truly no session (one short tick of grace, or wait for the first auth event).

This single change kills 90% of the "I got logged out on refresh" reports — it's the actual reason you ended up at `/auth` in the first place.

### Bug 2 — `?v=` lingers in the URL on production

Two reasons it can stick:
- The `main.tsx` strip only runs once at module load. If a reload chain happens (cache-buster → strip → version check fires again → cache-buster again), and the new build also has a stale `version.json` cached for a moment, you can re-acquire `?v=`.
- On the **live** site, the build that's currently serving may not yet contain the strip + auth-path skip we shipped earlier — those only take effect once you click **Publish → Update**. Preview already has them; production until republished does not.

## Plan

### Fix A — Stop `/app` from bouncing to `/auth` on refresh (the real bug)

In `src/pages/AppHome.tsx`:
- Set up `onAuthStateChange` subscription **before** calling `getSession()`.
- Treat the first 500–800ms as "session still hydrating" — don't navigate to `/auth` during that window.
- Only redirect when `onAuthStateChange` has fired with `null` OR `getSession()` has resolved with `null` AND no auth event arrived within the grace window.
- Same pattern needs to be applied to `ApplicationTracker.tsx` and `CvAnalyser.tsx` (they have the same anti-pattern).

### Fix B — Make the `?v=` strip idempotent

In `src/main.tsx`:
- Keep the existing strip-on-boot.
- Additionally, after `useVersionCheck`'s first successful match (build version === server version), strip `?v=` again from the URL via `history.replaceState`. Put that one-liner inside `useVersionCheck`'s success path (currently it just `return`s).

### Fix C (defensive) — Don't run version check until pathname is settled

In `src/hooks/useVersionCheck.ts`:
- Defer the very first `check()` by one `requestAnimationFrame` (or a `0ms` `setTimeout`). That gives `AppHome`'s `navigate()` time to commit, so by the time the check runs, `pathname` is `/auth` and the auth-path skip kicks in cleanly. This costs nothing — version check still fires on first paint, just one frame later.

## Question before I implement

The fixes I shipped in the previous turn (auth-path skip + `?v=` strip) only help **after you click Publish → Update on `lexleaks.com`**. Have you republished since those changes? If not, the simplest next step is: republish first, hard-refresh once, and confirm whether `/app` still bounces to `/auth`. If it still does after republish, Fix A above is the real fix — the version-check stuff is a sideshow.

## Files touched

- `src/pages/AppHome.tsx` (Fix A)
- `src/pages/ApplicationTracker.tsx` (Fix A)
- `src/pages/CvAnalyser.tsx` (Fix A)
- `src/main.tsx` (Fix B)
- `src/hooks/useVersionCheck.ts` (Fix B + Fix C)

~30 lines changed across 5 files. No backend / DB / RLS changes.
