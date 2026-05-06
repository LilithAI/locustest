## What exists today
- `firm_careers_sources` — firm-only schema (firm_slug, url, active, last_scraped_at). **0 rows seeded.**
- `vacancy_review_queue` — pending/approved/rejected/duplicate, dedupe_hash, ai_extracted JSON.
- Edge function `scrape-firm-careers` — Firecrawl + LLM extraction for one source.
- `ReviewQueuePanel` UI — single "Queue" tab + "Sources" tab, manual "Scrape Now" button.
- No India-eligibility logic, no scrape-runs log, no dashboard, no cron, no source typing.

This is why the Review Queue is empty: we never seeded the ~200 sources from your list, and the schema can't even represent UN agencies / govt portals / IFIs.

## Plan — Vacancy Pipeline v1

### Phase 1 — Schema upgrade (migration)
Extend the existing tables instead of creating parallel ones (keeps your edge function + UI working):

- **`firm_careers_sources`** → rename concept to "sources":
  - Add `source_type` enum (indian_law_firm, intl_law_firm, un_agency, intl_court, ifi, indian_govt, indian_regulator, psu, big4, corporate_indian, corporate_mnc, ngo, legal_tech, other)
  - Add `tier` enum (tier_1, tier_2, tier_3, untiered)
  - Add `country` (default 'IN'), `scrape_frequency` (daily/weekly/biweekly/monthly), `last_success_at`
  - Make `firm_slug` / `firm_name` nullable+generic (rename usage to `name`)
- **`vacancy_review_queue`** → add India eligibility:
  - `eligibility_india` enum (eligible / ambiguous / ineligible)
  - `eligibility_reason` text, `eligibility_confidence` numeric
  - `role_type`, `practice_area`, `location`, `is_remote`, `pqe_min`, `pqe_max`, `application_mode`, `application_target`, `source_deadline` as proper columns (currently buried in `ai_extracted`)
  - `first_seen_at`, `last_seen_at`, `consecutive_misses`, `lifecycle_status` (active/stale/expired)
  - `manual_eligibility_override` boolean (so re-scrape doesn't clobber admin calls)
- **New `scrape_runs`** table: source_id, started/completed_at, status, found/new/stale counts, error, raw_log.

### Phase 2 — Seed sources (~200 rows)
Insert your full list as a single seed migration, properly typed/tiered. Includes:
- UN system + ReliefWeb (15)
- International courts/tribunals (6)
- IFIs (7)
- Other intl orgs (5)
- Indian govt: SC, top 6 HCs, UPSC, NALSA, Law Commission (~12)
- Regulators: SEBI, RBI, CCI, IRDAI, TRAI, PFRDA, SAT, NCLT (8)
- Tribunals + PSUs (~12)
- Magic Circle + US Big Law + Singapore Big 4 (~22)
- Indian law firms (Tier 1/2/3 + IP boutiques) (~30)
- Big 4, corporates, banks/NBFCs, pharma, tech, insurance (~50)
- NGOs / policy / legal-tech (~15)

### Phase 3 — India eligibility classifier
- Lovable AI Gateway call (`google/gemini-2.5-flash`) inside the scrape edge function, run per extracted vacancy.
- Returns `{eligibility, reason, confidence}` using your rule set (Indian source/location → eligible; UK/NY bar required → ineligible; UN no nationality bar → eligible; etc.).
- If admin sets `manual_eligibility_override=true`, classifier output is ignored on re-scrape.

### Phase 4 — Generalised scraper
- Refactor `scrape-firm-careers` → `scrape-source` (works for any source_type, not just firms).
- Updates lifecycle: increment `consecutive_misses` on missed vacancies, mark stale (≥2) / expired (≥4).
- Writes a `scrape_runs` row per execution.

### Phase 5 — Cron
- Use Supabase pg_cron to invoke `scrape-source` per source on its `scrape_frequency` cadence (daily 02:00 IST, weekly Sun, biweekly, monthly 1st).
- Plus existing manual "Scrape Now" button.

### Phase 6 — Admin UI overhaul (under existing `/admin/opportunities` Review Queue tab)
1. **Pipeline Dashboard** (new sub-tab): stat cards (active sources, pending count, 24h success rate, published vacancies), donut by source_type, line chart 30d, top-10 sources, eligibility breakdown.
2. **Sources Manager**: filterable table by source_type/tier/status, bulk pause/resume/delete, "+ Add Source" modal with full enum dropdowns, CSV import.
3. **Review Queue** with 3 tabs: India-eligible / Ambiguous / Auto-rejected. Cards show eligibility reason + confidence, color-coded source_type badges, role_type/PQE/location/deadline, Approve & Publish / Reject / Edit / Needs Review.
4. **Vacancy detail page** `/admin/opportunities/vacancies/[id]` — full editable form with eligibility override.
5. **Scrape Runs log** sub-tab — table of runs, filter by source/status/date, drawer for raw_log, retry button.

### Phase 7 — Out of scope (per your spec)
Public listings, candidate notifications, applications tracking, mobile.

## Suggested execution order
Phases run in order. Each is a separate approval/turn so we don't ship a half-baked schema:

1. Phase 1 + 2 (schema migration + seed all sources) — single migration.
2. Phase 3 + 4 (classifier + generalised scraper) — edge function rewrite.
3. Phase 5 (cron).
4. Phase 6 (UI overhaul) — biggest chunk; can split into Dashboard, Sources Manager, Review Queue redesign, Vacancy detail, Runs log.

## Questions before I start
1. **Confirm source list** — should I seed the full ~200 sources verbatim from your message, or do you want to trim (e.g. drop the "🔴 ghost" ones, skip 25 High Courts and just do top 6)?
2. **PDF-only sites** (SC, HCs, tribunals) — out of scope for v1, or should the scraper attempt PDF parsing? Recommend out-of-scope: mark them as `status=paused` with notes, revisit later.
3. **Cron** — fine to use Supabase pg_cron hitting an edge function? (Standard Lovable Cloud pattern.)
4. **Eligibility classifier model** — Gemini 2.5 Flash (cheap, fast) OK, or want Pro for better accuracy on ambiguous cases?

Answer those and I'll start with Phase 1+2 (the schema + seed migration).