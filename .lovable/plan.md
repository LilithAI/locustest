## What's actually broken

Every deep link returns "Not Found" on the **published** site — confirmed on the Lovable URL `locustest.lovable.app` (and same was true on `lexleaks.com` before you removed it):

```
200  /                  ✅ works
404  /auth              ❌
404  /app               ❌
404  /tools             ❌
404  /tools/cv-analyser ❌
404  /applications      ❌
404  /admin             ❌
```

Removing the custom domain doesn't help — the published Lovable URL has the exact same problem. So this is **not** a domain issue, **not** a Google issue. Google sign-in itself works fine — the broker delivers the token to `/#access_token=...`, the rescuer in `App.tsx` consumes it and tries to redirect to `/app`. Then `/app` 404s at the host before React even loads.

This is a **published hosting** issue.

## Root cause

Lovable's published hosting serves SPA fallback automatically **for TanStack Start projects** (its native stack). This project is the older pattern:

- `react-router-dom` + `<BrowserRouter>` in `src/App.tsx`
- `src/pages/*` page files
- No `src/routes/` directory, no file-based routing

So the host has no idea `/auth` is an app route — it looks for a file, doesn't find one, returns its plain-text 404. The `public/_redirects` file is ignored. The `dist/404.html` plugin we added is also ignored on this hosting tier. In preview the dev server always serves `index.html`, which is why **everything works in preview but breaks the moment you publish**.

## Fix: migrate to TanStack Start file-based routes

This is the only permanent fix. The migration is mechanical — every existing page becomes a route file, business logic stays the same.

### Step 1 — Add the TanStack Start shell
- Create `src/routes/__root.tsx` with the providers currently wrapping `<BrowserRouter>` (ThemeProvider, QueryClientProvider, TooltipProvider, Toasters, VersionWatcher, IdlePrefetcher, SessionKeepAlive, MetaPixelTracker, CommandPaletteProvider, ChunkErrorBoundary, Suspense, CommandPalette, SearchFab) plus a root `notFoundComponent`.
- Create `src/router.tsx` and update `vite.config.ts` to register the TanStack Start Vite plugin so `routeTree.gen.ts` is auto-generated.
- Move the existing OAuth hash-rescuer (consumes `#access_token=...` then redirects) into a tiny client-only component mounted in `__root.tsx` instead of running at module top-level in `App.tsx`.

### Step 2 — Convert every existing route to a route file
For each route currently declared in `App.tsx`:

| Current URL | New route file |
| --- | --- |
| `/` | `src/routes/index.tsx` |
| `/auth` | `src/routes/auth.tsx` |
| `/reset-password` | `src/routes/reset-password.tsx` |
| `/choose-username` | `src/routes/choose-username.tsx` |
| `/app` | `src/routes/app.tsx` |
| `/waitlist`, `/directory`, `/directory/firms/$slug`, `/demofirminteligence`, `/playbook`, `/playbook/$slug`, `/resources`, `/tools`, `/tools/cv-analyser`, `/the-bar`, `/the-bar/preview`, `/the-bar/browse`, `/the-bar/challenge/$id`, `/the-bar/history`, `/the-bar/leaderboard`, `/applications`, `/profile/edit`, `/u/$username`, `/opportunities`, `/dock-lab`, `/tour-lab`, `/beta`, `/beta/round-2`, `/unsubscribe` | matching `src/routes/...tsx` files |
| All `/admin/*` URLs | `src/routes/admin/*` under a layout that wraps `AdminLayout` |
| `/vacancies`, `/admin/vacancies`, `/opportunities-preview` | `beforeLoad` `redirect()` to canonical URL in those route files |

Each route file:
- Uses `createFileRoute("/path")({ component: ExistingPageComponent })`
- Imports the existing page from `@/pages/...` so component code is **not rewritten**
- Wraps shared layout via the `Layout` component (or moves `Layout` into a pathless `_layout.tsx`)

### Step 3 — Replace `react-router-dom` usage in components
Search/replace across the codebase (mechanical — same APIs exist in TanStack Router):
- `useNavigate` → from `@tanstack/react-router`
- `useLocation` / `useSearchParams` → `useLocation` / `useSearch`
- `<Link to="...">` → from `@tanstack/react-router`
- `<Navigate to="..." replace />` → throw `redirect({ to: "..." })` in `beforeLoad`

Page logic, Supabase calls, UI all stay intact.

### Step 4 — Strip the dead workarounds
- Remove `<BrowserRouter>` and the route table from `src/App.tsx` (App.tsx becomes obsolete — the root is now `__root.tsx`).
- Remove `public/_redirects`.
- Remove the `spaFallbackPlugin()` 404.html copy from `vite.config.ts`.
- Remove `react-router-dom` from `package.json`.

### Step 5 — Verify end-to-end after publishing
- `curl -I https://locustest.lovable.app/auth` → 200
- `curl -I https://locustest.lovable.app/tools/cv-analyser` → 200
- `curl -I https://locustest.lovable.app/app` → 200
- Sign in with Google → lands on `/app` rendered, no "Not Found" flash
- Hard-refresh on `/tools/cv-analyser`, `/applications`, `/admin/opportunities` → the page renders, not the host 404
- Once verified, you can safely re-attach the custom domain — it will inherit the working routing.

## Why this is the right call (and not another patch)

- `_redirects` file: ignored by this hosting tier — already proven.
- The `404.html` Vite plugin: ignored too — even the freshly-published build returns the host's plain-text "Not Found" on every deep link.
- `HashRouter`: would work but breaks every existing shared link, every email link, every Google-indexed URL, and the OAuth callback URL pattern.
- TanStack Start file routes: this is the routing system Lovable hosting is **designed** to serve. Deep links, hard refreshes, OAuth callbacks, and shared URLs all just work — that's literally what the hosting layer does for it.

## Scope honesty

This is a real migration touching every page and the router shell, but it's mechanical:
- Page component code: unchanged
- Supabase / auth / business logic: unchanged
- Styling, UI, design system: unchanged
- Only the routing wiring changes

After it ships once, the entire class of "works in preview, broken on live" 404 problems is gone for good — on the Lovable domain and on any custom domain you reattach later.