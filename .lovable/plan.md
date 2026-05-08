# Fix every "Not Found" on production deep links — once and for all

## Root cause

The app uses **React Router (`BrowserRouter`)** — pure client-side routing. When you click a `<Link>` inside the app it works fine. But when the browser asks the host directly for a path like:

- `/tools/cv-analyser`
- `/auth`
- `/applications`
- `/admin/...`
- `/firms/...`
- any other non-root URL

…on a hard refresh, paste, new tab, OAuth redirect, or shared link — the hosting layer must serve `index.html` so React can boot and resolve the route. Right now there is **no SPA fallback file**, so the host returns its own bare-text "Not Found" for anything that isn't `/` or a real static file.

Evidence:
- Screenshot shows plain `Not Found` (host-level), not the styled 404 from `src/pages/NotFound.tsx` (which would mean React booted).
- `public/_redirects` does not exist.
- Preview works because the dev server has a built-in SPA fallback; production hosting does not.

This is a **single-file fix that resolves the entire class of bug** for every route in the app.

## The fix

Add `public/_redirects` with the standard SPA fallback rule:

```
/*    /index.html   200
```

That tells the host: for any path that isn't a real file, serve `index.html` with HTTP 200 and let React Router handle it. Status 200 (not 301/302) is critical — it preserves the original URL so React Router sees `/tools/cv-analyser` instead of `/`.

## Why this also fixes the OAuth weirdness

The post-login redirect dance (`?v=…`, `?redirect=/app`, bouncing to `/auth`) gets worse when an intermediate URL returns 404 — the browser treats it as a hard error and the recovery scripts can't catch it. With the fallback in place, every URL the OAuth broker hands back to the app boots React cleanly.

## Files changed

- **`public/_redirects`** (new, 1 line)

That's the entire change. No code, no auth changes, no backend touches. The styled `NotFound.tsx` page will start working again for genuinely unknown routes (since React will now boot and render it instead of the host returning bare text).

## After publishing — verification checklist

Hard-refresh each in production (Cmd+Shift+R) and confirm the page renders, not bare "Not Found":

1. `lexleaks.com/tools/cv-analyser`
2. `lexleaks.com/applications`
3. `lexleaks.com/app`
4. `lexleaks.com/auth`
5. `lexleaks.com/admin/dashboard`
6. `lexleaks.com/some-fake-route` → should now show the **styled** 404 page (proof React booted)

If #6 shows the styled 404 instead of bare text, the fix is confirmed working everywhere.
