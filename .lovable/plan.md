# Migration: react-router-dom → TanStack Start (file-based routing)

This is the proper fix so Lovable's preview route picker (which scans `src/routes/`) shows every page, deep links work everywhere, and we drop the `public/_redirects` workaround.

## Scope at a glance

- **76 files** import from `react-router-dom` (pages, layouts, drawers, components).
- **~40 distinct routes** including nested `/admin/*` and dynamic params (`:slug`, `:id`, `:username`, `:postId`).
- Already installed: `@tanstack/react-start@1.167.64` (peer of TanStack Router). Vite is on **5.4.19** — the plugin requires **Vite 7+**, which is what blocked us last time.
- App is currently SPA-only (`createRoot` in `main.tsx`, `BrowserRouter`). We will keep it SPA — TanStack Start in **`spa: { enabled: true }` mode** prerenders a shell and ships the existing client-side experience, no SSR rewrite.

## Strategy: staged, each stage independently bootable

We do NOT do a single big-bang rewrite. Each numbered stage leaves the app in a working state so we can verify the preview before moving on. If any stage breaks, we stop and fix before continuing — no silent regressions stacked on top of each other.

---

### Stage 1 — Upgrade Vite & toolchain (no app code changes)

Bump:
- `vite` 5.4 → ^7
- `@vitejs/plugin-react-swc` ^3.11 → latest compatible with Vite 7
- `vitest` 3.2 → latest compatible with Vite 7
- `lovable-tagger` → latest (must support Vite 7's plugin API)
- `rollup-plugin-visualizer` → latest if needed

Verify: dev server boots, home renders, `/directory` and `/admin/login` still load via react-router. No functional changes yet.

If any package can't go to Vite 7, stop and report — do not proceed to stage 2.

---

### Stage 2 — Add TanStack Start plugin in SPA mode (still using react-router)

- Add `tanstackStart({ spa: { enabled: true }, router: { routesDirectory: "src/routes", generatedRouteTree: "src/routeTree.gen.ts" } })` to `vite.config.ts`.
- Create the **minimal route shell only**:
  - `src/router.tsx` — `createRouter({ routeTree, defaultPreload: "intent" })` + `Register` augmentation.
  - `src/routes/__root.tsx` — `createRootRoute` with `shellComponent` (html/head/body), `notFoundComponent`, and a single `<Outlet />` rendering our existing `<App />` (the legacy `BrowserRouter` tree) inside a `ClientOnly` so SSR/prerender doesn't touch supabase.
  - `src/routes/$.tsx` (catch-all) — same: lazily renders `<App />`.
  - `src/routes/index.tsx` — same.
  - `src/routeTree.gen.ts` — placeholder; the plugin regenerates it on dev/build.
- Set `tsconfig.app.json` → `"strictNullChecks": true` (TanStack requirement). Fix any nullability errors that surface.

This is the bridge state: TanStack owns the document shell and routing wrapper, but every URL still hits the catch-all and the existing react-router `<Routes>` inside `<App />` continues to render the right page. The route picker still won't show much (one entry: catch-all), but the app keeps working.

Verify: every existing URL still loads (home, `/directory`, `/admin/login`, `/playbook/cold-email-law-firm`, `/u/foo`).

---

### Stage 3 — Convert routes to file-based, page by page

Replace the catch-all with real route files. Naming uses TanStack's flat dot convention:

```
src/routes/
  __root.tsx                          (shell + global notFound)
  _layout.tsx                         (Layout: Navbar+Footer+BetaBanner+AppTour, <Outlet/>)
  _layout.index.tsx                   (/)            → Index
  _layout.app.tsx                     (/app)         → AppHome
  _layout.waitlist.tsx                (/waitlist)
  _layout.directory.tsx               (/directory)
  _layout.directory.firm.$slug.tsx    (/directory/firm/:slug)
  _layout.playbook.tsx                (/playbook)
  _layout.playbook.$slug.tsx          (/playbook/:slug)
  _layout.resources.tsx
  _layout.tools.tsx
  _layout.tools.cv-analyser.tsx
  _layout.the-bar.tsx
  _layout.the-bar.preview.tsx
  _layout.the-bar.browse.tsx
  _layout.the-bar.challenge.$id.tsx
  _layout.the-bar.history.tsx
  _layout.the-bar.leaderboard.tsx
  _layout.applications.tsx
  _layout.profile.edit.tsx
  _layout.u.$username.tsx
  _layout.opportunities.tsx
  _layout.vacancies.tsx               (redirect → /opportunities via beforeLoad)
  _layout.opportunities-preview.tsx   (redirect)
  _layout.dock-lab.tsx
  _layout.tour-lab.tsx
  _layout.admin.tsx                   (AdminLayout guard via beforeLoad)
  _layout.admin.index.tsx             (/admin)        → AdminDashboard
  _layout.admin.waitlist.tsx
  _layout.admin.bar.tsx
  _layout.admin.beta.tsx
  _layout.admin.vacancies.tsx         (redirect)
  _layout.admin.opportunities.tsx
  _layout.admin.firm-suggestions.tsx
  _layout.admin.broadcasts.tsx
  _layout.admin.admins.tsx
  _layout.admin.insights.tsx
  auth.tsx                            (no Layout)
  admin.login.tsx                     (no Layout)
  reset-password.tsx
  choose-username.tsx
  beta.tsx
  beta.round-2.tsx
  unsubscribe.tsx
```

Each route file is a thin wrapper that re-exports our existing page component:

```tsx
// src/routes/_layout.directory.tsx
import { createFileRoute } from "@tanstack/react-router";
import Directory from "@/pages/Directory";
export const Route = createFileRoute("/_layout/directory")({
  component: Directory,
});
```

Lazy-loading is preserved automatically: TanStack Start's code-splitter splits each route file. We can drop `lib/prefetch.ts`'s manual `lazy()` registry once routes are file-based (replaced by TanStack's `defaultPreload: "intent"`).

Admin auth guard moves from "render `<Navigate to=/admin/login>`" to `beforeLoad` on `_layout.admin.tsx`:

```tsx
beforeLoad: async () => {
  const { userId, ready } = await waitForAuth();
  if (!ready || !userId || !(await hasAdminScope(userId))) {
    throw redirect({ to: "/admin/login" });
  }
}
```

---

### Stage 4 — Swap react-router-dom imports across 76 files

Mechanical replacements (exact mapping):

| react-router-dom                | @tanstack/react-router            | Notes |
|---------------------------------|-----------------------------------|-------|
| `Link to="/x"`                  | `Link to="/x"`                    | identical |
| `` Link to={`/x/${id}`} ``      | `Link to="/x/$id" params={{id}}`  | type-safe |
| `NavLink ... className={({isActive})=>...}` | `Link activeProps={{className}}` / render-prop | rewrite |
| `useNavigate()`                 | `useNavigate()`                   | call shape: `navigate({ to: "/x" })` instead of `navigate("/x")` |
| `useLocation()`                 | `useLocation()`                   | shape compatible (`pathname`, `search`) |
| `useParams()`                   | `Route.useParams()` or `useParams({ from })` | type-safe |
| `useSearchParams()`             | `useSearch({ from })` + `useNavigate` | rewrite to TanStack search-param model |
| `Navigate to="/x"`              | `<Navigate to="/x" />`            | identical |
| `Outlet`                        | `Outlet`                          | identical |

`useSearchParams` is the trickiest — ~6 files use it. We'll add a small compat shim `useSearchParamsCompat()` that wraps TanStack's `useSearch` + `useNavigate` and exposes a URLSearchParams-like tuple, so we don't have to rewrite every `setSearchParams(...)` call site.

`MetaPixelTracker` (currently uses `useLocation`) moves into `__root.tsx`'s `RootShell` and listens via `useRouterState({ select: s => s.location.pathname })`.

---

### Stage 5 — Drop the legacy bridge

- Delete `src/App.tsx`'s `<BrowserRouter>` + `<Routes>` block. Move providers (Theme, QueryClient, Tooltip, Toaster, Sonner, CommandPalette, VersionWatcher, etc.) into `RootShell` in `__root.tsx`.
- Delete `public/_redirects` (TanStack Start handles deep links natively per Lovable docs).
- Remove `react-router-dom` from `package.json`.
- Remove `react-router-dom` from `vite.config.ts` `manualChunks`.
- Remove the now-unused `lazy()` block in `App.tsx` (or delete `App.tsx` entirely).

---

### Stage 6 — Verify

- Dev server boots without warnings.
- Lovable's preview route picker dropdown lists all routes.
- Spot-check: `/`, `/directory`, `/directory/firm/<slug>`, `/playbook/cold-email-law-firm`, `/the-bar/challenge/<id>`, `/u/<username>`, `/admin/login`, `/admin` (redirects to login when unauth), `/admin/opportunities` (works when admin), `/auth`, `/unsubscribe?token=...`.
- Hard refresh on each deep link works.
- Existing tests (`vitest`) pass.
- Build (`vite build`) succeeds.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Vite 7 breaks `lovable-tagger` or MDX plugin | Stage 1 verifies before any other change. If `lovable-tagger` can't go to Vite 7, fall back to its latest compatible version or temporarily disable in dev. |
| `@mdx-js/rollup` Vite 7 compat | Use latest `@mdx-js/rollup`; if broken, swap to `@mdx-js/vite` equivalent. |
| TanStack Start prerender executes browser-only code (supabase client, `window` access in `Index.tsx`'s `DeferredAuthRedirect`, MetaPixel) | Wrap legacy `<App />` in `<ClientOnly>` during Stage 2 so the prerender skips it; in Stage 5, audit each route component and wrap supabase-touching modules in `ClientOnly` or move to loaders. |
| Search-param call sites (~6) behave subtly differently | `useSearchParamsCompat` shim keeps API identical; manual test each (Auth `?next=`, ResetPassword `?token=`, Unsubscribe `?token=`, Directory filters, Bar filters, AdminWaitlist filters). |
| Type-safe `Link to="/x/$id" params={...}` won't compile if a route file is missing | We create all route files in Stage 3 BEFORE swapping imports in Stage 4. |
| Admin auth guard timing changes (was render-time `<Navigate>`, becomes `beforeLoad` async) | Implement `waitForAuth()` that resolves once supabase has emitted INITIAL_SESSION; preserves current "show spinner then redirect" UX. |
| `useTrackPageViews` hook depends on `useLocation` | Trivially swapped to `useRouterState`. |
| Bundle size regression — TanStack Router is heavier than react-router | Acceptable; offset by removing react-router and its vendor chunk. Re-run `--mode analyze` after Stage 6. |
| Stage 3 is ~40 new files | Mechanical and parallelizable; each is a 5-line wrapper. |

## What I will NOT change

- Page component internals (`pages/*.tsx` business logic) — only their `react-router-dom` imports.
- Supabase queries, auth flow, edge functions.
- Tailwind / design tokens / `index.css`.
- The seeded admin (`admin` / `admin@locus.legal`) and `/admin/login` UX.

## Estimated blast radius

- **New files:** ~45 (route files + router.tsx + __root.tsx + shim).
- **Edited files:** ~80 (76 import swaps + vite.config + tsconfig + package.json + main.tsx + App.tsx).
- **Deleted files:** `public/_redirects`, eventually `src/App.tsx` (folded into `__root.tsx`).
- **Time-equivalent for a human:** half a day of focused work; for me, several tool-call batches across one approval.

## Approval gates I'll respect

I will pause and report after **Stage 1** (Vite upgrade) before touching app code, and again after **Stage 2** (bridge boots) before fanning out into Stage 3+. If you'd rather I plow straight through all stages, say so when you approve.
