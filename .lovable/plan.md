## Fix plan: make live routing behave like preview

### What’s actually broken
- **Preview works** because the dev server always boots the client app and lets `react-router-dom` handle URLs in memory.
- **Live breaks** because direct requests like `/auth`, `/app`, and `/tools/cv-analyser` are returning a **server-level 404 before React starts**.
- I verified this is **not limited to CV Analyser**:
  - `/` returns 200
  - `/auth` returns 404
  - `/app` returns 404
  - `/tools/cv-analyser` returns 404
- The repo confirms why:
  - there is **no `src/routes/`**
  - `src/App.tsx` uses **`BrowserRouter` + `react-router-dom`**
  - the added `public/_redirects` is being **ignored** in this setup, so it cannot be the permanent fix here

### Root cause
This app is still built as an older **client-side Vite SPA**, while the published environment expects route handling to come from the app’s actual route architecture. Right now only `/` is guaranteed to boot. Any direct deep link dies at the host layer.

## Permanent fix
### 1) Stop treating this like a pure client-side SPA
- Replace the `BrowserRouter` route table in `src/App.tsx` with proper **TanStack Start file-based routes** under `src/routes/`
- Keep all existing public URLs unchanged:
  - `/auth`
  - `/app`
  - `/applications`
  - `/tools`
  - `/tools/cv-analyser`
  - `/admin/*`
  - etc.

### 2) Create the proper route shell
- Add:
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
  - route files for each current page path
- Move shared wrappers into the root/layout route:
  - theme provider
  - query client
  - toasts
  - command palette
  - chunk/version/session helpers where appropriate

### 3) Migrate route behavior without changing product behavior
- Preserve the current screens and route URLs
- Recreate nested admin routing using route layout files instead of nested `react-router-dom` config
- Convert redirects like:
  - `/vacancies` → `/opportunities`
  - `/opportunities-preview` → `/opportunities`
  - admin nested redirects

### 4) Add correct not-found/error handling
- Add a root `notFoundComponent` so unknown URLs render the app’s styled 404 instead of failing invisibly
- Add route error boundaries where loaders or protected views need them

### 5) Remove the dead-end workaround
- Remove `public/_redirects` after migration since it is not the correct mechanism here
- Remove the `react-router-dom` bootstrap once all routes are migrated

### 6) Validate every affected live URL path
After migration, verify deep linking behavior for:
- `/auth`
- `/app`
- `/applications`
- `/tools/cv-analyser`
- `/admin`
- `/admin/opportunities`
- a fake route to confirm the styled 404 appears

## Expected outcome
- Refreshing any real route on the live site will open the correct page
- Links opened in a new tab will work
- login redirects will stop landing on host-level 404s
- the same routing behavior will exist in preview and production

## Technical note
This is **not a CV page bug** and **not an auth-only bug**. It is a routing architecture mismatch. The reason the earlier fix appeared plausible is that the symptom looked like a classic SPA fallback problem, but the evidence here shows the right permanent remedy is to migrate this app to the route system the published environment actually expects.