## Problem

Two bugs in the People section:

1. **Field mismatch** — scraped data stores titles in `designation`, but the `TeamMember` TS interface and UI read `role`. So titles like "Partner" never render.
2. **Scraper junk leaked in** — entries like `People`, `Management Board`, `Practice Areas`, `Sectors` are stored as if they were lawyers (they're nav labels). Some have a `designation` field containing a multi-paragraph blob of unrelated text scraped from the page.

This affects ~18 firms with team data (SAM, AZB, Bharucha, etc.).

## Fix

### 1. Render-time cleanup (`FirmProfile.tsx` + `firm-profiles.ts`)

Add a `normalizeTeam(rawMembers)` helper that:

- Maps `designation` → `role` (keep `role` as fallback)
- Drops entries whose `name` matches a junk blocklist: `People`, `Management Board`, `Practice Areas`, `Sectors`, `Practice Area Heads`, `Our People`, `Team`, `About`, `Contact`, etc. (case-insensitive)
- Drops entries where `name` is empty, longer than ~60 chars, or contains digits/newlines (real names don't)
- Truncates `role` to first ~80 chars and strips anything after a digit-run or capital-cluster (catches the SAM blob "Management BoardOur Management Board guides…")
- Dedupes by name

Apply the same helper in `FirmDrawer.tsx` if it shows team members.

### 2. One-off DB cleanup migration

Run a SQL update to filter `team_members` arrays in place using the same rules so the bad rows disappear from the database permanently:

```sql
update firm_profiles
set team_members = (
  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  from jsonb_array_elements(team_members) elem
  where (elem->>'name') is not null
    and length(elem->>'name') between 2 and 60
    and lower(elem->>'name') not in (
      'people','management board','practice areas','sectors',
      'practice area heads','our people','team','about','contact','home'
    )
    and (elem->>'name') !~ '[0-9]'
);
```

Plus null-out / shorten any `designation` field longer than 120 chars (they're scraping artifacts, not real titles).

### 3. Re-render

After cleanup, the SAM page will show 5 real partners (Pallavi Shroff, Akshay Chudasama, Gunjan Shah, Jatin Aneja, Raghubir Menon) each with their actual title, instead of "People" and "Management Board" cards.

## Out of scope

- Re-running the scraper to fetch fresh team data
- Adding lawyer photos / bios
- Per-lawyer profile pages

## Files

- Edit `src/lib/firm-profiles.ts` — add `normalizeTeam()` + extend `TeamMember` to include `designation`
- Edit `src/pages/FirmProfile.tsx` — pipe team through `normalizeTeam`, render `role` correctly
- Edit `src/components/FirmDrawer.tsx` — same normalization if it lists members
- New migration to scrub `team_members` JSON in `firm_profiles`
