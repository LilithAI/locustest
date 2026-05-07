# Firm Intelligence — Demo-First Plan

Goal: Build a tweakable demo page at `/demofirminteligence` first using mock data, lock the UI with you, then wire Firecrawl + Gemini extraction, then bulk backfill. Hybrid visual direction: brutalist hero + completeness bar, calmer Locus body sections. All 13 sections visible day one (with mock data) so you can judge them.

---

## Phase 0 — Demo page (this turn, after approval)

Single new route, fully isolated, zero backend calls. Pure UI you can iterate on.

**Route:** `src/routes/demofirminteligence.tsx` → `/demofirminteligence`

**Mock firm:** "Khaitan & Co" with realistic dummy data hardcoded in `src/lib/demoFirmIntel.ts` (lawyers, partners, offices with %, practices with depth, rankings, news, movements, openings, similar firms). Easy to tweak in one file.

**Component tree (all new, scoped under `src/components/firm/intel/`):**
```text
HeroPanel              — black panel + yellow strip, name, tier chips, tagline, founded, Visit/Cold Email
CompletenessBar        — real % style (mocked at 78%)
AtAGlance              — 5 stat tiles (lawyers, partners, P:A, offices, openings)
SignaturePractices     — top 5 with depth bars
AllPractices           — chip cloud
Footprint              — offices list with city, address, % bar
Rankings               — Chambers/Legal500/IFLR cards
Movements              — last 90d joins/exits feed
OpenRoles              — vacancy cards (mocked)
RecentActivity         — news feed with source + date
AskAboutFirm           — restyled wrapper (reuses existing component, no logic change)
SimilarFirms           — 3 cards
ContactGrid            — 4-up: website, email, phone, HQ
IntelFooter            — "Last updated X" + Request update mailto
```

**Styling rules:**
- Only existing tokens from `src/styles.css` (`--background`, `--foreground`, `--accent`, `--primary`, etc). No raw hex.
- Hero uses `bg-foreground text-background` + `bg-accent` strip. Body sections use card tokens.
- Each section is conditionally rendered via `if (!data) return null` — proves the "graceful disappear" pattern with mock toggles.

**Untouched:** `/directory`, `FirmDrawer.tsx`, `FirmProfile.tsx`, nav, auth, every other route. Demo is a sealed sandbox.

**Deliverable:** You open `/demofirminteligence`, we tweak spacing/colors/section order until you say "ship it."

---

## Phase 1 — Wire Firecrawl + Gemini extraction (after demo locked)

No UI changes. Pure plumbing + admin trigger.

1. Add `FIRECRAWL_API_KEY` secret (you already provided the value).
2. Migration: `alter table firm_profiles add column if not exists last_scraped_at timestamptz;`
3. New edge function `refresh-firm-intelligence`:
   - Input: `{ firm_slug }`
   - Steps: load firm → Firecrawl scrape homepage → Firecrawl map + scrape top 4 of `/people|team|practice|office|contact|about/` → Firecrawl search `<name> site:barandbench.com OR site:livelaw.in` last month → concat markdown → Gemini `google/gemini-3-flash-preview` with strict JSON tool-call schema → write to `firm_profiles` (overwrite nulls only), `firm_offices`, `firm_practice_areas`, `firm_rankings`, `firm_news_mentions` → set `last_scraped_at`.
4. Floating admin-only "✨ Refresh intelligence" button on `/directory/firms/:slug` (gated by existing admin role check).
5. Pilot on Khaitan, Cyril Amarchand, AZB. Inspect output, iterate prompt.

---

## Phase 2 — Promote demo UI to real `/directory/firms/:slug`

Take the demo components, swap mock data for real loaders from `src/lib/firmIntelligence.ts`. Each section already conditionally renders — empty firms degrade naturally. Add real completeness % calculator.

---

## Phase 3 — Bulk backfill

One-off `scripts/backfill-firm-intelligence.ts` via `code--exec`: loop 94 enriched firms, 2s delay, calls edge function. ~280 Firecrawl credits.

---

## What we explicitly will NOT fake or build

- Hiring velocity % (no historical data) — dropped permanently
- Per-practice depth scores beyond what's extractable — degrade to chips
- "Updated 2 days ago" if not actually scraped — show real timestamp or "Not yet enriched"

---

## Files this turn (Phase 0 only)

**New:**
- `src/routes/demofirminteligence.tsx`
- `src/lib/demoFirmIntel.ts` (mock data, single source of truth for tweaking)
- `src/components/firm/intel/HeroPanel.tsx`
- `src/components/firm/intel/CompletenessBar.tsx`
- `src/components/firm/intel/AtAGlance.tsx`
- `src/components/firm/intel/SignaturePractices.tsx`
- `src/components/firm/intel/AllPractices.tsx`
- `src/components/firm/intel/Footprint.tsx`
- `src/components/firm/intel/Rankings.tsx`
- `src/components/firm/intel/Movements.tsx`
- `src/components/firm/intel/OpenRoles.tsx`
- `src/components/firm/intel/RecentActivity.tsx`
- `src/components/firm/intel/SimilarFirms.tsx`
- `src/components/firm/intel/ContactGrid.tsx`
- `src/components/firm/intel/IntelFooter.tsx`

**Untouched:** everything else. No DB, no edge functions, no existing routes.
