
# Add `vercel.json` SPA fallback (belt-and-suspenders)

## Single change

Create `vercel.json` at the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Why

`public/_redirects` and the `spaFallbackPlugin` (emits `dist/404.html`) are already in the repo and cover Cloudflare Pages' two SPA fallback mechanisms. `vercel.json` is a no-op on Cloudflare but ensures the same fallback if the deployment ever lands on Vercel infra. Three independent safety nets, one global fix.

## Out of scope

No changes to `_redirects`, `vite.config.ts`, `src/App.tsx`, routing, OAuth, Cloud, Supabase, or edge functions.

## After approval

1. I add `vercel.json`.
2. **You click Publish → Update.** The fix cannot take effect on the current live build.
3. I re-run curl on `/directory/firms/aarna-law`, `/app`, `/the-bar`, `/admin` and confirm 200 + `text/html`.
