## Problem

In Review & promote, `description` is just a fragment from extraction (sometimes empty, like in your screenshot). You want a long, well-written description that pulls in everything: role, requirements, qualifications, eligibility, responsibilities, practice area, stipend, etc. — all from the data we already have (`ai_extracted` + `raw_text`).

## Solution

Add a "Generate description" button next to the Description field in the Review & promote dialog.

### Behaviour

- Clicking it sends `ai_extracted` (the structured fields) + `raw_text` (the scraped markdown, truncated to ~25k chars) + the firm/role context to a new edge function `generate-vacancy-description`.
- Edge function calls Lovable AI (`google/gemini-2.5-pro`) with a prompt that instructs it to write ~800–1000 words covering: role overview, key responsibilities, eligibility & qualifications, experience required, practice area context, location, stipend/compensation, application process, deadline, and any task brief — formatted in clean Markdown sections (no invented facts; only synthesise what's in the inputs).
- Response replaces the Description textarea content. Loading spinner on the button while generating.

### UI changes (`ReviewQueuePanel.tsx`)

- Description label row: add a small "✨ Generate (1000 words)" button on the right.
- Make the Description Textarea taller (rows=3 → rows=14) so the long output is readable.
- Show a toast on success/error.
- Same button also added to PreviewDialog? **No** — preview is read-only; generation lives in Review & promote where the admin saves it.

### New edge function `supabase/functions/generate-vacancy-description/index.ts`

- POST `{ ai_extracted, raw_text, firm_name, role }` → returns `{ description: string }`.
- Auth: requires `opportunities_admin` scope (same pattern as scrape function).
- Calls Lovable AI Gateway, no streaming (single shot).
- Handles 402 / 429 with friendly errors.
- `verify_jwt = true` (default).

## Out of scope

- No DB changes — generated text just lives in the form until admin clicks Promote.
- No auto-generation on scrape (kept manual so admin reviews + triggers).
- No regeneration history / versions.

## Question

Confirm word count target: **1000 words** as you said, or should it adapt (e.g. 400–1000 depending on how much info exists, so sparse listings don't get padded with fluff)?