The `/admin/firm-intelligence` page exists (and the new edit page at `/admin/firm-intelligence/:slug/edit`), but the Admin Dashboard tile grid in `src/pages/AdminDashboard.tsx` doesn't list it — that's why you don't see an entry point.

## Change

Add one tile to the `tools` array in `src/pages/AdminDashboard.tsx`:

- **to**: `/admin/firm-intelligence`
- **title**: Firm Intelligence
- **description**: Refresh, edit, and enrich firm directory profiles (paste text or upload PDF).
- **icon**: `Building2` (from lucide-react, already a common admin icon) — or `Sparkles` if you prefer to signal AI extraction
- **scope**: `admin`, `fullAdminOnly: true`

No other changes — the routes, sub-nav, and edit flow are already wired up.

## Question

Want me to also surface a quick "Edit a firm" shortcut on the dashboard (e.g., a small search/jump field), or is the single tile → list page → Edit button flow enough?