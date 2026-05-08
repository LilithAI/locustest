# Deploy to Cloudflare Pages

Cloudflare Pages free tier covers you easily: unlimited sites, unlimited bandwidth & requests, 500 builds/month, automatic SSL, global CDN. No cost unless you exceed 500 builds/month.

## What changes in the code

### 1. Add Cloudflare Pages config files
- **`public/_headers`** — security headers + cache rules for hashed JS/CSS assets (long cache) and HTML/`version.json` (no cache, so deploy detection keeps working).
- Keep existing **`public/_redirects`** (`/* /index.html 200`) — Cloudflare Pages reads the same file format as Netlify, so SPA routing works out of the box.
- Optional: a tiny **`wrangler.toml`** at root for reproducibility (not required if you configure in dashboard).

### 2. Mark Google sign-in as "coming soon"
In `src/pages/Auth.tsx`:
- Disable the Google button, change label to **"Google sign-in — coming soon"**, remove the click handler (or have it toast "Coming soon — use email for now").
- Leave all the wiring (`lovable.auth.signInWithOAuth`, `src/integrations/lovable/index.ts`) intact so we can flip it back on later when we wire native Supabase Google OAuth.

### 3. Update memory
Note in `mem://index.md` that the app is being moved from Netlify → Cloudflare Pages and Google login is temporarily disabled pending native Supabase OAuth setup.

## What you do in Cloudflare dashboard

1. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**
2. Authorize Cloudflare's GitHub app, pick your Locus repo
3. Build settings:
   - Framework preset: **None** (or "Vite")
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Build output directory: `dist`
   - Root directory: *(leave empty)*
   - Node version: add env var `NODE_VERSION` = `20`
4. **Environment variables** (Production + Preview both):
   - `VITE_SUPABASE_URL` = `https://wksqrdinlrgkjnncanui.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (the anon key — same one in your current `.env`)
   - `VITE_SUPABASE_PROJECT_ID` = `wksqrdinlrgkjnncanui`
   - `NODE_VERSION` = `20`
   - `NPM_FLAGS` = `--legacy-peer-deps`
5. Click **Save and Deploy** — first build runs ~2-3 min
6. Once green: **Pages project → Custom domains → Set up a custom domain** → enter your domain. Since it's already on Cloudflare DNS, attaching takes one click — no DNS records to copy/paste, SSL auto-provisions in seconds.

## After it's live

- Verify: open the domain, sign in with email/password, check that admin login works at `/admin/login`
- You can leave Netlify deployed in parallel as a fallback for a few days, then disconnect it
- When ready for real Google login, separate task: create Google OAuth client in Google Cloud Console + paste credentials into Supabase auth providers, then re-enable the button

## Out of scope (intentionally)
- Native Supabase Google OAuth wiring — deferred per your choice
- Touching Supabase, edge functions, AI keys — they're host-agnostic, nothing to migrate
- Removing Netlify — keep `netlify.toml` around as backup until Cloudflare is verified stable
