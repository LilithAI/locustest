## Context

The app is a Vite SPA using `react-router-dom` + `BrowserRouter` (see `src/App.tsx`, `src/main.tsx`). Lovable's published hosting (`locustest.lovable.app`) and static preview serve TanStack Start file-based routes — they don't ship the SPA fallback this app needs, so any deep link (`/admin/login`, `/admin`, `/directory`, refreshing any non-`/` page) returns a hosting-level 404 before React boots.

`@tanstack/react-start@1.167` is already installed, but no router/route files exist (`src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` are all missing). Nothing is wired up.

This is a large migration. About **80 files** import from `react-router-dom` across pages, components, hooks, and admin shell. Roughly **35 page-level routes** (public, auth, admin nested layout, dynamic params like `/u/:username`, `/directory/firm/:slug`, `/the-bar/challenge/:id`, `/playbook/:slug`, redirects, splat 404).

## Approach

Replace `react-router-dom` with TanStack Router file-based routes, keep every page component as-is, and only rewrite the routing/navigation surface. No business logic or UI changes.

### Phase 1 — Router shell

1. Create `src/router.tsx` exporting `getRouter()` with `defaultErrorComponent`, `defaultNotFoundComponent`, scroll restoration, `defaultPreload: "intent"`.
2. Create `src/routes/__root.tsx` — `createRootRoute` that renders the existing `<Layout />` content (Toaster, Sonner, providers, version watcher, idle prefetcher, session keep-alive, Meta Pixel tracker, CommandPalette, SearchFab) with `<Outlet />`. Move providers (`ThemeProvider`, `QueryClientProvider`, `TooltipProvider`, `CommandPaletteProvider`) into the root component.
3. Update `src/main.tsx` to mount `<RouterProvider router={getRouter()} />` instead of `<App />`. Keep the legacy-host redirect and PWA telemetry.
4. Update `vite.config.ts` to add `@tanstack/router-plugin/vite` so `routeTree.gen.ts` is generated (do NOT hand-edit it). Adjust `manualChunks` to bucket `@tanstack/react-router` into `react-vendor`.
5. Delete `src/App.tsx` (its content now lives in `__root.tsx`).

### Phase 2 — Route files (one per existing `<Route>`)

Mirror the current route table from `App.tsx` into `src/routes/`:

```text
__root.tsx                     -> shared shell
index.tsx                      -> /
app.tsx                        -> /app
waitlist.tsx                   -> /waitlist
directory.tsx                  -> /directory
directory.firm.$slug.tsx       -> /directory/firm/:slug
playbook.tsx                   -> /playbook
playbook.$slug.tsx             -> /playbook/:slug
resources.tsx                  -> /resources
tools.tsx                      -> /tools
tools.cv-analyser.tsx          -> /tools/cv-analyser
the-bar.tsx                    -> /the-bar
the-bar.preview.tsx
the-bar.browse.tsx
the-bar.challenge.$id.tsx
the-bar.history.tsx
the-bar.leaderboard.tsx
applications.tsx
profile.edit.tsx
u.$username.tsx                -> /u/:username
opportunities.tsx
vacancies.tsx                  -> redirect to /opportunities
opportunities-preview.tsx      -> redirect
dock-lab.tsx
tour-lab.tsx
admin.tsx                      -> layout (renders <AdminSubNav/> + <Outlet/>)
admin.index.tsx                -> AdminDashboard
admin.waitlist.tsx
admin.bar.tsx
admin.beta.tsx
admin.vacancies.tsx            -> redirect to /admin/opportunities
admin.opportunities.tsx
admin.firm-suggestions.tsx
admin.broadcasts.tsx
admin.admins.tsx
admin.insights.tsx
admin/login.tsx                -> standalone (outside /admin layout) — use `admin_.login.tsx` flat naming so it does NOT inherit the admin layout
auth.tsx
reset-password.tsx
choose-username.tsx
beta.tsx
beta.round-2.tsx
unsubscribe.tsx
```

All page components stay where they are (`src/pages/*`); each route file just `lazy`-imports the page and re-exports it via `createFileRoute(...).component`. Lazy loading is preserved using `createFileRoute(...).lazy(() => import(...))` so the home bundle stays small (current `src/lib/prefetch.ts` behavior).

### Phase 3 — Replace `react-router-dom` imports (≈80 files)

Mechanical find/replace, file-by-file. Mapping:

| react-router-dom | @tanstack/react-router |
|---|---|
| `Link`, `NavLink` | `Link` (use `activeProps` instead of NavLink) |
| `useNavigate` | `useNavigate` (call shape differs slightly: `navigate({ to: "/x" })`) |
| `useLocation` | `useLocation` (returns `{ pathname, search, hash, state }` — compatible enough; audit `.search` usage) |
| `useParams` | `useParams({ strict: false })` for generic usage, or `Route.useParams()` inside route components |
| `useSearchParams` | `useSearch({ strict: false })` + `navigate({ search })` (rewrite call sites — different API) |
| `Navigate` | `Navigate` from tanstack |
| `Outlet` | `Outlet` |
| `<Link to={`/x/${id}`}>` | `<Link to="/x/$id" params={{ id }}>` |

`useSearchParams` callers need real attention (Auth, Opportunities, ApplicationTracker, AdminBar, TheBarBrowse/Leaderboard, Resources, ChooseUsername, Unsubscribe) — TanStack uses typed `search` per route. Plan: define a permissive `validateSearch` per affected route (`(s) => s as Record<string, string | undefined>`) so existing string-keyed access keeps working without per-call refactors.

`AdminLayout.tsx` becomes the `admin.tsx` layout route's component; auth gating stays as-is (component-level redirect via `<Navigate>`), no `beforeLoad` rewrite — keeps the migration mechanical.

### Phase 4 — Cleanup & verify

1. `bun remove react-router-dom`.
2. Remove `react-router` from the `manualChunks` matcher.
3. Remove `Layout.tsx` Outlet usage if `__root.tsx` absorbs it (or keep `Layout.tsx` and render it inside the root component — leans toward keeping it to minimize diff).
4. Build, then click through: `/`, deep-link refresh `/admin/login`, `/admin`, `/directory`, `/u/someone`, `/playbook/cold-email-law-firm`, an opportunities link with query params, the 404 page.
5. Republish — admin login should now load on direct URL.

## Out of scope

- No SSR / server functions — staying as a pure client SPA, just on TanStack Router instead of react-router-dom. (TanStack file routes still work for client-only rendering and Lovable's hosting handles the deep-link fallback.)
- No changes to Supabase, admin auth logic, or any page UI.
- No `head()` SEO migration in this pass — `usePageMeta` keeps doing its job.

## Heads-up on size

This touches ~80 files and ~35 routes in one shot. Expect a noisy diff and a real chance of small per-page regressions in `useSearchParams` / programmatic-navigate sites that need a second pass after the first build. If you'd rather, I can split this into two PRs: (1) shell + admin routes only (unblocks `/admin/login` immediately), (2) the rest of the app afterwards. Say the word and I'll re-plan as a phased rollout.
