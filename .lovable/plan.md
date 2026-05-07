## Goal

Bulk-refresh intelligence for all 94 firm profiles, parallelized 3-at-a-time, with retry for weak results — driven from a new admin page.

## Current state

- Edge function `refresh-firm-intelligence` works (Khaitan returned 4 offices + 21 practice areas).
- All 94 firms have `last_scraped_at` set but `intelligence_completeness_score = 0` and 0 rankings/news — they were imported, not enriched.
- Admin section exists at `/admin/*` under `AdminLayout`.

## Plan

### Step 1 — New job-queue table

Migration: create `firm_refresh_jobs` table to track each batch run (so refreshing 94 firms is observable, resumable, and visible across browser tabs):

```
firm_refresh_jobs:
  id uuid PK
  status: queued | running | done | failed
  total int, completed int, failed int
  started_by uuid, started_at, finished_at
  notes text

firm_refresh_job_items:
  id uuid PK
  job_id uuid FK
  firm_slug text
  status: pending | running | done | failed | retry
  attempt int default 0
  completeness numeric  -- score after the run
  error text
  finished_at timestamptz
```

RLS: admin-only read/write.

### Step 2 — New admin page `/admin/firm-intelligence`

New file `src/pages/AdminFirmIntelligence.tsx` + route in `src/App.tsx`. Page shows:

- **Top stats**: 94 firms total · X enriched (completeness > 0.3) · Y stale (>30d old or completeness < 0.3) · Z never enriched.
- **Big button**: "Refresh all stale firms" + secondary "Refresh ALL 94 (force)".
- **Live progress panel** when a job is running: progress bar (completed/total), current firm being processed, count of failures, ETA.
- **Per-firm table** below: slug · last refreshed · completeness % · offices/practices/rankings/news counts · individual "Refresh" button.
- Polls `firm_refresh_jobs` every 3s while a job is `running`.

### Step 3 — Orchestrator: client-driven parallelism

The browser drives the batch (simplest, no new server infra):

1. Click "Refresh all" → insert a `firm_refresh_jobs` row (status `running`, total=94) + 94 `firm_refresh_job_items`.
2. Frontend pulls 3 pending items at a time, calls existing `refresh-firm-intelligence` edge function for each.
3. On each completion: update the item row (status, completeness, error), increment `completed`/`failed` on the parent job, pull the next pending item.
4. When pending list is empty, scan items where `completeness < 0.3 AND attempt < 2` → flip to `pending` for one retry pass.
5. Mark job `done`.

If the user closes the tab, the job stays `running` in DB. Reopening the page detects an in-progress job and **resumes** by picking up the next `pending` item — so closing the tab pauses, reopening resumes.

A small abort button cancels the current job (sets status `failed`, stops the loop).

### Step 4 — Reuse existing button

The single-firm `RefreshIntelligenceButton` on `FirmProfile` stays as-is. The admin page's per-row Refresh just calls the same edge function inline.

### Step 5 — Sanity check after batch

When the job finishes, the page surfaces a "Top 10 weakest profiles" list (lowest completeness) so you can manually inspect/fix.

## Why this shape

- **Client orchestration** = no need for a second edge function or pg_cron; you can watch it run live.
- **Parallel x3** in JS = `Promise.all` on a 3-slot worker pool.
- **DB-backed queue** = survives tab close, multi-tab safe via row-level claim (`UPDATE ... WHERE status='pending' RETURNING *` with a status check).
- **Retry pass** triggered automatically for weak results (completeness < 0.3, max 2 attempts) per your choice.

## Out of scope

- No changes to `refresh-firm-intelligence` edge function logic itself.
- No changes to the public `/directory/firms/:slug` page UI.
- No automatic cron — refresh is admin-triggered. (We can add monthly cron later.)

## Files

- **New migration**: `firm_refresh_jobs` + `firm_refresh_job_items` tables with admin RLS.
- **New**: `src/pages/AdminFirmIntelligence.tsx` (page + orchestrator hook).
- **New**: `src/components/admin/AdminFirmIntelRow.tsx` (per-firm row).
- **Edit**: `src/App.tsx` (add admin route).
- **Edit**: `src/components/admin/AdminLayout.tsx` or sidebar (add nav link to "Firm Intelligence").

That's it — one DB migration, two new files, two small edits.
