# Locus Legal — Fresh-Start Migration to v1

Move off the locked-out backend onto a new Lovable Cloud backend you fully own, then relaunch as **public v1**. Live `locus.legal` keeps running untouched until the very last step (DNS swap), which is reversible.

**Audit confirmed: ZERO third-party API keys needed.** All AI and email functionality already routes through Lovable-native services (`LOVABLE_API_KEY`, auto-provisioned and free).

---

## Phase 1 — Provision new backend (no risk to live site)

1. **Enable Lovable Cloud** → fresh Supabase project owned by your account, `LOVABLE_API_KEY` auto-set
2. **Enable Lovable AI Gateway** → confirms AI key is ready for the 12 AI-using edge functions
3. **Run all 94 migrations** from `supabase/migrations/` → recreates every table, RLS policy, enum, function, trigger
4. **Update `src/integrations/supabase/client.ts` + `.env`** to use new Cloud-injected env vars (replaces old hardcoded URL/key)

## Phase 2 — Email infrastructure (Lovable Emails)

1. **Set up email domain** `notify.locus.legal` → you'll add 2 NS records at your domain registrar
2. **Lovable Emails infrastructure auto-provisioned** (pgmq queue, cron dispatcher, suppression tables)
3. **Auth email templates** scaffolded with Locus branding
4. **Transactional email templates** — re-create the 9 existing ones (welcome, profile-nudge, app-status, vacancy-digest, vacancy-instant, bar-digest, broadcast, app-recap, opportunity-digest) as Lovable React Email templates
5. **Migrate edge function callers** — point send-* functions to the new `send-transactional-email` route

## Phase 3 — Edge functions

All 28 edge functions auto-deploy with the new project. Already wired to `LOVABLE_API_KEY` — no code changes needed for the AI ones. Email-related ones get migrated as part of Phase 2.

## Phase 4 — Copy public data from old → new

One-shot Node script (in `/tmp/`, not committed) that:
- Reads from old backend with the publishable anon key
- Writes into new backend with the new service role key

**Tables copied:**
- `firms` (directory)
- `bar_questions`, `bar_sources`, `bar_topics`
- `vacancies`, `cfps`, `moots`, `competitions` (live, non-expired)
- `profiles` (public fields only)

**NOT copied** (user-private, unreadable with anon key anyway):
- User accounts, applications, bar attempts, CVs, playbook progress, broadcasts history, AI logs, waitlist

## Phase 5 — Bootstrap admin

1. You sign up on `id-preview--*.lovable.app` with your real email
2. Run one SQL line in Cloud SQL editor:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('<your-new-uid>', 'admin');
   ```
3. Refresh → full admin panel restored

## Phase 6 — Test on preview (live site still untouched)

- Directory loads with firms
- The Bar: questions show, attempt one, score saves
- Opportunities: vacancies/CFPs/moots/competitions visible
- Admin panel: every tab works
- Sign-up flow + welcome email arrives
- One AI feature (e.g. CV analyse) returns a real response

**Do not proceed past this phase if anything is broken.**

## Phase 7 — Beta → v1 cleanup (frontend)

- Update `src/components/BetaBanner.tsx` → "v1.0 — now live" or remove
- Hide `src/pages/BetaChecklist.tsx` and `BetaRound2.tsx` from nav
- Replace "beta" copy with "v1" / remove
- Update SEO meta + sitemap

## Phase 8 — Publish + DNS swap (only user-visible moment)

1. Click **Publish** in Lovable
2. Connect `locus.legal` custom domain in Project Settings → Domains
3. Update A record at registrar → `185.158.133.1`
4. DNS propagates (5 min – few hours), traffic moves to new site
5. **Old backend stays alive untouched** — revert A record in 2 minutes if anything looks wrong

## Phase 9 — Founding-member email to 5 beta users

Short note: "Locus is graduating from beta to v1. Please re-sign up at locus.legal — takes 30 seconds. As a beta tester, you'll get a founding-member badge."

---

## What you keep vs lose

**Keep:** all code, schema, RLS, edge functions, design, playbook MDX, tools data, startups data, PDFs, directory firms, bar questions, opportunities (via copy script).

**Lose (acceptable at 5 beta users):** user accounts, applications, bar attempts, CVs, playbook progress, broadcast history, AI logs, waitlist signups.

---

## What I need from you during execution

1. **Now:** approve this plan
2. **Phase 2:** add 2 NS records at your domain registrar for `notify.locus.legal` (I'll give you the exact values)
3. **Phase 5:** sign up + run the SQL line (10 seconds)
4. **Phase 6:** click around the preview and confirm things work
5. **Phase 8:** flip the A record at your registrar to `185.158.133.1`

Total estimated time: **2–3 hours**, mostly waiting on DNS.

Approve and I start Phase 1 immediately.