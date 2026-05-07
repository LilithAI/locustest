## What's wrong

The scrape is working — Khaitan now has 4 offices and 21 practice areas in the DB. The problem is purely the UI: `src/pages/FirmProfile.tsx` is still a stub. Its body is literally:

```
<h1>{firm.firm_name}</h1>
<p>Firm Intelligence page — UI coming next.</p>
```

Meanwhile the full designed UI already exists at `src/pages/DemoFirmIntelligence.tsx` (488 lines, hardcoded mock data) — that's the layout you fell in love with on `/demofirminteligence`.

So nothing is broken in scraping or in the data layer (`getFirmIntelligenceBySlug` already returns offices, practice_areas, rankings, news, movements, locus_take, completeness, chips, etc.). We just need to render it.

## Plan

### Step 1 — Port the Demo layout into FirmProfile (the only real change)

Rewrite `src/pages/FirmProfile.tsx` to mirror the section structure of `DemoFirmIntelligence.tsx`, but driven by the real `FirmIntelligenceFull` object. Sections, in order:

1. **Header** — firm name, tagline, HQ city, founded year, website link, social icons, tier badge, completeness %.
2. **Locus Take** card — `firm.locus_take` (skip if null).
3. **Intelligence chips row** — verified / hiring_now / growing / big_law / boutique / top_tier / recently_active (already computed in `chips`).
4. **Key stats grid** — total_lawyers, partner_count, partner:associate ratio, office_count, hiring_velocity.
5. **Offices** — list of cards from `firm.offices` (city, address, phone, HQ badge). Empty-state if none.
6. **Practice areas** — chips from `firm.practice_areas`, signature ones highlighted with accent color.
7. **Rankings** — grouped by source (Chambers / Legal500 / etc.), each row shows band + practice area + year. Hide section if empty.
8. **Recent news** — list of `firm.news`, each item shows source pill, date, title (link), excerpt. Hide if empty.
9. **Team movements** — recent joiners/leavers from `firm.movements`. Hide if empty.
10. **Contact** — general_email, careers_email, careers_url, phone_main.
11. **Last refreshed** footer — `last_scraped_at` timestamp + completeness score.
12. **Floating Refresh button** (admin-only) — already wired, keep it.

### Step 2 — Empty-state polish

For any section with no data, hide the section entirely rather than showing "No data" — the page should look complete even at 30% completeness. For the whole page, if `last_scraped_at` is null, show a single "Not yet enriched — click Refresh intelligence" CTA.

### Step 3 — Reuse demo's visual tokens

Pull the same card styling, spacing, typography, and accent colors from `DemoFirmIntelligence.tsx` so `/directory/firms/:slug` looks identical in style to `/demofirminteligence`. No new design tokens.

### Out of scope (explicitly NOT in this plan)

- No DB/schema changes.
- No edge function changes — scrape pipeline stays as is.
- No changes to `DemoFirmIntelligence.tsx` (keep it as the design reference for now; we can delete it later once you sign off on the real page).
- No changes to directory listing, auth, nav.

### Files touched

- **Edit:** `src/pages/FirmProfile.tsx` (rewrite body, keep imports + data fetch + RefreshIntelligenceButton).

That's it — one file.
