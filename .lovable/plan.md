## Plan

Update the production fallback routing exactly as requested, then verify the generated deploy output and the live site behavior.

### What I’ll change
1. Normalize `public/_redirects` so it contains exactly:
   ```text
   /* /index.html 200
   ```
2. Keep `vercel.json` as the Vercel fallback rewrite if that deployment path is in play.
3. Confirm the Vite build outputs `dist/_redirects` at the root so the fallback rule is actually included in deploy artifacts.

### Validation
1. Build the app and confirm `dist/_redirects` exists with the exact rule.
2. Confirm the live production URL for `/app` returns the SPA shell instead of a server 404 after publish.
3. If the repo output is correct but production still 404s, treat it as a deployment-layer issue rather than an app-code issue.

### Technical details
- Vite copies everything from `public/` to the root of `dist/` automatically, so the correct fix is to ensure `public/_redirects` has the exact content and then verify the emitted artifact.
- `vercel.json` should remain as:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- After implementation, the frontend change still requires **Publish → Update** before the live domain can stop returning 404 on deep links.