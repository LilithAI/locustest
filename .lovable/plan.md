## Plan — lightweight Lovable page picker

Goal: get the Lovable preview URL dropdown to list every page in the app, without changing how routing actually works (`react-router-dom` in `src/App.tsx` stays in charge).

### Approach

Create thin stub files under `src/routes/` — one per public route — that exist purely so Lovable's picker can scan them and populate the dropdown. They are not wired into any router and their components never render in the live app. The real routing is unchanged.

### What gets created

One stub per route from `src/App.tsx`, using TanStack flat-dot naming so the picker shows clean URLs:

```text
src/routes/
  __root.tsx                              (root shell stub)
  index.tsx                               (/)
  app.tsx                                 (/app)
  waitlist.tsx
  directory.tsx
  directory.firms.$slug.tsx               (/directory/firms/:slug)
  playbook.tsx
  playbook.$slug.tsx
  resources.tsx
  tools.tsx
  tools.cv-analyser.tsx
  the-bar.tsx
  the-bar.preview.tsx
  the-bar.browse.tsx
  the-bar.challenge.$id.tsx
  the-bar.history.tsx
  the-bar.leaderboard.tsx
  applications.tsx
  profile.edit.tsx
  u.$username.tsx
  opportunities.tsx
  dock-lab.tsx
  tour-lab.tsx
  auth.tsx
  reset-password.tsx
  choose-username.tsx
  beta.tsx
  beta.round-2.tsx
  unsubscribe.tsx
  admin.tsx
  admin.index.tsx                         (/admin)
  admin.login.tsx
  admin.waitlist.tsx
  admin.bar.tsx
  admin.beta.tsx
  admin.opportunities.tsx
  admin.firm-suggestions.tsx
  admin.broadcasts.tsx
  admin.admins.tsx
  admin.insights.tsx
  admin.firm-intelligence.tsx
  admin.firm-intelligence.$slug.edit.tsx
```

Plus a small README (`src/routes/_README.md`) calling this out as a picker-only stub directory so future-me doesn't get confused.

### Stub file shape

Each file is a one-liner that parses cleanly and does nothing at runtime:

```tsx
// Picker stub only — real routing lives in src/App.tsx (react-router-dom).
export {};
```

That's it. No `createFileRoute`, no imports of TanStack packages. Lovable's picker reads the filenames; the file just needs to be a valid TS module.

### Validation

1. Build still succeeds (no new deps, no new runtime code).
2. The actual app routes still work in preview (`/admin`, `/the-bar/leaderboard`, `/directory/firms/aarna-law`, etc.) — unchanged because `App.tsx` is untouched.
3. The Lovable preview URL dropdown lists the routes above.

### Tradeoffs (the "hack" part)

- **Drift:** if you add/rename/delete a real route in `App.tsx`, the picker won't know unless I also update `src/routes/`. I'll note this in the README so we remember.
- **Picker-only:** clicking a route in the picker just navigates the URL; `react-router-dom` then handles it normally. There is no SSR / file-based routing benefit — only the dropdown.
- **If the picker requires real `createFileRoute()` calls** (not just filenames), the empty-stub trick won't work and I'll fall back to a one-line `createFileRoute` stub that returns `null` — same idea, slightly more boilerplate. I'll detect this on first verification.

### Out of scope

- No Vite upgrade, no TanStack Router migration, no changes to `App.tsx`, `main.tsx`, auth, OAuth, Supabase, or styling.
- No `_redirects` / `vercel.json` changes.