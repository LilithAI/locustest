## Goal

Keep `/directory` exactly as it looks today. Only difference: enriched firms (the ~94 in `firm_profiles`) get a small `✦` marker. When the user opens such a firm, they see an "Open Firm Intelligence" CTA — clicking it takes them to a dedicated Firm Intelligence page for that firm. The actual UI for that page comes later from you. For now, blank-slate it.

## Changes

### 1. Directory cards (`src/pages/Directory.tsx`)
- Leave the existing card layout untouched (matches your screenshot).
- Add a small `✦` glyph next to the firm name **only** when the firm has a matching `firm_profiles` slug. No tooltip, no extra chip — just the mark, so it's a quiet signal.
- No CTA banner, no other listing changes.

### 2. Firm open behaviour
- Clicking a card continues to open the existing `FirmDrawer` for unenriched firms (no change).
- For enriched firms, the drawer shows one extra primary button: **"Open Firm Intelligence →"** that navigates to `/directory/firms/:slug`. All existing drawer content stays.

### 3. Firm Intelligence page (`src/pages/FirmProfile.tsx`)
- **Wipe the current rebuilt layout.** Replace with a minimal placeholder shell:
  - Back link to `/directory`
  - Firm name (fetched from `firm_profiles` so the route still resolves)
  - A single line: "Firm Intelligence page — UI coming next."
- No Locus Take block, no signals, no sections. Clean slate, ready for the UI you'll provide.
- The data fetch (`getFirmIntelligenceBySlug`) stays intact so we don't lose the wiring.

### 4. Things explicitly NOT touched
- `firm_profiles` table and the regenerated `locus_take` data (kept in DB, just not rendered yet).
- `firmIntelligence.ts` helpers.
- Everything outside `/directory/*` (no nav, homepage, opportunities, admin, auth changes).

## Files

- `src/pages/Directory.tsx` — add `✦` next to enriched firm names only.
- `src/components/FirmDrawer.tsx` — add the "Open Firm Intelligence →" button when the firm is enriched.
- `src/pages/FirmProfile.tsx` — strip down to a placeholder shell.

## Verification

1. `/directory` looks identical to your screenshot, except enriched firms (Cyril Amarchand, Phoenix Legal, Khaitan Legal Associates, etc.) show a `✦` next to their name.
2. Open any unenriched firm → drawer behaves exactly as today.
3. Open an enriched firm → drawer shows existing content + "Open Firm Intelligence →".
4. Click that button → lands on `/directory/firms/:slug` showing only the placeholder, ready for your UI spec.
