## Goals

1. Fix back-button overlap with the fixed Navbar.
2. Reframe `/directory/firm/:slug` so it actually feels like **Intelligence**, not just a longer card. Hybrid layout: applicant-focused at top + analytical signals below. No peer comparison.

---

## 1. Layout fixes (FirmProfile.tsx)

- Add top padding to `<main>` so content clears the fixed Navbar (e.g. `pt-24 md:pt-28`).
- Move the "Back to directory" link into a sticky-ish row inside the page container, below navbar offset. Style as a pill button (border + bg) so it never visually collides with floating nav.
- Tighten section spacing on desktop (currently a lot of vertical air between blocks).

## 2. Data coverage reality check

Out of 95 firms:
- 75 have descriptions, 69 have practice areas, 56 have phone, 54 LinkedIn, 51 careers URL — **strong**
- Only 18 have team members or lawyer/partner counts — **weak**
- 28 have full office addresses, 58 have founded year — **medium**

Implication: page must look smart **without** team data for ~80% of firms. Computed signals + AI take fill that gap.

## 3. New section: "Locus Take" (AI summary, pre-generated)

- Add column `locus_take TEXT` to `firm_profiles`.
- One-off batch script (server function, admin-triggered): for each firm, send `{name, description, practice_areas, offices, founded_year, hq_city}` to Lovable AI (`google/gemini-2.5-flash`) and store a 2–3 paragraph analyst summary covering: positioning, practice strengths, geographic footprint, who this firm fits.
- Render at top of page in a callout card with `Sparkles` icon and "Locus Take" label.

## 4. New section: "Intelligence Signals" (computed, no extra data needed)

A grid of 4–6 chips/badges derived from existing fields:

- **Practice breadth**: count of practice areas → label (Boutique <5, Focused 5–10, Full-service 10–20, Mega-practice 20+).
- **Geographic reach**: office count → (Single-city, Regional 2–3, National 4–6, Pan-India 7+).
- **Firm maturity**: years since `founded_year` → (Emerging <10y, Established 10–25y, Legacy 25y+).
- **Hiring signal**: present if `careers_url` OR `careers_email` exists → "Actively hiring — careers channel live".
- **Direct contact**: present if `careers_email` exists → "Direct careers email available".
- **Press visibility**: present if `linkedin_url` AND `twitter_url` → "Active on LinkedIn + Twitter".

Each signal: small card with icon, headline, one-line explanation. Hide signals whose source data is missing.

## 5. New section: "Practice Focus" (visual)

Replace flat chip list with a categorised view:
- Group `practice_areas` into buckets (Corporate, Disputes, Regulatory, IP, Tax, TMT, Real Estate, Employment, Others) via a simple keyword map.
- Show as a 2–3 column layout with bucket headers and the matched chips inside, plus a small "Areas: N" counter.
- Falls back to flat chip list if no bucket matches.

## 6. Reorganised page order

```
[Back pill]
[Header: name, badges, HQ, primary CTAs]                  ← compacted
[Locus Take]                                              ← NEW, AI
[Intelligence Signals — 6-up grid]                        ← NEW, computed
[At-a-glance stats — same as today, smaller]
[Practice Focus — bucketed]                               ← upgraded
[About — collapsible if long]
[Offices — same]
[People — only if data exists, else hidden, no empty state]
[Contact & links]
[Suggest a fix link → existing flow]
```

People section: stop showing the "Team data unavailable" empty state — just omit the section. Replaces with a small "View team on firm site →" if `team_page_url` exists.

## 7. Out of scope

- Peer comparison / percentile ranking (user said no).
- Per-lawyer pages.
- Live re-scraping from the app.
- Editing data in the UI.

---

## Technical notes

**Files to edit**
- `src/pages/FirmProfile.tsx` — layout fix, new sections, reorder.
- `src/lib/firm-profiles.ts` — add `locus_take` to type; add helpers `computeSignals(profile)` and `bucketPracticeAreas(areas)`.

**New files**
- `src/server/firm-intelligence.functions.ts` — admin-only `generateLocusTakes()` server fn that loops firms missing `locus_take` and calls Lovable AI Gateway.
- (optional) one-off admin button on `AdminFirmSuggestions` or a hidden trigger to invoke it once.

**DB migration**
- `ALTER TABLE firm_profiles ADD COLUMN locus_take TEXT;`

**AI**
- Lovable AI Gateway, model `google/gemini-2.5-flash`, no user API key needed.
- Prompt enforces: no fabrication, only reflect provided fields, neutral analyst tone, ~150 words.

**Visual style**
- Keep neobrutalist tokens (border-2, accent shadows). Locus Take card uses `bg-accent/5` with `border-accent/30` to differentiate.
- All colors via semantic tokens.
