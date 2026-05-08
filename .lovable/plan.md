
**Fix Cloudflare build peer-dep error**

1. Create `.npmrc` in project root with:
   ```
   legacy-peer-deps=true
   ```
2. That's it — commit will trigger Cloudflare auto-redeploy. Build will then pass the install step and proceed to `vite build` → `dist/`.

After deploy succeeds, `locustest.pages.dev` will serve the real built app instead of raw source, and the MIME-type / blank page errors will be gone.
