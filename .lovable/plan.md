## What you're actually seeing

The screenshot shows plain monospace `Not Found` on a white background at `/app`. That is **not** our `NotFound.tsx` page (which is styled, dark-themed, has a "Return to Home" link, and logs to console). It is the Lovable preview infrastructure returning a raw text 404 because **the dev sandbox went idle while your PC was locked**.

Evidence:
- `curl http://localhost:8080/app` → `200 OK` right now (the SPA serves fine when the sandbox is awake).
- Route `/app` is correctly registered in `src/App.tsx` line 209 (`<Route path="/app" element={<AppHome />} />`).
- The "Not Found" text in the screenshot has no styling, no nav, no footer — our React tree never rendered. If our app had rendered and hit a 404 route, you'd see the styled NotFound page.
- Preview header shows "Previewing last saved version" — that path is served by the static preview host, which sleeps on idle.

So this is a **third, separate failure mode** from the two we already fixed:
1. Stale chunk after deploy → fixed by chunkRecovery + ChunkErrorBoundary.
2. Stale CDN HTML loop → fixed by `reloadOnce()` guard in useVersionCheck.
3. **Preview sandbox idle-sleep** → returns raw 404 until you refresh once to wake it. This is platform behaviour, not app code.

## What to do

Two separate things, depending on which surface you actually care about:

### A. Production (lexleaks.com / locustest.lovable.app)
Nothing to do. Real users on the published site never hit the preview sandbox. The two fixes from earlier already cover the real-world failure modes there.

### B. The Lovable in-editor preview
The idle-sleep 404 is a Lovable platform behavior — we can't make the sandbox stay awake from app code. The pragmatic options are:

1. **Just refresh once.** When you come back, hit the refresh button in the preview header (the circular arrow next to the URL). The sandbox wakes in ~1–2 seconds and the SPA loads.
2. **Optional: tiny preview-only auto-retry shim** in `index.html` that detects a non-HTML response on first paint and reloads after 1.5s. This would only help inside the editor preview iframe and would do nothing on production. Adds ~15 lines to `index.html`. Low value, but possible.

## My recommendation

Don't add code for this. It's a non-issue on production, and on the editor preview a single manual refresh wakes it. Adding more reload logic risks interfering with the chunk-recovery counter we just stabilized.

If you want option B.2 anyway, say the word and I'll wire it scoped strictly to `id-preview--*.lovable.app` hosts so production is untouched.

## Verification

- Click the refresh icon in the preview header right now.
- `/app` should render the styled AppHome page (with nav, dock, etc.) within a couple of seconds.
- If it still shows raw "Not Found" after a full refresh, that's a different bug and I'll dig deeper.
