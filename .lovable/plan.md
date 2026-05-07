## What's broken

Every route on the preview URL is returning a plain `Not Found` (not the React app's 404 page) — `/vacancies`, `/opportunities`, `/the-bar`, even `/auth`. Only `/` works. This is **not** a code change you'd see in a file diff — it's a busted Worker bundle.

## Why

When the email infra was set up, it dropped `src/routes/lovable/email/queue/process.ts`, which `import`s from `@lovable.dev/email-js`. The package wasn't installed at that exact moment, so the next preview build failed:

```
Pre-transform error: Failed to resolve import "@lovable.dev/email-js"
File: src/routes/lovable/email/queue/process.ts:1:33
```

The package is installed now and `tsc` is clean — but the preview Worker is still serving the broken bundle from that failed build, which is why every non-root URL returns the worker's fallback `Not Found` instead of the SPA shell.

Also worth noting: this project is a **pure SPA** (only `tanstackRouter()` in `vite.config.ts`, no `tanstackStart()` plugin, no `src/start.ts`). That means the `lovable/email/*` server-route files don't actually run as server endpoints here — they only exist as route entries in the route tree. The cron job that points at `/lovable/email/queue/process` will 404 forever in this stack.

## Plan

1. **Force a fresh preview build** so the Worker stops serving the stale broken bundle. Touching `vite.config.ts` (no behaviour change, just bumping mtime) is enough to invalidate the cache and rebuild. After that, `/vacancies`, `/opportunities`, etc. should return the SPA shell again.

2. **Decide what to do with the email queue route.** Two options — pick one:
   - **(a) Move queue processing to a Supabase Edge Function** (`supabase/functions/process-email-queue/index.ts` already exists in the repo from an earlier setup). Repoint the pg_cron job at the edge function URL instead of `/lovable/email/queue/process`. This is the pattern the rest of your project already uses and it actually works in this SPA stack.
   - **(b) Keep the TanStack server route** — but that requires migrating the project to TanStack Start (add `tanstackStart()` plugin, create `src/start.ts`, change the deployment target). Big change, not what you asked for.

   Recommendation: **(a)**. It's a 5-minute change and matches the rest of your `supabase/functions/` setup.

3. **Delete `src/routes/lovable/email/queue/process.ts`** (and any sibling `lovable/email/*` server route files the email scaffolder may add) once (2a) is in place — they're dead code in this stack and just risk re-introducing a bad import later.

4. **Verify** by curling `/vacancies`, `/opportunities`, `/the-bar` — all should return `200` with the SPA HTML, not plain text `Not Found`.

## What I won't touch

- The `notify.lexleaks.com` domain setup — that part is fine, DNS is still verifying.
- The `email_send_state` → `email_send_dedupe` rename from the previous step — keep it.
- Any Bar / vacancies / auth code — not the cause.
