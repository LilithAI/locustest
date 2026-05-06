## Two problems, one root cause area: the scraper

### 1. Why descriptions are empty

Listing pages like `app.unv.org/opportunities`, `jobs.undp.org`, etc. only contain a title + location + deadline per row. The actual job description lives on a **separate detail page** (one click in). Right now `scrape-firm-careers` does a single Firecrawl pass on the listing URL, so the model has nothing to extract from → `description_full` ends up null.

### 2. Why a Pakistan job passes the "India" filter

The eligibility prompt has this rule:

> ELIGIBLE if … Source type is un_agency / intl_court / ifi AND vacancy doesn't restrict by nationality.

The UN Volunteers Pakistan posting is `un_agency` and doesn't say "Indians not eligible", so it gets stamped **eligible** — even though the role is physically based in Pakistan and obviously not for Indian candidates.

The rule is too loose: location-bound UN postings (city/country in the location field that isn't India and isn't "remote") should not be auto-eligible just because the agency is multilateral.

---

## Plan

### A. Two-pass scrape for detailed descriptions

In `supabase/functions/scrape-firm-careers/index.ts`:

1. **Pass 1 — discover.** Keep the current Firecrawl call on the listing URL. Update the extraction tool schema to also return an optional `detail_url` per vacancy (absolute URL of the job detail page when present in the markdown). Tighten the prompt so the model returns the per-row link.
2. **Pass 2 — enrich.** For each extracted vacancy that has a `detail_url`, fetch that URL via Firecrawl (`onlyMainContent: true`, `waitFor: 1500`) and run a small follow-up AI call that fills in `description_full` (800–2500 chars), `description_excerpt`, plus any of `pqe_min/max`, `application_mode`, `application_target`, `source_deadline` that were missing from pass 1.
3. **Cost guardrails.**
   - Cap detail fetches per run at `MAX_DETAIL_FETCHES = 15` (configurable constant). Process eligibility-classified vacancies first; skip pass 2 for ones already marked `ineligible`.
   - Skip pass 2 if `detail_url` is missing or not on the same registrable domain as the source URL (avoids junk redirects).
   - On Firecrawl failure for a single detail page, log a line, keep the pass-1 fields, and continue.
4. **Logging.** Add per-vacancy log lines (`detail OK 1240 chars`, `detail SKIP same-as-listing`, `detail ERR Firecrawl 504`) into `scrape_runs.raw_log` for debugging.

### B. Tighten the India eligibility classifier

Same file, `ELIGIBILITY_PROMPT`:

1. Replace the over-broad un_agency rule with:
   > Source type is un_agency / intl_court / ifi → mark **eligible** ONLY if the vacancy is (a) HQ / global (e.g. New York, Geneva, Vienna, Nairobi, "global", "remote"), OR (b) located in India, OR (c) explicitly says "open to Indian nationals" / no duty-station restriction. If the vacancy's duty station is a specific non-India country (Pakistan, Bangladesh, Kenya, etc.), mark **ineligible** — those postings are local-hire even when the agency is global.
2. Add a deterministic post-filter in code (belt-and-braces) before insert:
   - If `extracted.location` matches a non-India country/city (we already know `source.country`), and the vacancy isn't remote, and the location isn't in a small allow-list of UN HQ cities (`new york`, `geneva`, `vienna`, `nairobi`, `bangkok`, `bonn`, `the hague`, `rome`, `paris`, `copenhagen`, `addis ababa`), force `eligibility = "ineligible"` with reason `"non-India duty station"`.
3. Keep India-located, remote-global, and HQ postings flowing through unchanged.

### C. No schema/UI changes required

`description_full` already exists on the queue row and the Review/Preview dialog already renders it. Once pass 2 starts populating it, the preview pane will fill in automatically. The `ReviewQueuePanel` filter for "India-eligible" doesn't change — it just gets fewer false positives.

---

## Files touched

- `supabase/functions/scrape-firm-careers/index.ts` — extraction prompt + tool schema (`detail_url`), new `enrichFromDetail()` helper, eligibility prompt update, new `forceLocalHireIneligible()` post-filter.

## Out of scope

- Re-scraping historical pending rows — new pipeline only affects future scrape runs. If you want, I can add a "Re-enrich descriptions" admin button in a follow-up.
- Per-source overrides for "this agency genuinely hires Indians remotely" — can be added later via a `firm_careers_sources.eligibility_override` column if you hit edge cases.