Two changes to **Opportunities → Review Queue** (`src/components/admin/opportunities/ReviewQueuePanel.tsx`).

## 1. India-only filter

The queue currently shows everything scraped from firm careers pages, including London/Singapore/Dubai postings from international firms.

Approach: filter client-side at render time using a heuristic on `ai_extracted.location` (and `ai_extracted.country` if present):

- **Include** if location/country mentions India, an Indian city (Mumbai, Delhi, Bengaluru/Bangalore, Gurugram/Gurgaon, Noida, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Chandigarh, Jaipur, etc.), or is empty/unknown (we don't want to drop rows the AI failed to tag — better to surface and let admin reject).
- **Exclude** if location contains a known non-India token (London, Singapore, Dubai, New York, Hong Kong, Sydney, Tokyo, Paris, Frankfurt, Riyadh, Abu Dhabi, etc.).

Add a small toggle above the queue: **"India only" (default ON)** with the count `Queue (n India / m total)`. Toggle OFF to see everything, useful for debugging the filter.

This is purely a display filter — no DB changes, no scraper changes. Excluded rows stay pending in the DB so we can revisit the heuristic later.

## 2. Preview button

Add a **Preview** button on each queue card (next to Reject / Review & promote) that opens a read-only modal showing:

- All AI-extracted fields nicely formatted (role, firm, location, type, deadline, eligibility, stipend, description, apply URL/email)
- The raw scraped markdown (same panel as the review dialog)
- A link to the source URL
- Footer: **Reject** and **Review & promote →** (which closes preview and opens the existing edit dialog)

This lets admins skim the full posting before deciding, without entering edit mode.

## Files

- `src/components/admin/opportunities/ReviewQueuePanel.tsx` — add filter toggle, India heuristic, Preview button + new `<PreviewDialog>` component.

No DB or edge function changes.

## Question

Should the India filter also apply to the **Sources** tab (hide non-India firms' source pages), or only filter the queue results? My default: queue only — sources stay full so we can disable non-India firms manually.