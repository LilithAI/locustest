## Goal

A new admin tool at `/admin/firm-intelligence/:slug/edit` that lets you:
1. **Paste raw text** about a firm (brochure copy, partner email, ranking blurb, etc.), OR
2. **Upload a PDF** (brochure, ranking report, profile doc),
3. Click **"Extract & preview"** → AI parses it into structured fields,
4. Review a **diff** (current vs. proposed values) and tick which to apply,
5. Click **Save** → writes to `firm_profiles` + child tables (`firm_offices`, `firm_practice_areas`, `firm_team_members`, `firm_rankings`).

This complements the existing scrape (`refresh-firm-intelligence`) — scrape pulls the website, this lets you patch in anything the website doesn't surface.

## UX flow

From the existing **Firm Intelligence** admin page, each row gets an **"Edit"** button → opens the new editor page.

```
┌─ Khaitan Legal Associates ────────────────────────────┐
│  [ Paste text ▼ ]  [ Upload PDF ▼ ]                   │
│  ┌─────────────────────────────────────────────┐      │
│  │ (textarea OR pdf dropzone)                  │      │
│  └─────────────────────────────────────────────┘      │
│  [ Extract & preview ]                                │
│                                                       │
│  ── Proposed changes ─────────────────────────        │
│  ☑ tagline:    "—" → "India's untiered firm"         │
│  ☑ founded:    null → 2014                            │
│  ☑ + 3 offices (Mumbai, Delhi, Bengaluru)             │
│  ☐ practice_areas: replace 5 → 12                     │
│  ☑ + 4 team members                                   │
│                                                       │
│  [ Cancel ]                            [ Apply ✓ ]    │
└───────────────────────────────────────────────────────┘
```

Manual override: every field in the diff is also editable inline before saving (so you can fix AI extraction mistakes).

## Architecture

```text
Admin UI (src/pages/AdminFirmEdit.tsx)
   │
   │  1. POST PDF/text → edge fn
   ▼
extract-firm-intelligence (new edge fn)
   - if PDF: pdf.js text extract
   - call Lovable AI (google/gemini-2.5-pro) with structured-output schema
   - returns FirmExtraction JSON (same shape as refresh-firm-intelligence)
   │
   ▼  2. Show diff in UI, user ticks fields
   │
   │  3. POST {slug, patch} → edge fn
   ▼
apply-firm-intelligence (new edge fn, admin-only)
   - upsert firm_profiles columns
   - replace child rows for ticked sections (offices/practice_areas/team/rankings)
   - bump intelligence_completeness_score, last_scraped_at
```

## New edge functions

1. **`extract-firm-intelligence`**
   - Input: `{ firm_slug, source_type: 'text'|'pdf', text?, pdf_base64? }`
   - PDF parsing: lightweight `pdf-parse` equivalent or pdf.js (text only, no images)
   - Calls Lovable AI with the **same JSON schema** the scraper uses (reuse types from `refresh-firm-intelligence`)
   - Returns extracted JSON — does **not** write to DB
   - Admin-only (verify JWT + `is_admin`)

2. **`apply-firm-intelligence`**
   - Input: `{ firm_slug, patch: Partial<FirmExtraction>, sections: { offices: bool, practice_areas: bool, team: bool, rankings: bool } }`
   - Service-role writes; admin-only
   - For ticked sections: `DELETE` existing rows for slug + `INSERT` new
   - For scalar fields (tagline, founded_year, etc.): only update keys present in patch

## New frontend

- **`src/pages/AdminFirmEdit.tsx`** — the editor page above
- **`src/components/admin/FirmDiffView.tsx`** — renders the field-by-field diff with checkboxes + inline edit
- Route: `/admin/firm-intelligence/:slug/edit` in `App.tsx`
- Add **"Edit"** button per row in existing `AdminFirmIntelligence.tsx`

## DB

**No schema changes needed** — writes go to existing `firm_profiles` + child tables. RLS already restricts admin writes via service role in edge function.

Optional small addition: `firm_edit_log` (firm_slug, admin_user_id, source_type, applied_fields jsonb, created_at) for audit trail. **Default: include this** — easy to add, useful for "who changed what".

## Files

**New:**
- `supabase/functions/extract-firm-intelligence/index.ts`
- `supabase/functions/apply-firm-intelligence/index.ts`
- `src/pages/AdminFirmEdit.tsx`
- `src/components/admin/FirmDiffView.tsx`
- 1 migration: `firm_edit_log` table

**Edited:**
- `src/App.tsx` (lazy route)
- `src/pages/AdminFirmIntelligence.tsx` (Edit button per row)

## Out of scope

- Bulk PDF upload (one firm at a time)
- Image/logo extraction from PDF
- Auto-apply without review (always diff-then-confirm)
- Editing comparable firms / news mentions (keep those scraper-only for now)
