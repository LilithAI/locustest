## Scope

Import all **26 opportunities** from your three uploaded HTML snapshots into the live database:

- **20 vacancies** (career tab) → `public.vacancies`
- **3 CFPs** (academic tab) → `public.cfps`
- **3 competitions** (contests tab) → `public.competitions`
- 0 moots in the snapshot — nothing to insert there.

The current DB has 0 rows in all four tables, so this is a clean import (no dedupe needed).

## Steps

1. **Parse the three HTML files** with a small Python script — one record per card. Extract firm/title, type, location, stipend/fee, eligibility, description, deadline countdowns, source credit, and visible "task required" / email hints.
2. **Derive timestamps**:
   - `posted_at` from "Listed today / 1d ago / …" (today − N days).
   - `expires_at` from the visible countdown ("4d 05h left" → now + delta) or from explicit deadlines in the description ("May 8, 2026", "20.05.2026") when stronger.
3. **Map application contacts for vacancies**:
   - Visible emails in the description (Panda Law, Accio Legal, Sarvada Legal, K Vinod Chandran chamber etc.) → `application_mode='email'`.
   - Cards labeled "Portal" → `application_mode='external_url'` with the firm's careers page or, if not visible, a Lawctopus/source-credit URL.
   - Per your earlier preference: **option (a)** — if neither a real email nor a real URL is available, **skip the row** (the trigger rejects bad emails/URLs). I'll list any skipped at the end.
4. **Map enums** to existing types:
   - `tier`: from visible badge ("Other"→`other`, "Boutique"→`boutique`); else null.
   - `practice_area`: from "Practice" detail ("Disputes/Litigation", "Corporate", "General"); else null.
   - `opportunity_type`: `internship` | `job`.
5. **CFPs** → `cfps`: `publication_name`, `publication_type='journal'`, `peer_reviewed=true` (all three say peer-reviewed), `submission_deadline` from countdown, `expires_at`=submission_deadline, `source_credit='NLSIU'`.
6. **Competitions** → `competitions`: `title`, `organiser`, `category='other'` (or `essay` for the IDIA one), `mode` (online/hybrid/offline), `fee`, `prize_or_stipend`, `deadline` from countdown, `expires_at`=deadline, `source_credit='Lawctopus'`.
7. **`created_by`** for every row = `22c16a7e-93b3-44f1-b1fc-2199a1937528` (the existing admin).
8. **Insert** with `supabase--insert` in three statements (vacancies, cfps, competitions). The validation triggers will enforce email/URL formats and `expires_at > posted_at`.
9. **Report back**: counts inserted per table and any rows I had to skip (with reason).

## Out of scope

- No schema/RLS changes (tables already exist).
- No frontend changes — once inserted, they'll show on `/opportunities` automatically.
- No scraper or admin UI work.

Approve this and I'll run it.