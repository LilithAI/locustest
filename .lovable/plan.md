# Fix plan: Site-wide navigation lag + router crash

## Symptoms (site-wide, not just Playbook)
- Click any nav link → URL updates immediately, but the old page stays mounted for ~1s before the new one appears.
- Intermittent runtime error: `TypeError: undefined is not an object (evaluating 'match._nonReactive')` from `@tanstack/react-router`.

## Root cause
The app runs on TanStack Router, but almost every shared component still navigates through a `react-router-dom` compatibility shim (`src/lib/rrd.tsx`) aliased in `vite.config.ts`. The shim wraps TanStack's `Link`, `useLocation`, `useNavigate`, `Navigate`, `useParams`, `useSearchParams`.

Two real consequences:
1. The shim's `Link` passes `to` as a plain string with no `params`/typing, and its `useNavigate` calls `tnav({ to: to as never })`. Combined with `defaultPreload: "intent"` and code-split routes, TanStack starts a transition, commits the URL, but the lazy chunk + match resolution finishes a beat later — so the old page stays painted until the new chunk is ready. There is no Suspense boundary tight enough around the route to show the skeleton during that gap.
2. The shim's `useLocation` rebuilds an object every render and is consumed inside the Suspense fallback (`RouteSkeleton` uses `react-router-dom`'s `useLocation`). During a transition this reads router state at a moment when the new match's `_nonReactive` slot isn't populated yet → the crash seen in the console.

This affects every route, which matches what you're seeing.

## What I'll change

1. Move shared shell components off the shim onto native TanStack Router APIs.
   - `src/components/Navbar.tsx`
   - `src/components/MobileBottomDock.tsx`
   - `src/components/Footer.tsx`
   - `src/components/Layout.tsx`
   - `src/components/AdminNavLink.tsx`
   - `src/components/RouteSkeleton.tsx` (critical — it runs during the transition)
   - `src/pages/NotFound.tsx`
   Use `Link`, `useRouterState({ select: s => s.location.pathname })`, and `useNavigate` directly from `@tanstack/react-router`.

2. Tighten the loading boundary so transitions feel instant.
   - Wrap `<Outlet />` in `_layout.tsx` with its own `Suspense` + `RouteSkeleton` fallback (currently only the root has one, above the navbar).
   - Result: clicking a nav link immediately swaps page content for the route-shaped skeleton instead of leaving the previous page on screen.

3. Reduce the fragile preload behavior that's contributing to the `_nonReactive` race.
   - Switch `defaultPreload` from `"intent"` to `false` in `src/router.tsx` while we stabilize, OR keep `"intent"` but stop calling `prefetchRoute` on `onTouchStart`/`onMouseEnter` from the shim'd `Link`. We'll pick one based on which keeps the perceived speed without the crash (default: disable global intent preload, keep explicit `prefetchRoute` calls only).

4. Shrink the shim's surface so the rest of the codebase can keep compiling.
   - Keep `src/lib/rrd.tsx` available for the long tail of pages that still import from `react-router-dom`, but make its `Link` and `useNavigate` thin re-exports of TanStack's so behavior is identical to native usage.
   - No mass page rewrite in this pass — only the shell + nav components above.

5. Verify.
   - Click through Home → Directory → Opportunities → Playbook → Resources → Tools → The Bar.
   - Each nav click should: (a) URL changes, (b) skeleton appears immediately, (c) new page renders.
   - Console should be clean of `match._nonReactive`.
   - If anything still hangs, capture the failing route and iterate (likely a stray `react-router-dom` import inside that page).

## Out of scope (intentionally)
- No backend, email, auth, or Supabase changes.
- No rewrite of every page that still imports from `react-router-dom` — those keep working through the (now thinner) shim.
- No design or copy changes.

## Technical notes
- TanStack Router's `Link` with a plain string `to` is supported — we don't need to retrofit `params={{...}}` everywhere.
- `useRouterState({ select })` is the correct way to read pathname without re-rendering on every router state change.
- The Suspense boundary inside `_layout` will use the same `RouteSkeleton` so the shell (Navbar/Footer/Dock) stays mounted while only the page content swaps — exactly the "instant" feel that's missing today.