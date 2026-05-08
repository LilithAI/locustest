## Goal
Retry the Lovable custom-domain setup cleanly, verify whether deep-link 404s are fixed this time, and have a fallback ready if they aren't. **No app code changes** — this is purely a hosting/DNS exercise.

## Why this might work this time (and might not)
Last time: home loaded, `/directory` 404'd. Today's curl on `locustest.lovable.app` shows the same 404 from Cloudflare with `text/plain` — so the bug is in Lovable's edge layer for this project. Retrying could succeed if (a) Lovable has shipped a fix, or (b) the previous attempt had a Cloudflare proxy-mode mismatch that we set up cleanly this time. Otherwise we'll see the same 404 within 5 minutes of going live, and we cut over to Vercel.

## You do (steps 1–5)

### 1. Pick the domain to use
What's the domain bought from Hostinger? (e.g. `locus.legal`, or a subdomain like `app.locus.legal`.) Tell me which subdomain you want as Primary — `locus.legal` or `www.locus.legal`. Both should be added so both resolve.

### 2. Clean slate at Cloudflare
Before re-adding in Lovable, make sure DNS is in a known-good state:
- Log into Cloudflare → DNS for the domain.
- **Delete any old A/CNAME/TXT records** from the previous Lovable attempt (root `@`, `www`, `_lovable`). Stale records are the #1 cause of "domain attached but routing broken."
- Decide proxy mode now (next step depends on it).

### 3. Decide: Cloudflare proxy ON or OFF
- **OFF (DNS-only, grey cloud)** → use Lovable's standard A-record setup. Simpler. Recommended for the retry.
- **ON (orange cloud, proxied)** → must use Lovable's "Domain uses Cloudflare or a similar proxy" mode (CNAME-based). If you proxied last time without ticking that box, that alone could explain the failure.

### 4. Add the domain in Lovable
- Project Settings → Domains → Connect Domain.
- Enter the root domain (e.g. `locus.legal`).
- If you chose proxy ON in step 3, expand **Advanced** → tick **"Domain uses Cloudflare or a similar proxy"**.
- Add the records Lovable shows you at Cloudflare exactly (A `@` → 185.158.133.1 + TXT `_lovable`, OR the CNAME variant if proxied).
- Repeat **Add Domain** for `www.locus.legal` so both resolve.
- Set the one you want canonical as **Primary**.

### 5. Wait for status = Active
Watch the Domains page. Status flow: Verifying → Setting up → Active. Don't proceed until both rows show **Active** (usually 5–60 min, can take up to 72h). If it stalls in Verifying, DNS isn't propagating — recheck with [dnschecker.org](https://dnschecker.org).

## I do (steps 6–7) — once you tell me the domain is Active

### 6. Run the curl smoke test
I'll run, in parallel:
```
curl -I https://<domain>/
curl -I https://<domain>/directory
curl -I https://<domain>/resources
curl -I https://<domain>/u/test
curl -I https://<domain>/admin/login
```
**Pass criteria:** every URL returns `200` with `content-type: text/html`. Anything else (404, text/plain, Cloudflare error page) = failure.

### 7. Tell you the result
- **Pass** → republish, update `index.html` canonical/og:url + `public/sitemap.xml` to the new domain, update Supabase Site URL/redirect allowlist. Done.
- **Fail (same 404s)** → this is now a confirmed reproducible Lovable bug across two attempts. Stop retrying. Move on to the fallback.

## Fallback if retry fails
Connect the **same** Hostinger domain to Vercel instead — DNS just points at Vercel's IPs/CNAME instead of Lovable's. Existing `vercel.json` provides SPA fallback. ~15 min from "remove Lovable DNS records" to "Active on Vercel with deep links working." I'll write the exact steps when/if we get there.

## What I am NOT doing
- No edits to `App.tsx`, `vite.config.ts`, `vercel.json`, `public/_redirects`, or any route file.
- No HashRouter migration (still rejected for SEO/OAuth reasons).
- No changes to Supabase auth yet — only after a domain goes Active.
- No support ticket yet — we'll have stronger evidence after this retry.

## What I need from you to start
Just the domain name. Once you've completed steps 1–5 and Lovable shows **Active**, ping me and I'll run the curl test in step 6.
