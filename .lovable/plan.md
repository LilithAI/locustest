## Goal
Create a complete, downloadable backup of the current Lovable Cloud backend so you have a cold standby on your laptop. No changes to the live project.

## What gets backed up

| Component | Method | File |
|---|---|---|
| Database schema (tables, enums, functions, triggers, RLS) | `pg_dump --schema-only` | `schema.sql` |
| Database data (all rows in `public` schema) | `pg_dump --data-only` | `data.sql` |
| Auth users (incl. encrypted password hashes, identities) | `pg_dump` of `auth.users` + `auth.identities` | `auth_users.sql` |
| Storage files — `avatars`, `cvs`, `bar-sources`, `beta-screenshots` | Download via Supabase JS client, zip per bucket | `storage/<bucket>.zip` |
| Edge Functions code (28 functions) | Already in repo under `supabase/functions/` — copy snapshot | `edge-functions.zip` |
| Secrets (names only, NOT values) | List from `fetch_secrets` | `secrets-inventory.txt` |
| Storage bucket config (names, public flags) | JSON dump | `buckets.json` |
| Restore instructions | Markdown file | `RESTORE.md` |

All packaged into a single `locus-backup-YYYY-MM-DD.zip` in `/mnt/documents/` for download.

## Steps

1. **Verify Cloud is healthy** — `supabase--cloud_status` before dumping.
2. **Schema dump** — `pg_dump` against `SUPABASE_DB_URL`, schema-only, `public` + `auth` schemas.
3. **Data dump** — same DB, data-only, `public` schema. `auth.users` + `auth.identities` dumped separately so they're easy to restore selectively.
4. **Storage download** — script using service role key to list every object in each of the 4 buckets, download to `/tmp/storage/<bucket>/`, then zip.
5. **Edge functions snapshot** — zip `supabase/functions/` from the repo as-is.
6. **Inventory** — write `secrets-inventory.txt` with secret names you'll need to recreate manually (values can never leave Lovable).
7. **Write `RESTORE.md`** — exact commands to spin this up in a personal Supabase project later (create project → run schema.sql → run auth_users.sql → run data.sql → upload storage files → redeploy edge functions → re-add secrets).
8. **Bundle + checksum** — single zip with SHA256 hash printed in chat.

## What to know before you click "Implement plan"

- **Password hashes** restore cleanly into another Supabase project (bcrypt). Users keep their passwords on a restored copy.
- **Storage download size**: I'll measure first. If `cvs` or `beta-screenshots` is huge (>500 MB), I'll ask before zipping into one file vs splitting.
- **Secrets values** — Lovable doesn't expose them to me even with `fetch_secrets`. You'll need to copy `FIRECRAWL_API_KEY` and any others manually if you ever restore. Lovable-managed ones (`SUPABASE_*`, `LOVABLE_API_KEY`) regenerate automatically on a new project.
- **No changes to your live database.** This is read-only.
- **This is a one-time snapshot.** Re-run anytime you want a fresh backup — same script.

## Technical details

- Uses `psql`/`pg_dump` already in the sandbox, `SUPABASE_DB_URL` env var (already set).
- Storage downloads use `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` (already a secret). For the `avatars` public bucket, anon key would work, but service role handles all 4 uniformly.
- Output folder: `/mnt/documents/locus-backup-2026-05-08/` plus the final zip alongside it.
- I'll use `code--exec` for everything; no project files modified.

Approve and I'll run it end-to-end.
