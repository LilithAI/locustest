Right now extraction is conservative — many cards end up with just role + location + a one-liner. I'll make the scraper pull the full job-detail content and have the AI fill in every card field.

## Problem

`supabase/functions/scrape-firm-careers/index.ts` does:
1. Firecrawl scrapes only the **listing page** (e.g. /careers).
2. Listing pages usually contain just role titles + apply links — full eligibility, stipend, JD, etc. live on the **detail page** behind each link.
3. AI prompt tells it to be ultra-conservative ("ONLY extract fields literally present").
4. Schema misses `practice_area` and `task_brief` (which the public card supports).
5. Markdown truncated at 12k.

Result: `description`, `eligibility`, `stipend` often null → minimal card.

## Changes (single file)

`supabase/functions/scrape-firm-careers/index.ts`:

### 1. Two-pass scrape (when listing page has detail links)
- First pass: scrape listing URL + ask AI for `{ role, apply_url }` only.
- For each listing with an `apply_url` that's same-domain or relative, do a **second Firecrawl scrape** of that detail page.
- Run a **richer extraction** on the detail page markdown to get the full field set.
- If no detail link available, fall back to extracting from the listing page (current behaviour).
- Cap detail-page scrapes at 8 per source per run to keep cost predictable; log skipped overflow.

### 2. Expanded schema + prompt
Add to the `extract_listings` tool:
- `practice_area` (string|null) — e.g. "Corporate", "M&A", "Disputes"
- `task_brief` (string|null) — written task / case study they ask applicants to submit
- `country` (string|null) — for the existing India filter
- `qualifications` (string|null) — degree / PQE requirements (folded into `eligibility` if present)
- `experience_years` (string|null) — e.g. "2-4 years PQE"
- `responsibilities` (string|null) — bullet summary
- `start_date` (string|null)

Update prompt to: "Extract a 2-4 sentence `description` covering what the role is and key responsibilities. Pull eligibility/stipend/deadline/practice area whenever they appear, even if phrased loosely. Combine bullets into a clean paragraph."

### 3. Larger context
Bump truncation 12k → 25k for detail pages (single role per page, no token explosion).

### 4. Stronger model for detail extraction
Use `google/gemini-2.5-pro` for the detail-page extraction (better at long-form synthesis); keep `gemini-2.5-flash` for the cheap listing-only pass.

### 5. Preview reflects the new fields
The preview dialog already maps `ai_extracted` → `VacancyCard`, so richer extractions surface automatically. Only need to ensure `task_brief`, `practice_area`, `eligibility`, `description` flow through (they already do).

## Out of scope

- No DB changes (queue stores `ai_extracted` JSON).
- No bulk re-scrape of past rows. New scrapes get rich data; old queue rows can be re-triggered manually via "Scrape now".
- No PDF JD extraction (most firm careers pages don't link PDFs; revisit if needed).

## Cost note

Two-pass means N+1 Firecrawl calls per source (1 listing + up to 8 details). For ~94 firms scraped weekly that's ~850 Firecrawl scrapes/week vs ~94 today. Acceptable for richness; the cap prevents runaways.

## Question

Sound good, or would you rather I keep it single-pass (just beef up the prompt + schema + bigger truncation) to stay cheap, accepting that detail-only fields stay sparse on listing-page-only firms?