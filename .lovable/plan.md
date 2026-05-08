# Fix: Restore SPA fallback so deep links don't 404

## Root cause
Cloudflare Pages has no instruction to fall back to `index.html` for unmatched paths, so direct loads of `/directory/firms/...`, `/app`, `/the-bar`, `/admin` return a hard 404 from the edge before React Router can mount.

`public/_redirects` exists with `/*  /index.html  200`, but the previous `spaFallbackPlugin` that emitted `dist/404.html` is no longer in `vite.config.ts` — so Cloudflare's secondary `404.html` mechanism has nothing to serve.

## Changes

### 1. `public/_redirects` (verify only)
Already present with the correct content:
```
/*    /index.html   200
```
No edit needed — keep as-is.

### 2. `vite.config.ts` — add back `spaFallbackPlugin`
Two small edits, nothing else touched:

a) Extend the existing `fs` import:
```ts
import { writeFileSync, mkdirSync, readFileSync } from "fs";
```

b) Add a new build-only plugin next to `writeVersionJsonPlugin`, and include it in the `plugins` array:
```ts
function spaFallbackPlugin(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      try {
        const outDir = path.resolve(__dirname, "dist");
        const src = path.join(outDir, "index.html");
        const dest = path.join(outDir, "404.html");
        const html = readFileSync(src, "utf-8");
        writeFileSync(dest, html, "utf-8");
        console.log("[spa-fallback] dist/404.html written");
      } catch (e) {
        console.warn("[spa-fallback] failed:", e);
      }
    },
  };
}
```
Then add `spaFallbackPlugin()` to the `plugins` array next to `writeVersionJsonPlugin()`.

## Out of scope
No changes to `src/App.tsx`, routing, auth flow, or any other file. Cloud, Supabase, and edge functions untouched.

## Verification
After republish:
1. `curl -I https://locustest.lovable.app/directory/firms/aarna-law` → 200, HTML body.
2. Open `/app`, `/the-bar`, `/admin`, `/tools/cv-analyser` directly in a new tab → page renders, no "Not Found".
3. Hard-refresh on any deep route → still works.
4. Real missing assets (e.g. `/nope.png`) still 404 (only unmatched HTML routes fall back).
