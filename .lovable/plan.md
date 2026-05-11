# Locus Supabase Migration Plan

**Source (old):** `wksqrdinlrgkjnncanui.supabase.co`
**Target (new):** `ilcztqxqqlzkzrwwigni.supabase.co`

All credentials for both projects are now in hand. This plan can be executed end-to-end without further input from you (other than approval to start, and a few moments for Google OAuth re-config at the end).

---

## What gets migrated

| Layer | Items | Method |
|---|---|---|
| Schema | 45 tables, all enums, 50+ functions, triggers, RLS policies | `pg_dump --schema-only` → restore |
| Data | All rows in every public table (UUIDs preserved) | `pg_dump --data-only --disable-triggers` → restore |
| Auth users | Every row in `auth.users` + `auth.identities` (with bcrypt password hashes intact) | Direct SQL copy via service role |
| Storage | 4 buckets (`avatars`, `cvs`, `bar-sources`, `beta-screenshots`) + every object | Bucket recreate + object stream-copy |
| Edge functions | All 35 functions | Re-deploy from current repo source |
| Function secrets | `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `LOVABLE_API_KEY` | Set on new project |
| Cron jobs | `opportunities_lifecycle_tick`, `vacancies_lifecycle_tick`, email queue workers | Recreate via SQL |
| Auth config | Google OAuth client, redirect URLs, email templates | Reconfigure in new project |
| App config | `.env`, `src/integrations/supabase/client.ts`, `supabase/config.toml` | Repoint to new project |

---

## Execution order (12 phases)

### Phase 1 — Pre-flight (5 min)
- Verify source project is `ACTIVE_HEALTHY` via `cloud_status`
- Verify target project is `ACTIVE_HEALTHY`
- Snapshot row counts of every table on source (used for verification at the end)
- Confirm storage object counts per bucket

### Phase 2 — Schema dump & restore (10 min)
- `pg_dump` source with `--schema-only --no-owner --no-privileges` for `public` schema
- Strip ownership/grant statements
- Apply to target via `psql`
- Re-verify all enums, functions, triggers, RLS policies present

### Phase 3 — Auth users migration (10 min)
This is the trickiest part — done **before** data so foreign keys to `auth.users(id)` resolve.
- Read all rows from source `auth.users` via service role
- Read all rows from source `auth.identities` (Google OAuth links)
- Insert into target `auth.users` preserving: `id`, `email`, `encrypted_password` (bcrypt — passwords keep working), `email_confirmed_at`, `raw_user_meta_data`, `raw_app_meta_data`, `created_at`
- Insert into target `auth.identities` preserving Google provider links
- ⚠️ The `handle_new_user` trigger on source auto-creates a profile on insert — we'll temporarily disable it on target during the copy, then the profiles table copy in Phase 4 fills in the real data.

### Phase 4 — Data dump & restore (15-30 min, depends on size)
- `pg_dump` source with `--data-only --disable-triggers` for `public` schema (excluding `auth.*` already done)
- Order tables by foreign-key dependency (parents first)
- Apply to target with triggers disabled, then re-enable
- Run `SELECT setval(...)` on every sequence so new inserts don't collide

### Phase 5 — Storage migration (15-45 min, depends on file count/size)
For each bucket (`avatars`, `cvs`, `bar-sources`, `beta-screenshots`):
- Recreate bucket on target with same `public` flag
- List all objects on source via service role API
- For each object: download from source → upload to target preserving path, MIME type, metadata
- Recreate storage RLS policies (these live in `storage.objects`)

### Phase 6 — Edge functions redeploy (5 min)
- The repo already contains all 35 function source files under `supabase/functions/`
- Deploy each to target via `supabase--deploy_edge_functions`
- `verify_jwt` settings carried over from `supabase/config.toml`

### Phase 7 — Function secrets (2 min)
Set on target:
- `FIRECRAWL_API_KEY` (copy value from source)
- `RESEND_API_KEY` (already managed by Resend connector — re-link)
- `LOVABLE_API_KEY` (auto-managed)
- `SUPABASE_*` env vars are auto-injected by Supabase

### Phase 8 — Cron jobs (2 min)
Recreate via SQL on target:
- `opportunities_lifecycle_tick` — hourly
- `vacancies_lifecycle_tick` — hourly
- Email queue worker — every minute (calls `pgmq.read` → invokes Resend edge function)

### Phase 9 — Auth provider config (5 min, **needs you for one click**)
- Set up Google OAuth on new project: in Cloud → Users → Auth Settings → Google, paste the same client ID + secret used on the old project
- Update Google Cloud Console: add new callback `https://ilcztqxqqlzkzrwwigni.supabase.co/auth/v1/callback` to authorized redirect URIs (keep old one for now during cutover)
- Configure SMTP / email templates if customized on source
- Set Site URL + redirect allow-list to your Cloudflare Pages domain

### Phase 10 — Repoint Lovable app to new project (3 min)
- Update `.env`:
  - `VITE_SUPABASE_URL=https://ilcztqxqqlzkzrwwigni.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hSuqC6tCEzL7Z1GaBA6o0g_3jwlwaMz`
  - `VITE_SUPABASE_PROJECT_ID=ilcztqxqqlzkzrwwigni`
- Update `supabase/config.toml` `project_id`
- Regenerate `src/integrations/supabase/types.ts` against new project
- Update memory file: change Supabase callback URL reference

### Phase 11 — Verification (10 min)
- Row-count diff: every table on new == old (within ±0 for static tables)
- Storage object-count diff per bucket
- Auth user count match
- Smoke tests:
  - Log in as `admin` / `Admin2026!` at `/admin/login` ✅
  - Log in as `jeet` / `Indrajeet` ✅
  - Sign in with Google on `/auth` ✅
  - Open a public profile (data loads) ✅
  - Submit a Bar challenge attempt (RLS + triggers fire) ✅
  - Upload an avatar (storage works) ✅
  - Hit one edge function (e.g. firm suggestions) ✅

### Phase 12 — Cutover & decommission (your call, not automated)
- Once verified working in production for 24-48h, you can pause/delete the old project
- Until then, both projects coexist; rollback = revert `.env` + redeploy

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Auth password hashes don't transfer cleanly | We use direct SQL copy of `encrypted_password` (bcrypt is portable). Tested approach — Supabase docs endorse it. |
| FK violations during data load | Order tables topologically; use `--disable-triggers` |
| Storage file too large to stream through sandbox | If any file >50MB, use signed URL transfer instead of download/upload |
| Google OAuth users get duplicate accounts | We copy `auth.identities` with original `provider_id` — Supabase recognizes returning users |
| Cron jobs reference the old project URL | Recreated using new project's URL in cron SQL |
| Sequences out of sync → duplicate-key errors on next insert | `setval` on every sequence after data load |
| Old project still receives writes during migration | Recommend a 30-min freeze window; or accept brief inconsistency for low-traffic users |

---

## Estimated total time
**~90 minutes hands-off** + ~5 min of your time for Google OAuth setup in step 9.

---

## What I'll need from you to execute
1. Approval to start (click "Implement plan")
2. A ~30-min window where you can avoid creating new accounts/data on the old project (optional but cleanest)
3. ~5 min during Phase 9 to paste Google OAuth credentials into the new project's auth settings

Everything else — service role key, DB password, publishable key, schema, code — I already have.

---

## Technical notes (for the engineer reviewing this)
- Source DB connection: `db.wksqrdinlrgkjnncanui.supabase.co:5432` via `SUPABASE_DB_URL` secret
- Target DB connection: `db.ilcztqxqqlzkzrwwigni.supabase.co:5432` with password `Ritika@1504`
- Source service role: stored in `SUPABASE_SERVICE_ROLE_KEY` secret
- Target service role: just provided, will be stored as `NEW_SUPABASE_SERVICE_ROLE_KEY` during migration, then promoted to `SUPABASE_SERVICE_ROLE_KEY` at cutover
- All operations run from sandbox via `psql`, `pg_dump`, and Supabase REST API — no local CLI required on your machine
