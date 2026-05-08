## Goal
Enable Google sign-in on `/auth` while the app is hosted on Cloudflare Pages, using **your own Google OAuth client** (BYOK) instead of Lovable's managed proxy.

---

## Part 1 — One-time setup you do (outside the code)

### A. Create the Google OAuth client (~5 min)

1. Go to https://console.cloud.google.com/ → create or pick a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - App name: `Locus` (or `Lex Leaks`)
   - User support email: your email
   - Authorized domains: add `lexleaks.com` and `lovable.app`
   - Scopes: add `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
   - Save. (Leave in "Testing" mode is fine; add yourself as a test user.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Locus Web`
   - **Authorized JavaScript origins** — add ALL of these:
     ```
     https://locustest.pages.dev
     https://locustest.lovable.app
     https://id-preview--7785818b-33d9-4330-9e64-6f30a1f4e2be.lovable.app
     https://one.lexleaks.com
     https://lexleaks.com
     http://localhost:8080
     ```
     (Skip any you don't actually use.)
   - **Authorized redirect URIs** — add exactly this one (Supabase's callback):
     ```
     https://wksqrdinlrgkjnncanui.supabase.co/auth/v1/callback
     ```
4. Click **Create**. Copy the **Client ID** and **Client Secret** — you'll paste them into Lovable Cloud next.

### B. Paste credentials into Lovable Cloud

1. Open **Cloud → Users → Auth Settings → Sign-in methods → Google**.
2. Enable Google, paste **Client ID** and **Client Secret**, save.
3. Confirm the displayed callback URL is `https://wksqrdinlrgkjnncanui.supabase.co/auth/v1/callback` (matches what you put in Google).

### C. Set Supabase Site URL & Redirect URLs

In **Cloud → Users → Auth Settings → URL Configuration**:
- **Site URL:** `https://locustest.pages.dev` (or your final Cloudflare/custom domain)
- **Redirect URLs (allowlist):** add
  ```
  https://locustest.pages.dev/**
  https://one.lexleaks.com/**
  https://lexleaks.com/**
  http://localhost:8080/**
  ```

---

## Part 2 — Code change I'll make

The Google button on `/auth` is currently wired to `lovable.auth.signInWithOAuth("google", …)` — that goes through Lovable's `/~oauth/*` proxy, which doesn't exist on Cloudflare Pages. For BYOK we call Supabase directly, which redirects browser → Google → `…supabase.co/auth/v1/callback` → back to your app.

**File:** `src/pages/Auth.tsx`

Replace the lovable broker call with:

```ts
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}${postLoginPath}`,
    queryParams: { prompt: "select_account" },
  },
});
if (error) throw error;
// Browser is now redirecting to Google — no further code runs.
```

Also remove the now-unused `lovable` import. The existing `useAuthSession` hook + `onAuthStateChange` already handle the post-callback session, so no other code changes are needed.

---

## Part 3 — Verification checklist

After deploy:
1. Hit `https://locustest.pages.dev/auth` → click "Continue with Google" → Google account picker appears.
2. After consent, you land back on `/app` signed in.
3. A row exists in **Cloud → Users** with `provider: google`.

If it fails, the most common errors and fixes:
- **`redirect_uri_mismatch`** → the URI in the Google client doesn't exactly match `https://wksqrdinlrgkjnncanui.supabase.co/auth/v1/callback` (no trailing slash, https, exact case).
- **`Unsupported provider`** → Google not enabled in Cloud → Users → Auth Settings.
- **Lands on Cloudflare 404 after Google** → your Cloudflare domain isn't in Supabase's Redirect URLs allowlist, or `_redirects` isn't catching the SPA route (check `public/_redirects` has `/* /index.html 200`).

---

## What I need from you before implementing

Just confirm you want me to swap the Google button to direct Supabase OAuth (Part 2). You can do Part 1 in parallel — the code change is safe to ship even before the Google client exists; the button will just show a Supabase error until credentials are pasted in.