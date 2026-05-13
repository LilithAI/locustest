## Goal

Wrap the entire site in a launch-takeover page that announces Locus going public on **27 May 2026**, while letting you (and beta users who log in) keep building and using Locus behind it.

## Behaviour

- Every visitor to `locus.legal` lands on the takeover page — regardless of route.
- Logged-in users see a **dismissible banner** with the same message instead of being blocked, so beta usage continues.
- Admins are never blocked (login still works at `/admin/login`).
- A `?preview=1` query param (or hidden `/admin/login` link in the page) bypasses the gate so you can keep iterating on the real site.
- After 27 May 2026 00:00 IST the gate auto-disables (date check) — site goes back to normal with no redeploy needed.

## The page itself

Single new route `src/pages/Launch.tsx`, rendered as a takeover overlay (not part of the existing `Layout`):

1. **Headline**: "Locus is going public on 27 May 2026."
2. **Live countdown**: D / H / M / S to 27 May 2026 00:00 IST — bold, monospace, the visual centerpiece.
3. **Body copy**: the exact words you wrote (early users, accounts wiped, level playing field, no NLU tag / surnames, migration window warning, "first ones back through the door").
4. **Email capture**: single email field → "Notify me when re-signup opens" → stores into a new `launch_notify` table.
5. **Footer line**: "Re-signup link drops 27 May. Stay sharp." + tiny "Beta user? Sign in" link → `/auth` (so existing users can still get in).

Visual style matches the existing brutalist Locus look (black bg, accent border, Sora display font, hard shadows) — consistent with `BetaBanner`.

## Gating logic

New component `src/components/LaunchGate.tsx` mounted at the top of `App.tsx`, *outside* the router:

```text
if (now >= 2026-05-27 IST)        → render <App/> (gate off)
else if (?preview=1 in URL)        → render <App/>, set sessionStorage bypass
else if (sessionStorage bypass)    → render <App/>
else if (path starts with /admin)  → render <App/>  (admins always pass)
else if (logged-in user session)   → render <App/> + show <LaunchBanner/>
else                               → render <Launch/>  (full takeover)
```

Bypass is sticky for the session so you don't have to re-add `?preview=1` on every navigation.

## Database

One small table for the email capture:

- `launch_notify` — fields: `email`, `source` (defaults to "launch_page")
- RLS: anyone can insert; nobody can read (admins read via service role only)
- Unique index on `email` so duplicates silently no-op

## Files touched

- **New** `src/pages/Launch.tsx` — the takeover page
- **New** `src/components/LaunchGate.tsx` — the gating wrapper
- **New** `src/components/LaunchBanner.tsx` — slim banner for logged-in users
- **Edit** `src/App.tsx` — wrap `<BrowserRouter>` in `<LaunchGate>`
- **Edit** `src/components/Layout.tsx` — render `<LaunchBanner/>` (replaces or sits next to `BetaBanner`)
- **Migration** — create `launch_notify` table with RLS

## Out of scope

- No changes to existing auth, beta flow, or any other page.
- No deletion of beta data — that's a manual step for you on 27 May.
- No SEO/sitemap changes (takeover doesn't need to be indexed; we'll keep current SEO work intact).

Approve and I'll build it.