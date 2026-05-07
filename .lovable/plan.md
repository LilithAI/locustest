## Diagnosis

Google sign-in uses `lovable.auth.signInWithOAuth("google")`, which redirects the browser to `/~oauth/initiate?...`. That path is **not** a route in the app — it's intercepted by Lovable's edge proxy worker, which forwards the user to `oauth.lovable.app`, then to Google, then back. If the proxy doesn't intercept, the SPA falls through to its own 404 ("Not Found").

Evidence from the logs:
- `lovable.auth.signInWithOAuth` is wired correctly in `src/pages/Auth.tsx` and `src/integrations/lovable/index.ts`.
- Two successful Google logins via the broker today at 15:06 / 15:07 on `locustest.lovable.app` — so the integration code itself works.
- No PWA / service worker installed, so SW caching is not the cause.
- The user now reports "Not Found" on **both** the preview and `lexleaks.com` → the `/~oauth/initiate` request is reaching the SPA instead of being intercepted by the Lovable proxy.

Most likely causes (in order):
1. **Custom domain (`lexleaks.com`) not in `Active` state**, or DNS/proxy config drifted → the Lovable worker can't intercept `/~oauth/*` on that hostname.
2. **The published deployment on `locustest.lovable.app` is stale** relative to the connector/integration regeneration that happened during the recent migration work, so the proxy mapping is out of sync. Republishing reconciles it.
3. **Stale cached HTML / OAuth state** from a prior session sending the user to a path the new worker no longer recognises.

## Fix plan

### Step 1 — Regenerate the Lovable Cloud Google connector
Re-run the social-auth configure tool (`configure_social_auth` with `providers: ["google"]`). This:
- Reinstalls/refreshes `@lovable.dev/cloud-auth-js` and `src/integrations/lovable/index.ts`.
- Forces the workspace to re-emit the `/~oauth/*` route mapping for this project on both the preview and published hostnames.

### Step 2 — Republish
Trigger a fresh publish so `locustest.lovable.app` and the lexleaks.com edge bindings pick up the regenerated OAuth proxy config.

### Step 3 — Verify custom domain status
Use the project URLs / domain status check to confirm `lexleaks.com` and `www.lexleaks.com` are **Active** (not Verifying / Offline / Failed). If Offline or Failed, surface the fix-DNS instructions to you — Lovable will not intercept `/~oauth/*` on a domain that isn't fully Active.

### Step 4 — Smoke test
After publish, test in this order, each in a fresh incognito window (to bypass cached state):
1. `https://id-preview--7785818b-33d9-4330-9e64-6f30a1f4e2be.lovable.app/auth` → click Continue with Google.
2. `https://locustest.lovable.app/auth` → same.
3. `https://lexleaks.com/auth` → same.

For each, network panel should show a 302/redirect from `/~oauth/initiate` to `oauth.lovable.app`, **not** a 200 with the SPA's NotFound HTML. If any one still 404s, capture the response of `/~oauth/initiate` from that hostname so we can tell whether the proxy is missing or returning an error.

### Step 5 — If lexleaks.com still 404s after Active + republish
Fall back to either:
- Re-add the custom domain in Project Settings → Domains (this re-registers the OAuth allowlist entry), or
- Enable Cloudflare/proxy mode if the domain is fronted by Cloudflare, since A-record vs CNAME setup affects how `/~oauth/*` is intercepted.

## What this plan does NOT change

- No code changes to `Auth.tsx` or any OAuth call sites — they're already correct.
- No Supabase auth provider edits — managed Google OAuth is already enabled (auth logs confirm).
- No new admin / login UI work.

## Open question (non-blocking)

If after Step 1-2 you still see "Not Found" on the **preview** specifically, the most informative next step is for you to open DevTools → Network on the failing page, click Continue with Google, and tell me what the response status of the `/~oauth/initiate` request is (or screenshot it). That pinpoints whether the proxy is missing entirely (404 from origin), misrouted (HTML payload), or erroring (5xx).
