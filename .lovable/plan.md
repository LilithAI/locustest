## Fix the white screen (hydration mismatch in TanStack root)

The white screen is caused by `<ClientOnly>` in `src/routes/__root.tsx` rendering a `<div />` fallback on the server pass and `<App />` on the client — React throws the whole tree on mismatch. The fix is to stop conditionally rendering at the root and let a single client-mounted gate inside the splat route own the hydration boundary.

### 1. `src/routes/__root.tsx`
- Remove the `ClientOnly` import and the `<ClientOnly fallback={<div />}><App /></ClientOnly>` wrapper.
- Remove the `lazy(() => import("../App"))` import — `App` will be mounted by `$.tsx` instead.
- Inside `<div id="root">`, render `<Outlet />` directly (drop the `<App />` line entirely; `Outlet` is already there).
- Add `suppressHydrationWarning` to `<body>` as a safety net for the FB pixel + analytics scripts.
- Add `notFoundComponent` and `errorComponent` to `createRootRoute` (currently missing — required by our TanStack rules).
- Keep everything else exactly as-is: all `<head>` meta, font preloads, inline `@font-face` CSS, FB pixel script, JSON-LD, `<HeadContent />`, `<noscript>` pixel in body, `<ClientBootstrap />`, `<Scripts />`, and the existing `head: () => ({...})` block on the route.

### 2. `src/routes/$.tsx`
Replace the `() => null` component with a real splat that mounts the legacy `App` (which still owns the react-router-dom tree) only after client hydration:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/$")({
  component: SplatRoute,
});

function SplatRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <Suspense fallback={null}><App /></Suspense>;
}
```

### 3. `src/routes/index.tsx`
Make `/` render the same client-only `App` mount so the home page isn't blank. Simplest and TS-safe: duplicate the splat pattern rather than redirect (TanStack's `redirect({ to: "/$" })` is awkward for splat targets):

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <Suspense fallback={null}><App /></Suspense>;
}
```

### 4. `vite.config.ts`
No change. Verify `tanstackStart({ spa: { enabled: true }, ... })` remains in plugins.

### Import source note
Your pasted prompt uses `@tanstack/react-start` for `createRootRoute`/`createFileRoute`/`Outlet`. In this project those come from `@tanstack/react-router` (which is what the existing files use). I'll keep `@tanstack/react-router` to avoid breaking the working imports.

### Verification after apply
1. Hard reload `/` — expect the homepage, not a white screen.
2. Visit `/auth`, `/the-bar`, `/directory`, `/admin/login` — each should render its react-router-dom page.
3. Console: no "Hydration failed" / "Text content does not match" errors; no 401s on `/src/...` module fetches.
4. Refresh on a deep link (e.g. `/admin/login`) — still renders (splat catches it).

### Why this works
SPA-mode TanStack still runs one server render pass for the route shell. `ClientOnly` deliberately diverges server vs client output — that's the mismatch. Moving the "wait for hydration" gate *inside* a leaf route component (not the root layout) keeps the server and first client render identical (`null`), then swaps in `<App />` on the second render — which is a normal React state transition, not a hydration mismatch.
