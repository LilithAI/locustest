## Goal

Produce a complete, importable backup of your Lovable Cloud Supabase project — schema, data, and storage files — so you have a copy on an account you own. The live app stays on Lovable Cloud, untouched.

## Deliverables

Three files in `/mnt/documents/`, downloadable from the Files view:

1. **`schema.sql`** — every public-schema object: tables, enums, functions, triggers, RLS policies, indexes. Drop-in importable to any Postgres 15+.
2. **`data.sql`** — every row from every public-schema table, as `COPY` statements (fast, idempotent restore).
3. **`storage-files.zip`** — every file from your 4 storage buckets (`avatars`, `cvs`, `bar-sources`, `beta-screenshots`), preserving folder structure.
4. **`README.md`** — copy-paste import commands for your personal Supabase project.

Excluded (intentionally):
- `auth.*` tables (you said fresh start is fine)
- Lovable-managed schemas (`pgmq`, `vault`, `realtime`, `storage` schema itself)
- Edge functions (those live in this repo's `supabase/functions/` — already on GitHub)

## Approach

### Step 1 — Schema dump
Run `pg_dump --schema-only --schema=public --no-owner --no-privileges` against `SUPABASE_DB_URL` (already in secrets). Strip Lovable-specific role grants. Output → `schema.sql`.

### Step 2 — Data dump
Run `pg_dump --data-only --schema=public --no-owner --column-inserts=false` (uses fast `COPY`). Output → `data.sql`.

### Step 3 — Storage files
For each bucket, list all objects via the Supabase Storage API (using `SUPABASE_SERVICE_ROLE_KEY`), download each file, preserve the path. Zip the whole tree as `storage-files.zip`.

### Step 4 — README with import instructions
Plain-English steps:
1. Create new Supabase project at supabase.com
2. Open SQL Editor → paste & run `schema.sql`
3. Open SQL Editor → paste & run `data.sql`
4. Create the 4 buckets manually in Storage (with same public/private settings)
5. Use Supabase CLI or dashboard to upload the unzipped `storage-files/` tree

## What you'll need to do (after I deliver)

- Open Files view, download all 4 files
- Create your personal Supabase project
- Follow the README — should take 15-20 minutes
- (Optional) Re-add the 2 seeded admins by signing them up fresh on the new project

## Risk assessment

- **Live app**: zero impact, no code changes, no DB changes
- **Storage download size**: depends on how many files in `cvs` and `bar-sources`. If it's gigabytes, I'll warn you and we can split or skip large buckets
- **Time to generate**: ~3-10 minutes depending on data + storage size

## Out of scope (for this task)

- Auth users migration
- Edge function redeployment
- Frontend code changes
- AI key swap, OAuth setup
- Switching the live app's `client.ts` to point at the new DB

If you later want to actually flip the app over, that's a separate, bigger plan.
