## What's actually happening

You diagnosed it correctly. Two separate problems are stacked on top of each other:

1. **Google sign-in works**, but after the broker exchanges the tokens it drops you on the **root page** (`/`) instead of `/app`. That's why it "looks like nothing happened" — you're actually signed in, just on the wrong page.
2. When you then manually open `/app`, you sometimes get **Not Found**. That's because the live `lexleaks.com` build is older than the current code and doesn't know the `/app` route yet. It will go away the moment you Publish → Update.

### Why the redirect lands on `/`

- We pass `redirect_uri: window.location.origin` (= `https://lexleaks.com/`) to the OAuth broker.
- After Google → broker → it puts the session in storage and reloads the page **at that redirect URI** — i.e. the homepage.
- The `navigate(postLoginPath)` line in `Auth.tsx` never runs, because the browser left the page during OAuth. So our `sessionStorage.setItem("post_oauth_redirect", "/app")` value is just sitting there, unused.

## Fix

### 1. Auto-forward to the intended page after OAuth (`src/App.tsx`)

Add a tiny pre-mount check that runs on **every** page load:

- If `sessionStorage` has `post_oauth_redirect`, **and** there's a live Supabase session, **and** we're currently sitting on `/` (or wherever the broker dropped us, but not already on the target), then `window.location.replace(target)` to that path and clear the key.
- This piggybacks on the existing pre-mount block that already handles the legacy `#access_token=…` case, so it's the same pattern.

This makes it bulletproof regardless of whether the broker lands on `/`, `/~oauth/callback`, or anywhere else.

### 2. Belt-and-suspenders in `src/pages/Auth.tsx`

Keep the existing `sessionStorage.setItem("post_oauth_redirect", postLoginPath)` line so the rescuer in step 1 has something to read. No other change needed there.

### 3. Publish

After the code change above, **click Publish → Update** so `lexleaks.com` actually has the `/app` route. Until that happens, even a perfect redirect will hit a 404 because the live bundle's router doesn't know `/app` exists.

## Verifying

After implementing + publishing:
1. Sign out, go to `lexleaks.com/auth`, click Continue with Google, pick `admin@locus.legal`.
2. You should land directly on `lexleaks.com/app`, signed in, dashboard loaded.
3. Reloading `/app` directly should also work (no 404).

## Out of scope

- We are NOT touching the broker file (`src/integrations/lovable/index.ts`) — it's auto-generated.
- We are NOT changing how usernames or admin login work.
- No DB or auth-config changes.
