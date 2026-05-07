# Firm Intelligence — Real Data Plan (after subtraction)

I went section-by-section through the demo UI and asked: *can we actually fill this from Firecrawl + Gemini, from existing DB tables, or not at all?* Below is the honest cut.

---

## ✅ Sections we KEEP (data is gettable or already exists)

| # | Section | Source | Confidence |
|---|---|---|---|
| 1 | **Hero** — name, tier, tagline, founded year | `firm_profiles` + Firecrawl scrape of homepage/about | High |
| 2 | **Locus Take** | Already in `firm_profiles.locus_take` (manual) | High — exists today |
| 3 | **Intelligence Completeness bar** | Computed server-side from filled fields % | High |
| 4 | **At a glance** — Lawyers, Partners, Offices, Open Roles | Firecrawl scrape of `/people`, `/team` + count from `vacancies` table | Medium-High |
| 5 | **Signature practices** (top 5 with depth bar) | Firecrawl scrape of `/practices` page → `firm_practice_areas`. Depth bar = `partner_count / max(partner_count)` | Medium |
| 6 | **All practice areas** (chip cloud) | Same scrape, full list | High |
| 7 | **Office presence** with city + address | Firecrawl scrape of `/contact` / `/offices` → `firm_offices` | High |
| 8 | **Rankings & recognition** (Chambers / Legal500 / IFLR) | Firecrawl search `"<firm> Chambers Asia-Pacific"` → scrape result → extract band | Medium |
| 9 | **Recent activity / news** (last 90 days) | Firecrawl search `"<firm>" site:barandbench.com OR site:livelaw.in` `tbs:'qdr:m'` | High |
| 10 | **Current openings** | Existing `vacancies` table, joined by `firm_name` (case-insensitive) — **already in your DB** | High — exists today |
| 11 | **Ask about this firm** | Already built (`ask-about-firm` edge function) | High — exists today |
| 12 | **Contact** — website, emails, phone, HQ | Firecrawl scrape of homepage + `/contact` → `firm_profiles` | High |
| 13 | **Footer** — last refreshed timestamp | `firm_profiles.last_scraped_at` | High |

---

## ❌ Sections we CUT from the demo UI

| Section | Why cut |
|---|---|
| **P : A ratio stat tile** | Derived from lawyers + partners. If both extract well we keep it; if either is missing the whole tile would be junk. **Verdict: keep IF both numbers extracted, else hide.** |
| **Hiring velocity %** | Needs historical headcount tracking (we'd need to scrape weekly for 3+ months). Not building that. **Verdict: cut permanently** — also already cut from current demo. |
| **Office % share bars** | Needs lawyer headcount per office, which firm websites almost never publish. **Verdict: cut the % bar, keep the city + address only.** |
| **Per-practice depth bars** | Real "depth" needs practice-level revenue/deal data we can't get. Computed `partner_count / max` is a reasonable proxy. **Verdict: keep but rename to "partner strength" so we're honest.** |
| **Team movements feed (joins/exits last 90d)** | We have a `firm_team_movements` table, but reliable detection needs longitudinal team scraping. From a single news search we'd get noisy/incomplete results. **Verdict: cut for now, revisit in Phase 4 once we have repeated team snapshots.** |
| **Similar firms** (3 cards) | Needs a similarity model. We could fake it with "same tier" but that's not intelligence, that's a filter. **Verdict: cut for now — easy to add later from `firm_comparable_index` table.** |
| **"Generate cold email" button** | Not part of this scrape pipeline; a separate AI feature. **Verdict: cut from this turn, can add as a separate ticket.** |

---

## 🔁 Final UI sections after subtraction

```text
1. Hero  (name, tier, tagline, est. year, Visit website button)
2. Locus Take
3. Intelligence Completeness bar
4. At a glance  (Lawyers, Partners, [P:A if both known], Offices, Open Roles)
5. Signature Practices  (top 5 by partner count, with "partner strength" bar)
6. All Practice Areas  (chip cloud)
7. Office Presence  (city + address only, no % bars)
8. Rankings & Recognition  (Chambers / Legal500 / IFLR cards)
9. Current Openings  → links to existing /opportunities filtered by firm
10. Recent Activity / News  (last 90 days from Bar & Bench, LiveLaw, ET)
11. Ask About This Firm  (already built)
12. Contact  (website, general email, careers email, phone, HQ)
13. Footer  ("Last refreshed X · Request update" mailto)
```

Every section conditionally renders — if data is missing, the section disappears (not "Unknown").

---

## 🔗 How "Current Openings" links to existing pipeline

The `vacancies` table joins on `firm_name` text (case-insensitive). On the firm profile we'll show up to 3 active vacancies as cards; each card links to `/opportunities` (or directly to the apply URL/email). A "See all openings" footer link goes to `/opportunities?firm=<name>` (we'll add the filter param).

So we're **not duplicating** the opportunities feature — we're surfacing a slice of it inside the firm page.

---

## 🛠️ Build plan (this turn → next turns)

### Step A — Update demo UI to match the subtracted list
Edit `src/pages/DemoFirmIntelligence.tsx`:
- Remove: P:A tile (will conditionally show after Phase B), office % bars, Movements section, Similar Firms section, Generate cold email button
- Add: Locus Take section (between Hero and Completeness)
- Rename "depth" → "Partner strength"
- Wire Current Openings to look like real vacancy cards with "See all →" link

### Step B — Build Firecrawl + Gemini pipeline (Phase 1)
- `supabase/functions/refresh-firm-intelligence/index.ts` — orchestrator
- Steps: load firm → Firecrawl `map` website → `scrape` top 4 pages → `search` legal news (last month) → Gemini `google/gemini-3-flash-preview` with one tool-call schema → write to `firm_profiles` (NULL-safe), `firm_offices`, `firm_practice_areas`, `firm_rankings`, `firm_news_mentions` → bump `last_scraped_at` + `intelligence_completeness_score`
- `src/components/firm/RefreshIntelligenceButton.tsx` — admin-only floating button on `/directory/firms/:slug`
- Pilot on Khaitan, Cyril Amarchand, AZB

### Step C — Promote demo UI to real `/directory/firms/:slug` (Phase 2, next loop)
Take the now-final demo components, swap the mock `firm` constant for real loaders that read from the populated tables. Conditional rendering means non-piloted firms degrade gracefully.

### Step D — Bulk backfill (Phase 3, one-off)
Sandbox loop over enriched firms, ~5 Firecrawl credits each.

---

## 🔐 Secrets

Need only one new secret: **`FIRECRAWL_API_KEY`** (`fc-1f3fccf38b9048b3bd4bf6f3d2868822`).
- `LOVABLE_API_KEY` — already configured ✅
- Service role for DB writes — already in edge function env ✅

---

## What I'm NOT doing

- Schema migrations (every needed table already exists, perfectly shaped)
- Auth changes
- Touching `/directory` listing or `FirmDrawer`
- Building per-user OAuth or new connectors

---

## Approve = I do Step A first (UI subtraction) so you can re-judge the demo, then ask for the Firecrawl key and do Step B in the same loop.
