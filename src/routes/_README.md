# src/routes/ — Lovable picker stubs

These files exist ONLY so Lovable's preview URL picker can list every page.
They are not wired into any router and render nothing at runtime.

Real routing lives in `src/App.tsx` using `react-router-dom`.

If you add/rename/delete a route in `src/App.tsx`, mirror the change here so
the picker stays in sync.
