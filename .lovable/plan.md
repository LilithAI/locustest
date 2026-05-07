## Fix `/admin/login` deep-link 404 — SPA fallback

Keep the existing `react-router-dom` setup. The only reason `/admin/login` (and every other deep link) returns a hard 404 is that the static host serves `dist/` literally — there's no `index.html` fallback for unknown paths.

### Change

Add `public/_redirects` with a single SPA catch-all:

```
/*    /index.html   200
```

Vite copies `public/` into `dist/` verbatim, so the published site picks it up automatically on the next deploy. No code changes, no router migration, no dependency bumps.

### Verify

1. Republish.
2. `curl -I https://locustest.lovable.app/admin/login` → expect `200` returning the SPA shell (not a 404 page).
3. Hit `/admin/login`, `/directory`, `/u/someone`, `/playbook/cold-email-law-firm` directly in the browser — each should load the right page.
4. Refresh on a deep route — should not 404.

### Out of scope

- TanStack Start migration (parked).
- Vite 7 upgrade.
- Any router/UI/auth changes.

That's the entire fix.
