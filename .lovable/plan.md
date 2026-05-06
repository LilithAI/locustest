## Goal

In the admin Review Queue, let the reviewer see a **demo preview** of how each vacancy will look on the public Opportunities page once promoted — and ensure the AI extracts a **rich, long description** so that preview is meaningful.

## What changes

### 1. Richer descriptions from the scraper

Update `supabase/functions/scrape-firm-careers/index.ts`:

- Rename the field `description_excerpt` → `description_full` and lift the cap from 500 chars to ~2500 chars.
- Strengthen the extraction prompt: instruct the model to write a detailed, well-formatted description (responsibilities, eligibility nuances, qualifications, perks) using the source markdown — not a one-liner. Preserve bullet points where present.
- Keep a separate short `description_excerpt` (≤220 chars) auto-derived for list cards.
- Both fields persist into `vacancy_review_queue.ai_extracted` so existing rows still work; the promote step already maps `description` to vacancies.

### 2. "Preview as live" demo view in the Review Queue

In `src/components/admin/opportunities/ReviewQueuePanel.tsx`:

- Add an **"Eye" Preview button** on each queue card (next to Reject / Promote).
- Clicking it opens a new `LivePreviewDialog` that renders the vacancy using the **real public `<VacancyCard>`** component (from `src/components/vacancies/VacancyCard.tsx`), passing a synthesized `Vacancy` object built from the queue row + `ai_extracted` fields (firm, role, location, eligibility, stipend, deadline, tier, description, application URL, posted_at = now, expires_at = now + 30d).
- Dialog header reads "Preview — this is exactly how it will appear on Opportunities". A footer offers shortcut buttons: **Edit & Promote** (opens existing ReviewDialog) and **Close**.
- Inside the existing `ReviewDialog`, also embed a smaller live preview pane on the right that updates as the admin edits fields, so they can see the card before hitting Promote.

### 3. Surface the long description in the edit dialog

- The `description` textarea in `ReviewDialog` already exists — bump rows to ~10 and prefill from the new `description_full` (fallback to old `description_excerpt`).

## Out of scope

- No DB migration (we reuse `ai_extracted` JSONB).
- No changes to the public Opportunities page itself.
- No re-scraping of historical rows; only newly-scraped vacancies will have the richer description. Existing rows still preview cleanly using whatever they have.

## Technical notes

- `VacancyCard` requires a `Vacancy` shape from `@/lib/vacancies`; we'll build a minimal in-memory object (no insert) — pass `application={null}`, `archived={false}`, omit `onApply`/`onDeleted` so action buttons are inert in preview.
- Wrap the preview card in a non-interactive container (`pointer-events-none` on action buttons via a CSS overlay, or simply leave the buttons live but harmless since no real apply handler is wired).
- LivePreviewDialog uses the same shadcn `Dialog` already imported in the panel.
