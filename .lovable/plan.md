## What's actually happening

When you click "Continue with Google", you end up at:

```
https://lexleaks.com/app#access_token=...&refresh_token=...&token_type=bearer
```

…and the page shows "Not Found". Two separate things are wrong:

### 1. The OAuth return URL is bypassing the Lovable broker

In `src/pages/Auth.tsx`, the Google button passes:

```ts
lovable.auth.signInWithOAuth("google", {
  redirect_uri: `${window.location.origin}${postLoginPath}`, // → https://lexleaks.com/app
});
```

A managed Lovable Google sign-in is supposed to come back to `/~oauth/callback`, where the broker exchanges the code and calls `supabase.auth.setSession(...)`. Instead, you're being redirected straight from Supabase with the tokens in the URL hash — that's the legacy Supabase implicit-flow redirect, not the managed broker flow. This happens when `redirect_uri` points at an arbitrary app path that the broker doesn't own.

### 2. `/app` is rendering as Not Found on the live custom domain

`/app` exists in `src/App.tsx` (line 169) and works in preview, but `https://lexleaks.com/app` shows the 404 page. That means the **published build on lexleaks.com is older than the code** — it predates the `/app` route. React Router's catch-all `*` route is matching and rendering `<NotFound />`. The hash (`#access_token=…`) is preserved through that match, which is why you see it in the URL.

So even after we fix the OAuth redirect, you also need to **publish (Update)** so the live site has the `/app` route.

## The plan

### Step 1 — Fix the OAuth redirect target in Auth.tsx

Change the Google sign-in to let the broker handle the callback, then route to `/app` (or the `next` param) **after** the session is set:

```ts
const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    void track("signup_started", { method: "google" });
    sessionStorage.setItem("post_oauth_redirect", postLoginPath); // remember intent

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin, // root — broker owns /~oauth/*
    });

    if (result?.redirected) return;            // browser is leaving for Google
    if (result?.error) {
      toast.error(result.error.message || "Failed to sign in with Google");
      return;
    }

    // Tokens already set on the supabase client → go to intended page
    const next = sessionStorage.getItem("post_oauth_redirect") || "/app";
    sessionStorage.removeItem("post_oauth_redirect");
    navigate(next);
  } catch (err: any) {
    toast.error(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};
```

### Step 2 — Add a tiny hash-token rescue in App.tsx

Until the new build is published, and as a safety net for any stale OAuth links already in the wild, add a pre-mount handler so a `#access_token=…` landing on any path is consumed and the user is sent to `/app` instead of the 404 page:

```ts
if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    void supabase.auth.setSession({ access_token, refresh_token }).finally(() => {
      const next = sessionStorage.getItem("post_oauth_redirect") || "/app";
      sessionStorage.removeItem("post_oauth_redirect");
      window.location.replace(next);
    });
  }
}
```

This runs before React mounts, so the user never sees the 404 flash even if a legacy redirect URL is still configured somewhere.

### Step 3 — Publish (manual, by you)

After the code change, click **Publish → Update** so `lexleaks.com` actually serves the build that contains the `/app` route. Frontend changes don't go live until you publish.

### Step 4 — Verify

After publishing:
1. Open `lexleaks.com` in an incognito window.
2. Click "Continue with Google".
3. Confirm: the URL after sign-in is a clean `https://lexleaks.com/app` with **no `#access_token=…`** in it, and the app dashboard renders.

## Out of scope (intentionally)

- No changes to Supabase Auth provider settings — managed Google OAuth in Lovable Cloud already covers `lexleaks.com`. Once the redirect_uri is the root origin, the broker takes over and the implicit-hash leak goes away.
- No changes to backend, DB, or RLS.
- The `locus.legal` handoff still works the same way: when ownership moves, the new workspace just reconfirms managed Google sign-in (or pastes their own client ID/secret). No code changes needed.
