## Why

Lovable's hosting layer only resolves deep links (e.g. `/auth`, `/app`, `/tools/cv-analyser`) when the project is a real TanStack Start app. The current setup is a Vite 5 + react-router-dom SPA — `_redirects` and the `spa-fallback-404` plugin are ignored by the host, so every non-root URL returns "Not Found" on `locustest.lovable.app`. This also breaks Google OAuth's post-login redirect.

The fix is the full migration the previous session backed out of. It's mechanical but touches a lot of files.

## Scope

**Changes:** router framework, vite config, build entrypoint, all 79 files importing `react-router-dom`, and a new `src/routes/` tree wired one-to-one to today's `<Routes>` block in `src/App.tsx`.

**Does NOT change:** page component bodies (UI, business logic, Supabase calls, queries, MDX content, design tokens, Tailwind, shadcn). Only their imports + how they're mounted.

## Plan

### 1. Toolchain upgrade (one batch, must land together or revert)
- `bun add -d vite@^7 @tanstack/router-plugin @tanstack/router-devtools`
- `bun add @tanstack/react-router @tanstack/react-start@latest`
- Keep `@vitejs/plugin-react-swc` (verify Vite 7 compat — fall back to `@vitejs/plugin-react` if SWC plugin breaks; this is what failed last time).
- Keep `@mdx-js/rollup` but add it as a Vite plugin in the right order (pre-react). If MDX breaks again on Vite 7, swap to `@mdx-js/rollup` via Vite's `enforce: "pre"` (already done) and pin remark/rehype versions if needed.
- Delete `react-router-dom` only after step 4 passes typecheck.

### 2. Vite config rewrite (`vite.config.ts`)
- Replace plugin list with: `tanstackStart({ customViteReactPlugin: true })`, then `react()`, then MDX with `enforce: "pre"`, then version + componentTagger.
- Remove `spaFallbackPlugin` (TanStack Start handles routing) and `public/_redirects`.
- Keep `manualChunks` strategy but drop the `react-router` chunk rule.
- Keep `BUILD_VERSION` injection (used by `useVersionCheck`).

### 3. Bootstrap files
- Delete `src/main.tsx` and `src/App.tsx` content as the React-Router shell — preserve the chunk-recovery + cache-buster + standalone-PWA logic by moving it into `src/routes/__root.tsx`'s client-only effect, and the OAuth-hash + post-OAuth rescuers into the same place (they only run in the browser).
- Create `src/router.tsx` exporting `getRouter()` per TanStack Start convention, with `defaultErrorComponent`, `defaultNotFoundComponent`, scroll restoration, `defaultPreload: "intent"`.
- Create `src/routes/__root.tsx` with the html/head/body shell + global providers (`ThemeProvider`, `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `CommandPaletteProvider`, `VersionWatcher`, `IdlePrefetcher`, `SessionKeepAlive`, `MetaPixelTracker`, `ChunkErrorBoundary`, `<Outlet/>`, `<CommandPalette/>`, `<SearchFab/>`). Provide `notFoundComponent` rendering the existing `NotFound` page.
- Delete the orphaned `src/src/routeTree.gen.ts` (left over from the previous attempt) before generation runs.

### 4. Route files (one per current `<Route>`)
Map every line in today's `<Routes>` block to a file under `src/routes/`. Each file is ~10 lines: `createFileRoute(path)({ component: ExistingPage })` re-exporting the unchanged page component. Layout routes (`Layout`, `AdminLayout`) become pathless layout files using `_layout.tsx` / `_admin.tsx` conventions with `<Outlet/>`.

Files to create (exact mapping):

```
src/routes/
  __root.tsx
  _shell.tsx                       (wraps Layout — applies to most pages)
  _shell.index.tsx                 -> /                   (Index)
  _shell.app.tsx                   -> /app                (AppHome)
  _shell.waitlist.tsx              -> /waitlist
  _shell.directory.tsx
  _shell.directory.firms.$slug.tsx
  _shell.demofirminteligence.tsx
  _shell.playbook.tsx
  _shell.playbook.$slug.tsx
  _shell.resources.tsx
  _shell.tools.tsx
  _shell.tools.cv-analyser.tsx
  _shell.the-bar.tsx
  _shell.the-bar.preview.tsx
  _shell.the-bar.browse.tsx
  _shell.the-bar.challenge.$id.tsx
  _shell.the-bar.history.tsx
  _shell.the-bar.leaderboard.tsx
  _shell.applications.tsx
  _shell.profile.edit.tsx
  _shell.u.$username.tsx
  _shell.opportunities.tsx
  _shell.dock-lab.tsx
  _shell.tour-lab.tsx
  _shell.vacancies.tsx             (Navigate -> /opportunities via beforeLoad redirect)
  _shell.opportunities-preview.tsx (redirect)
  _shell.admin.tsx                 (AdminLayout wrapper, has <Outlet/>)
  _shell.admin.index.tsx           -> /admin
  _shell.admin.waitlist.tsx
  _shell.admin.bar.tsx
  _shell.admin.beta.tsx
  _shell.admin.vacancies.tsx       (redirect -> /admin/opportunities)
  _shell.admin.opportunities.tsx
  _shell.admin.firm-suggestions.tsx
  _shell.admin.broadcasts.tsx
  _shell.admin.admins.tsx
  _shell.admin.insights.tsx
  _shell.admin.firm-intelligence.tsx
  _shell.admin.firm-intelligence.$slug.edit.tsx
  auth.tsx                         (no shell — /auth)
  reset-password.tsx
  choose-username.tsx
  beta.tsx
  beta.round-2.tsx
  unsubscribe.tsx
```

Redirects use `beforeLoad: () => { throw redirect({ to: '/...' }) }`.

### 5. Codemod the 79 files
Mechanical search/replace, batch by import shape. The mapping is one-to-one:

| react-router-dom | @tanstack/react-router |
|---|---|
| `Link`, `Outlet`, `Navigate`, `useLocation`, `useNavigate`, `useParams` | same names, same import |
| `useSearchParams` | `useSearch` (different API — refactor call sites: `const sp = useSearch({ strict: false })`) |
| `NavLink` | `Link` with `activeProps`/`inactiveProps` (rewrite `src/components/NavLink.tsx`) |
| `<Link to={`/posts/${id}`}>` | `<Link to="/posts/$id" params={{ id }}>` — sweep all template-literal `to=` props |

Plan the sweep in two passes:
1. Pure rename pass via `rg`-driven script for the trivial cases (Link/Outlet/Navigate/useLocation/useNavigate/useParams).
2. Manual pass for ~10 files using `useSearchParams` and any `<Link to={`...${...}`}>` patterns.

### 6. Auth + OAuth rescuer relocation
Move the two `window.location.hash`/`sessionStorage` blocks at the top of `src/App.tsx` into a `useEffect` inside `__root.tsx`'s client component. They must run before the first non-root render but after Supabase client mount — `useEffect` on root is fine because the effect runs on mount and the redirect happens via `window.location.replace` (full reload).

### 7. Cleanup
- Remove `react-router-dom` from `package.json`.
- Delete `public/_redirects` and the `spa-fallback-404` plugin.
- Delete `src/src/routeTree.gen.ts` (stale).
- Update `src/lib/prefetch.ts` — TanStack Router has its own prefetch (`router.preloadRoute`). Either keep the existing hover-prefetch-by-import-promise hack (still works since it just imports modules) or migrate to `defaultPreload: "intent"` + delete `prefetch.ts`. Prefer the latter — simpler and idiomatic.
- Verify `useTrackPageViews` and `MetaPixelTracker` still fire on route changes (use `useRouterState({ select: s => s.location })` instead of `useLocation` if needed — but `useLocation` works too).

### 8. Verification
1. `bun run build` succeeds.
2. Preview loads `/`, `/auth`, `/app`, `/tools`, `/tools/cv-analyser`, `/admin`, `/u/jeet` — all render their existing UI.
3. Hard-refresh on `/tools/cv-analyser` returns 200, not 404.
4. Google OAuth round-trip lands on `/app` (the broker's hash-token rescuer in `__root` consumes the token).
5. Admin redirect (`/admin/vacancies` → `/admin/opportunities`) still works.
6. The neobrutalist `/tools` page still renders (no styling regressions).

## Risks & rollback

- **Vite 7 + SWC + MDX compat** — the exact thing that killed the previous attempt. Mitigation: land the toolchain upgrade as step 1, build immediately, and if the plugin combo breaks, fall back from `@vitejs/plugin-react-swc` to `@vitejs/plugin-react` before touching any route files.
- **Server-side bundling** — TanStack Start builds an SSR bundle. `src/App.tsx` and most pages reference `window`/`localStorage` at module top-level (the OAuth rescuer especially). All such code MUST move inside `useEffect` or be guarded by `typeof window !== "undefined"` — this is already the case for App.tsx but page-level audits may surface a few more spots.
- **`useSearchParams` API change** — tracked as the only non-trivial codemod.
- **Rollback** — the migration touches so many files that partial rollback is impractical. The branch is the rollback unit; if step 8 fails irrecoverably, revert the entire branch.

## What I will NOT touch this pass

- Page UI, copy, design tokens, Tailwind config.
- Supabase queries, edge functions, RLS, auth tables.
- The neobrutalist `/tools` redesign that just shipped.
- Mobile dock, command palette, tour overlays — only their `react-router-dom` imports get rewritten.
- Adding new routes or features.
