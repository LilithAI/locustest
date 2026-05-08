# src/routes/ — Lovable picker stubs

These files exist only so Lovable's preview URL picker can discover routes in this project.

They use TanStack-style `createFileRoute()` declarations for editor discovery, but the live app still routes through `src/App.tsx` with `react-router-dom`.

Each stub returns `null` and should not be imported anywhere else.

If you add, rename, or remove a route in `src/App.tsx`, mirror that change here so the picker stays in sync.
