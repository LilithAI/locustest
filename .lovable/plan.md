## What's broken (root cause)

The intelligence DB was seeded from old/messy `firm_profiles` JSON. Two specific failures you're seeing:

1. **HQ = Singapore for Cyril Amarchand Mangaldas / Cyril Shroff & Co.** The CSV literally has `hq_city = Singapore` and `offices = Singapore` for these two rows because the scraper only captured the Singapore office. We propagated garbage in → garbage out.
2. **Profile feels dumb.** "Unknown" office cards, "—" partner ratio, "0 News (90d)", "Recent activity: nothing tracked yet", "Talk To Us / Let us know how we can help" rendered as if it were an office. None of these tell the user anything. They're noise pretending to be intelligence.

Plan = **(A) re-import cleanly from the new CSV (`locus_firm_intelligence-4.csv`) with corrective heuristics**, then **(B) rebuild the profile page so it only shows fields we actually trust, and earns the word "intelligence" by computing things, not parroting blanks**.

---

## A. Clean re-import (one migration, replaces all intel data)

Source of truth = uploaded CSV only (95 firms). Wipe and reseed:

- `firm_offices`, `firm_practice_areas`, `firm_team_members`, `firm_news_mentions`, `firm_team_movements`, `firm_rankings`, `firm_comparable_index` — TRUNCATE.
- Reset intelligence columns on `firm_profiles` for the 95 slugs in the CSV.

Per-row cleaning rules applied during import:

1. **HQ correction.** If `hq_city ∈ {Singapore}` AND firm name matches `/cyril|shroff|amarchand|khaitan|trilegal|azb|jsa|sagar|luthra|nishith|desai|ikigai|samvad/i` → override HQ to **Mumbai** (or Delhi for known Delhi-HQ firms via small allowlist). Otherwise keep CSV value. Specifically force:
   - `cyril-amarchand-mangaldas` → HQ Mumbai
   - `cyril-shroff-co` → mark as duplicate of Cyril Amarchand, hide from directory
2. **Offices dedupe.** Split on `;`, normalize (`Bengaluru`/`Bangalore` → `Bengaluru`, `Gurgaon`/`Gurugram` → `Gurugram`, `Delhi`/`New Delhi` → `Delhi`), drop blanks, drop "Unknown", drop the literal HQ city duplicated. Re-derive `office_count` from cleaned list.
3. **Headcount.** If `total_lawyers < partner_count` OR `total_lawyers ≤ 10` for a firm we know is large (Khaitan, AZB, CAM, SAM, Trilegal, JSA, L&L, Nishith Desai, Luthra, Cyril) → set both to NULL and tag `headcount_unverified = true`. Never compute partner ratio from junk.
4. **Founded year.** If `< 1900` or `> 2025` → NULL. (CAM has 2022 in the CSV which is wrong — it's the website redesign year, not the firm. Force NULL unless a small whitelist overrides.)
5. **Practice areas.** Split on `;`, normalize casing, dedupe, drop empties. If `practice_area_count = 0` → mark profile incomplete (no chips).
6. **Office addresses.** Parse `office_addresses` JSON; reject any entry where the address is just a phone fragment or "Talk To Us / Let us know how we can help" boilerplate. That's what's rendering as "Unknown".
7. **Recompute completeness** from cleaned fields (HQ, ≥1 valid office, ≥3 practice areas, lawyers OR partners, contact email, website). New "Verified" threshold stays 0.60.
8. **Recompute `firm_comparable_index`** using cleaned data.

Result: ~60-70 verified firms, no Singapore-HQ Indian firms, no "Unknown" office cards, no fake partner ratios.

---

## B. Rewrite the profile page to be actually intelligent

Drop the dumb stuff, add real signal. Concretely:

**Remove from `FirmProfile.tsx`:**
- The 4-stat hero row when values are missing — never render `—` placeholders. If we don't have headcount, the "Partner ratio" and "Lawyers" tiles don't appear at all.
- "News (90d): 0" tile — replaced with nothing until ingestion exists.
- Office cards rendered from junk address strings (the "Unknown / Talk To Us" card).
- "Recent activity: No recent activity tracked yet — news ingestion launches soon." (delete entirely; don't promise futures in the UI.)

**Replace with computed intelligence** (only renders when we have inputs):

1. **Footprint** — single line: "HQ Mumbai · 8 offices across 7 cities · pan-India presence" (computed from cleaned offices). If 1 office → "Boutique, single-office firm in {city}".
2. **Practice depth** — bar showing how many of the firm's practices overlap with India's top-10 practice areas (computed across all 95 firms). E.g. "Covers 9/10 most common practices — full-service" vs "Covers 2/10 — boutique IP focus".
3. **Comparable firms** (already exists, keep) — but label it "Most similar by practice mix & footprint" and show the overlap score as a number (e.g. "82% overlap with Khaitan & Co").
4. **Signature practices** — only the top 3 by uniqueness (practice areas this firm has that <20% of comparable firms have). Real differentiator, not just "they have M&A like everyone else".
5. **Confidence strip** at top of page: "Profile confidence: 0.74 · Last verified May 6, 2026 · Source: firm website + Locus enrichment". If confidence < 0.60, show an amber "Limited data — some fields not yet verified" banner instead of pretending.
6. **Offices section** — render only cleaned offices with a real city + address. If we only have city names (no address), render compact chips, not big empty cards.

**Keep:** Ask-about-firm chat (already wired), JSON-LD, breadcrumbs.

---

## C. Directory chips — same cleanup

- Recompute `firm_intelligence_index` after reseed so chips reflect cleaned data.
- "Verified" chip only on firms passing new completeness check.
- Remove "Hiring" chip until we actually ingest careers/vacancies (we don't have that data — it's currently always false, which is dead UI).

---

## D. Out of scope for this pass

- News ingestion (still v1.5).
- Re-scraping firm websites (the CSV is what we have).
- Cyril Shroff & Co duplicate handling beyond hiding it (full merge is later).

---

## Build order

1. Migration: TRUNCATE intel tables, reset intel columns.
2. One-shot Node import script that reads the CSV, applies cleaning rules above, inserts via Supabase service-role into `firm_offices`, `firm_practice_areas`, `firm_profiles` updates, recomputes `firm_comparable_index` and `firm_intelligence_index`. Run it once.
3. Rewrite `FirmProfile.tsx` per section B (no `—` tiles, no "Unknown" cards, no future-promises text, add Footprint / Practice depth / Confidence strip).
4. Update `Directory.tsx` to drop the "Hiring" chip + filter.
5. Verify on `/directory/firms/cyril-amarchand-mangaldas` (HQ Mumbai, real offices, no Singapore, no Unknown card, no fake partner ratio, signature practices computed).
