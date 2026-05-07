# Build the Firm Intelligence Pipeline

I read your CSV and compared it to the DB. Here's the honest state and the plan.

---

## What your CSV gives us (95 firms)

| Field | Coverage |
|---|---|
| website_url | 95/95 ✅ |
| practice_areas (semicolon list) | 69/95 |
| offices (semicolon list) + addresses | 63/95 |
| careers_url | 51/95 |
| general_email | 47/95 |
| founded_year | partial |
| **total_lawyers / partner_count** | basically 0 (numbers in CSV are misparsed JSON counts, not real headcount) |
| **rankings, news, locus_take, signature practices** | not in CSV at all |

## What the DB has (94 firm_profiles rows)

- All 94 have website_url + last_scraped_at + locus_take ✅
- 0 firms have practice_areas, offices, rankings, or news populated in the relational side-tables (the CSV-style data sits as text columns on `firm_profiles` only)
- 0 firms have real total_lawyers / partner_count

## The gap

The CSV-style scrape (basic firm-page extraction) already happened. To power the demo UI honestly we need a **second pass** that goes deeper: real lawyer/partner counts, practice areas with partner counts, structured offices, rankings, recent news. That's what Firecrawl + Gemini does.

---

## Plan — 3 steps in this loop

### Step 1 — One-time CSV backfill (no AI, no scraping)

Import the better fields from your CSV into `firm_profiles` for the 95 firms (NULL-safe — won't overwrite existing values):
- `practice_areas` text array (split on `;`)
- `offices` text array + `office_addresses` JSONB
- `office_count`, `hq_city`, `general_email`, `careers_email`, `phone_main`
- `linkedin_url`, `twitter_url`, `careers_url`, `tagline`, `description`, `founded_year`

Skip the broken `total_lawyers` / `partner_count` fields — those will come from the AI pass.

This makes the directory and demo page meaningful for non-piloted firms immediately.

### Step 2 — Firecrawl + Gemini refresh pipeline

**New edge function** `refresh-firm-intelligence`:

```text
INPUT: { firm_slug }

1. Load firm_profiles row → website_url, firm_name
2. Firecrawl map(website_url) → pick 4 best URLs matching
   /people|team|attorneys|practice|service|office|contact|about/i
3. Firecrawl scrape(homepage + 4 sub-pages) → markdown (~30-50K tokens)
4. Firecrawl search("<firm name>" site:barandbench.com OR site:livelaw.in
   OR site:economictimes.com, tbs:'qdr:m', limit:10) → news
5. Gemini google/gemini-3-flash-preview with structured tool-call schema:
   {
     tagline, founded_year, total_lawyers, partner_count,
     general_email, careers_email, phone_main, hq_city,
     offices: [{ city, address, is_hq }],
     practice_areas: [{ name, partner_count, is_signature }],
     rankings: [{ source, year, band_or_tier, practice_area }],
     news: [{ title, url, source, published_at, mention_type, excerpt }]
   }
6. Write to DB with admin client (RLS-bypass):
   - firm_profiles: NULL-safe overwrite of profile fields
   - firm_offices: full replace by firm_slug
   - firm_practice_areas: full replace by firm_slug
   - firm_rankings: upsert on (firm_slug, source, year, practice_area)
   - firm_news_mentions: upsert on url
   - firm_profiles.last_scraped_at = now()
   - recompute intelligence_completeness_score
```

**Admin trigger** — `src/components/firm/RefreshIntelligenceButton.tsx`:
- Floating button bottom-right of `/directory/firms/:slug`
- Visible only when `useIsAdmin()` returns true
- Toast progress, refetches firm queries on success

### Step 3 — Pilot on 3 firms, then promote demo to real

After Step 2 ships:
1. Open `/directory/firms/khaitan-co` as admin → click Refresh → wait ~20s → inspect DB writes
2. Repeat for `cyril-amarchand-mangaldas` and `azb-partners`
3. Iterate Gemini prompt if extraction is weak
4. **Next loop (Phase 2):** swap `DemoFirmIntelligence.tsx`'s mock `firm` constant for real DB loaders, then promote it to `/directory/firms/:slug`. Conditional rendering means non-piloted firms degrade gracefully (sections hide if data missing).

### Step 4 (later, separate loop) — Bulk backfill all 94

One-off sandbox script loops over every enriched firm with 1-second delay. ~5 Firecrawl credits each × 94 = ~470 credits.

---

## Secrets needed

Just one: **`FIRECRAWL_API_KEY`** (you have `fc-1f3fccf38b9048b3bd4bf6f3d2868822`).
- `LOVABLE_API_KEY` — already configured ✅
- DB service role — already in edge function env ✅

I'll request it via the secret tool when you approve.

---

## Files this plan creates / edits

**New:**
- `supabase/functions/refresh-firm-intelligence/index.ts` — orchestrator
- `supabase/functions/refresh-firm-intelligence/extractor.ts` — Gemini schema + prompt
- `src/components/firm/RefreshIntelligenceButton.tsx`
- One-off script in this loop's sandbox to import the CSV (no project file)

**Edited:**
- `src/pages/FirmProfile.tsx` — mount the floating refresh button (admin-only)

**Untouched:**
- `/demofirminteligence` (still mock, finalised look)
- `/directory` listing
- DB schema (zero migrations)
- Auth, nav, every other route

---

## Approve = I run

1. `supabase--insert` to backfill CSV → `firm_profiles` (NULL-safe)
2. `secrets--add_secret` for `FIRECRAWL_API_KEY`
3. Build the edge function + admin button
4. Tell you to test on Khaitan, then iterate
