## Firm Intelligence v1 — Remaining Build Plan

Phase A (schema) and the profile page shell are live. Below is everything left to ship before you test end-to-end.

### Step 1 — Directory chips & filters
- Load `firm_intelligence_index` (lightweight client cache) on `/directory` mount.
- On each firm card, render up to 3 chips: **Verified** (score ≥ 0.60), **Top Tier** (tier in Tier 1/Magic Circle), **Hiring Now** (hiring_velocity > 0), **Growing** (growth_signal_90d > 0), **Boutique** / **Big Law** (headcount_band).
- Add a filter row above the list: "Verified only", "Hiring", tier dropdown, size band dropdown. Wire into existing filter state.
- "Practice specialist" toggle: when a practice area filter is active, sort firms with `is_signature = true` for that area to the top.

### Step 2 — Profile page polish
- Add: Team Movements section (joins/exits last 90d, empty-state friendly), Rankings section (table by source/year), Recent Activity (news mentions placeholder until Step 6), per-section "Updated {date}" labels.
- Hero: tier badge, completeness score bar, HQ city, headcount band, signature practice tags.
- SEO: dynamic `<title>`, meta description, JSON-LD `LegalService` from loader data, og:image fallback.
- Breadcrumbs + back-to-directory link.

### Step 3 — Side-by-side comparison upgrade
- Extend existing `CompareBar` to pull from `firm_comparable_index` + `firm_profiles`.
- Compare rows: tier, headcount band, partner/associate ratio, signature practices (overlap highlighted), HQ + offices, hiring velocity, completeness score.
- Up to 3 firms. Sticky header, horizontal scroll on mobile.

### Step 4 — Firm-aware cold-email drafter
- Edit existing `draft-application-email` edge function: accept optional `firm_context` payload (slug → server fetches tier, signature practices, hq_city, size band, tagline, latest news headline, open vacancies, best-fit recipient email).
- Two prompt branches: "applying to posted role" vs. "cold pitch".
- Explicit no-fabricate rule in system prompt; cite only fields present in payload.
- Wire FirmDrawer's "Draft email" button to pass slug.

### Step 5 — "Ask about this firm" chat
- New edge function `ask-about-firm`: input `{slug, question}`. Server loads structured firm context (no raw RAG), calls `google/gemini-2.5-flash` via Lovable AI Gateway with strict system prompt: answer only from supplied data, otherwise say "Not in our records."
- Log every Q/A to `firm_chat_logs` with anon session id.
- UI: collapsible section on profile page, 4 pre-canned suggested questions ("What do they specialize in?", "Are they hiring?", "Where are their offices?", "How do they compare to peers?").

### Step 6 — News + rankings ingestion
- Manual one-time seed: rankings for ~30 top firms (Chambers, Legal500, RSG, IFLR1000) via SQL insert script.
- Edge function `ingest-firm-news`: pull Bar & Bench RSS, fallback LiveLaw RSS. Match headlines to firm names (fuzzy on `normName`). Upsert into `firm_news_mentions`. Degrade gracefully on 3 consecutive failures.
- Schedule via `pg_cron` nightly (02:00 IST) → calls `recompute-firm-intelligence` which now also triggers news ingestion and refreshes the intelligence index JSON.
- Admin button at `/admin/firm-intelligence`: "Run recompute now", "Re-seed normalized tables", "View last run log".

### Step 7 — Final QA pass
- Verify chips render for all 95 firms with intelligence rows.
- Verify FirmDrawer CTA only shows when intelligence exists, profile page handles missing-data gracefully (empty states, not crashes).
- Verify cold-email and chat both refuse to fabricate when fields are null.
- Spot-check 5 firms across tiers; confirm SEO tags + JSON-LD render in view-source.

### Build order
1, 2, 3 → ship & you can already test browse/compare/profile
4, 5 → AI features
6 → news/rankings (most likely to need iteration; intentionally last)
7 → QA

### Out of scope (unchanged)
AI Match-Me, full admin editor, automated re-scrape, multi-city dedup, salary, alumni.
