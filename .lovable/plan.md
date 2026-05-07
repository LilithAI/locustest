## Problem

After Google sign-in, you land on `https://lexleaks.com/app#access_token=...&refresh_token=...&token_type=bearer`.

That hash format is the **Supabase implicit-flow callback** — it means the request went straight to Supabase's `/auth/v1/callback` and Supabase redirected back to your `redirect_uri` (`/app`) with tokens in the URL hash. The Lovable Cloud OAuth broker (`/~oauth/*`) is **not** intercepting the return trip, otherwise the broker would call `setSession(tokens)` in code and there would be no hash in the URL.

Two things go wrong as a result:
1. The URL is ugly and leaks tokens into browser history / referrer headers.
2. On the custom domain (`lexleaks.com`), the broker proxy isn't catching the callback path either, which is why you previously saw "Not Found".

## Root cause

`src/integrations/lovable/index.ts` calls `lovableAuth.signInWithOAuth(...)`. When the broker route is reachable it returns `{ tokens }` and we call `supabase.auth.setSession(tokens)`. When it isn't reachable (or Google's redirect URI in Google Cloud is still pointed at Supabase's domain instead of `oauth.lovable.app`), the SDK falls back to a plain Supabase OAuth redirect — which is exactly what's happening here.

## Plan

1. **Confirm broker reachability on both domains**
   - From the browser, hit `https://lexleaks.com/~oauth/initiate` and `https://locustest.lovable.app/~oauth/initiate` and check the response (should be a 302 to `oauth.lovable.app`, not 404 / SPA HTML).
   - If either returns 404, the Cloudflare worker that owns `/~oauth/*` isn't bound to that hostname → re-add the custom domain or republish.

2. **Make `/app` gracefully handle the hash callback (defensive fix in code)**
   - In `src/pages/AppHome.tsx`, before the "no session → redirect to /auth" check, detect `window.location.hash` containing `access_token=`, await `supabase.auth.getSession()` (so `detectSessionInUrl` can finish), then `history.replaceState` to strip the hash. This prevents the redirect-loop / blank state and removes the token from the URL bar even when the broker isn't used.

3. **Verify Google Cloud Console redirect URI**
   - The OAuth client's "Authorized redirect URIs" must include `https://oauth.lovable.app/callback` (the broker) — not just `https://wksqrdinlrgkjnncanui.supabase.co/auth/v1/callback`. If only the Supabase URI is configured, the broker route can never complete and the SDK will keep falling back to the implicit hash flow.

4. **Smoke test**
   - Incognito on `lexleaks.com/auth` → Continue with Google → expect to land on `/app` with a clean URL (no `#access_token`) and a logged-in session.
   - Repeat on `locustest.lovable.app` and the preview URL.

## Technical notes

- Files touched: `src/pages/AppHome.tsx` only (small defensive hash-cleanup block). No changes to `src/integrations/lovable/index.ts` (auto-generated).
- No DB migrations.
- The Google Cloud Console step (3) is something only you can verify — I'll point to where to check.
- If step 1 shows the broker is 404 on `lexleaks.com`, the real fix is on the hosting / custom-domain side (re-add domain, republish), not in app code.

## Open question

Before I implement, I need one piece of info — see the question below.