
# Firm Intelligence — Plan

Upgrade the directory so the top ~95 firms (Tier 1–3, the ones we scraped) get a rich, dedicated profile with people, practices, offices, and careers info. Tier 4 / Google-Maps-sourced firms keep today's lightweight card + drawer (zero regression).

We brand the whole thing as **"Firm Intelligence"** — a small accent badge that signals "this firm has the deep dossier."

---

## UX flow (3 surfaces)

```text
Directory card                Drawer (existing)             Full Intelligence page (NEW)
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────────────┐
│ Firm name       │   click   │ Name + chips    │   click   │ Header + stats          │
│ Tier · Type     │ ───────►  │ Contact         │ ───────►  │ About / Practices       │
│ ✦ Intelligence  │           │ Draft email     │           │ Offices / People        │
│ Address · Email │           │ ✦ OPEN FIRM     │           │ Contact / Links         │
└─────────────────┘           │   INTELLIGENCE  │           │ Suggest a fix           │
                              │ Suggest a fix   │           └─────────────────────────┘
                              └─────────────────┘
```

1. **Card** — small `✦ Intelligence` pill next to the existing tier/type chips, only when a firm has a profile row. Card click still opens the drawer (no behavior change).
2. **Drawer** — unchanged layout, but for firms with intel we add ONE prominent CTA above "Draft Application Email":

   ```
   ┌───────────────────────────────────┐
   │ ✦ Open Firm Intelligence      → │
   │ Partners, offices, practices…     │
   └───────────────────────────────────┘
   ```

3. **Full page** — `/directory/firm/$slug`, SSR'd, shareable, indexable.

Icon: `Sparkles` (lucide) in accent yellow, matching existing neobrutalist style. Reusable component `<FirmIntelligenceBadge />` so we keep one source of truth.

---

## 1. Data layer — `firm_profiles` table

New Supabase table keyed by `firm_slug` (TEXT PK — matches the CSV and pairs cleanly with `firm_suggestions.firm_id`).

Columns mirror the CSV roughly 1:1; JSON for repeating data:

```text
firm_slug          text  PK
firm_name          text  not null
website_url        text
tagline            text
description        text
founded_year       int
hq_city            text
offices            text[]            -- semicolon-split city list
office_count       int
office_addresses   jsonb             -- raw blob from scraper
practice_areas     text[]
total_lawyers      int
partner_count      int
team_members       jsonb             -- [] for most rows; raw when present
general_email      text
careers_email      text
press_email        text
phone_main         text
linkedin_url       text
twitter_url        text
careers_url        text
team_page_url      text
last_scraped_at    timestamptz
scrape_status      text              -- success | partial | failed
created_at / updated_at
```

RLS:
- public `SELECT` (read-only directory data, fine for SSR + anon)
- `INSERT/UPDATE/DELETE` only via `is_admin(auth.uid())`

Index on `firm_slug` (PK gives this) + GIN on `practice_areas` for future filtering.

**Seed**: one-shot import of `locus_firm_intelligence.csv` (95 rows) via the insert tool — raw, no normalization. UI handles cleanup.

**Linking to existing `firms.json`**: backfill a `firm_slug` field on the ~95 top entries via a one-off Node script (slug-match by name with a manual mapping JSON for ambiguous cases). Tier 4 entries stay slug-less → no profile → drawer stays exactly as today.

---

## 2. Directory list — Intelligence badge

In `Directory.tsx`, when a card's `firm_slug` exists in `firm_profiles`, render `<FirmIntelligenceBadge size="sm" />` next to the tier/type chips. Click on card → still opens the drawer.

Optional small filter chip in `FilterBar`: **"Intelligence only"** to narrow the list to enriched firms.

---

## 3. Drawer — adds "Open Firm Intelligence" CTA

`FirmDrawer.tsx`: when `firm.firm_slug` resolves to a profile (loaded via the same server fn used by the page, cached in TanStack Query), render the new accent CTA above "Draft Application Email":

- Neobrutalist style (matches existing "Suggest a fix" card)
- `Sparkles` icon, label "Open Firm Intelligence"
- Subtitle: "Partners, offices, practice areas…"
- `<Link to="/directory/firm/$slug" params={{ slug }}>`

If no profile → drawer renders exactly as today. No info added inline (keeps it fast).

---

## 4. Full Intelligence page — `/directory/firm/$slug`

New route file: `src/routes/directory.firm.$slug.tsx`. SSR loader via `createServerFn` reading `firm_profiles`; `notFoundComponent` if missing.

SEO: `head()` with `{firm_name} — Firm Intelligence | Locus`, description from tagline, og:title/description. Canonical `/directory/firm/{slug}`.

Sections (each hides if its data is empty — "import as-is, clean in UI"):

1. **Header** — name, `✦ Firm Intelligence` badge, tier badge, HQ city, share button, primary CTA "Draft Application Email" (uses `careers_email` > `general_email`).
2. **At-a-glance stats strip** — offices · practice areas · lawyers · partners · founded year (icons + numbers).
3. **About** — tagline + description paragraph.
4. **Practice areas** — full chip grid, alphabetised.
5. **Offices** — cards per city with parsed address snippet (best-effort regex on the blob); raw blob in expandable "Full address" if parse fails.
6. **People** — grid of `team_members` when present; otherwise empty-state pointing to the firm's `team_page_url` ("Team page is JS-rendered — view on firm site →").
7. **Contact & links** — emails (general / careers / press), phone, website, LinkedIn, Twitter, careers page.
8. **Suggest a fix** — reuses existing `SuggestFixDialog`, `firm_id` = slug.

Mobile (≤640px): header stacks, stats wrap 2×2, sections become accordions.

---

## 5. Out of scope (now)

- Re-running the scraper from inside the app (separate effort — `firm_careers_sources` already exists for vacancies, profile re-scrape can piggyback later).
- Admin editor for profile fields (the `firm_suggestions` queue already covers user-reported corrections).
- Per-lawyer pages.
- Auto-generating profile rows from new firms in `firms.json` (manual seed for now).

---

## File map

**Add**
- `supabase/migrations/<ts>_firm_profiles.sql` — table + RLS + indexes
- `src/server/firm-profiles.functions.ts` — `getFirmProfile(slug)`, `listFirmProfileSlugs()`
- `src/routes/directory.firm.$slug.tsx` — full page
- `src/components/directory/FirmIntelligenceBadge.tsx` — shared badge
- `src/components/directory/FirmIntelligenceCTA.tsx` — drawer CTA card
- `src/components/firm-profile/` — section components (Header, Stats, Offices, People, Contact)

**Edit**
- `src/components/FirmDrawer.tsx` — fetch profile flag, render CTA when present
- `src/pages/Directory.tsx` — render badge on cards with intel; load slug list once
- `src/data/firms.json` — backfill `firm_slug` on top ~95 firms (one-off Node script)

**Data import**
- After migration approval: one batch INSERT of 95 rows from CSV via the insert tool.
