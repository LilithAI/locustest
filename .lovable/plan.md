## Goal

Rehaul the `/tools` **landing/grid page** with a neobrutalist aesthetic that matches the Locus theme (heavy black borders, hard shadows, mono caps, accent-yellow blocks, no soft glassy gradients). Remove CV Analyser from the Tools catalog since it's already pinned at the top of `/resources`.

## Scope (what changes vs. what doesn't)

**Changes — Tools landing page only:**
- `src/data/tools.ts` — remove the CV Analyser entry (`num: "01"`); renumber the remaining 10 tools `01–10`. Update the `Students` count for the category bar accordingly.
- `src/pages/Tools.tsx` — rebuild the **landing view** (hero, jurisdiction strip, category tabs, tool grid) in neobrutalism style. The category-counts array currently hardcodes `(11)/(3)` etc. — recompute from `TOOL_CATALOG` so it stays correct after the CV removal.

**Does NOT change:**
- The actual tool generators (NDA, Checklist, DPA, Internship, Freelancer, ToS) — forms, AI prompts, output rendering, share/download logic all stay byte-identical.
- `/tools/cv-analyser` page itself — still works, still linked from `/resources`. Just no longer surfaced on `/tools`.
- `/resources` page — unchanged.
- Navbar, routing, business logic — unchanged.

## Neobrutalist visual direction

Aligned with Locus dark theme + accent yellow (already in `src/styles.css`):

- **Borders:** `border-2 border-foreground` (or `border-accent` on featured), no rounded-2xl — use `rounded-none` or `rounded-sm` max.
- **Shadows:** hard offset shadow `shadow-[6px_6px_0_0_hsl(var(--foreground))]`; on hover translate `-2px,-2px` and grow shadow to `8px 8px 0`.
- **Type:** big slab/heading sizes, monospace caps for tags + numbering (`01 / 10` style top-left of each tile).
- **Color blocks:** featured/active states get full `bg-accent text-accent-foreground` flat fill instead of subtle tints. Category tabs become hard chips that flip to solid yellow when active.
- **Hero:** keep the existing copy ("AI-powered legal document tools…") but reframe in a brutalist slab — left-aligned giant heading, `LOCUS TOOLS` eyebrow chip with hard border, jurisdiction pills as black/yellow swatches with 2px borders.
- **Tool grid:** 3-column on desktop / 1-col mobile, each card a rectangular black panel with hard accent shadow, `XX` index in the corner, name in heading font, tags as mono uppercase chips, "Coming Soon" overlay as a diagonal yellow stamp.
- **Category bar:** horizontal row of brutalist chip-buttons with `(N)` count suffix; active = solid accent fill.

No gradients, no soft glass, no backdrop-blur on this page.

## Implementation steps

1. **`src/data/tools.ts`** — drop the CV Analyser item; renumber `02…11` → `01…10`. Remove `Students` from any item that no longer applies (only CV had it as primary; Internship + ESOP still cover Students).
2. **`src/pages/Tools.tsx`** — replace only the landing-view JSX (the part rendered when `selectedTool === null`) with the new neobrutalist layout. Recompute `CATEGORIES` counts from `TOOL_CATALOG.filter(...)` instead of hardcoding. Keep all tool-specific state, generator forms, and output rendering unchanged.
3. Verify: visit `/tools` in preview at the current 1032px viewport — confirm grid is 2–3 col, hard shadows render, CV Analyser is gone, every other tool still opens its form, "Coming Soon" tools still show vote button. Check `/resources` still pins CV Analyser.

## Out of scope

- Any change to individual tool form UIs (those keep their existing styling for now — can be brutalised in a follow-up pass if you want).
- Changes to `/tools/cv-analyser` itself.
- Routing/migration work (separate plan in `.lovable/plan.md`).
