## Problem

Before the recent refactor the site felt smooth because *something* always painted a skeleton between page A and page B. After moving to native TanStack APIs and a Suspense-only fallback, the skeleton almost never fires:

- Routes in `src/routes/` are **not** lazy-split (no `createLazyFileRoute`, no `lazyRouteComponent`), so clicking a link does **not** suspend the `<Suspense>` we put around `<Outlet />` in `_layout.tsx`. Result: old page stays mounted, then new page snaps in once data finishes — exactly what the user is reporting.
- TanStack Router internally wraps navigations in a React transition, so even when a child component does suspend, React keeps the old UI on screen until the new one is ready (no fallback).
- `defaultPreload: false` removed the only thing that used to mask the gap.

So the Suspense boundary I added is essentially dead code for navigations.

## Fix (frontend only, presentation layer)

Drive the skeleton off the router's transition/pending state directly, not off Suspense.

### 1. `src/routes/_layout.tsx` — overlay skeleton during transitions
- Remove the `<Suspense fallback={<RouteSkeleton />}>` wrapper around `<Outlet />` (it never triggers for non-lazy routes).
- Add a small inner component `RouteTransitionShell` that:
  - Reads `useRouterState({ select: s => ({ status: s.status, isLoading: s.isLoading, isTransitioning: s.isTransitioning, pathname: s.location.pathname }) })`.
  - Tracks the *committed* pathname in a ref. When `pathname` changes OR `status !== 'idle'` OR `isLoading` / `isTransitioning` is true, render `<RouteSkeleton />` in place of `<Outlet />`.
  - Once the router settles on the new pathname (status `idle`, not transitioning), render `<Outlet />`.
- Keep `<Navbar />`, `<Footer />`, `<MobileBottomDock />`, `<BetaBanner />` mounted around it so chrome doesn't flash.

### 2. `src/router.tsx` — re-enable preload + tune pending
- Restore `defaultPreload: "intent"` and add `defaultPreloadDelay: 50`.
- Add `defaultPendingComponent: RouteSkeleton`, `defaultPendingMs: 0`, `defaultPendingMinMs: 150` so any future loader-bearing route also gets the skeleton with a non-flickery minimum.
- Keep `scrollRestoration: true`.

### 3. `src/components/RouteSkeleton.tsx` — make it transition-safe
- Already reads pathname via `useRouterState({ select })` (good).
- Add a second selector for `s.location.pathname` of the *resolved* (incoming) location so the skeleton shape matches the destination, not the origin: select `s.resolvedLocation?.pathname ?? s.location.pathname`. This ensures clicking from `/` to `/playbook` shows the article/cardGrid skeleton immediately.
- No other changes; styling unchanged.

### 4. Verify
Click through Home → Directory → Playbook → Resources → Tools → The Bar → Opportunities and confirm:
- URL changes
- Skeleton (route-shaped) appears instantly
- New page renders
- No `match._nonReactive` console error
- Back/forward also shows skeleton

## Out of scope
- No backend, auth, email, or Supabase changes.
- No edits to individual page components or the `react-router-dom` shim.
- No conversion of routes to lazy file routes (could be a later optimization; not needed to fix the perceived smoothness).
