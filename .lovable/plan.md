
# Firm Intelligence v1 — Locked Plan

Building the full revised v1: chips on directory, rich profile pages, normalized comparison, "Ask about this firm" AI chat, news layer, team movement tracking, firm-aware cold email, and the nightly compute pipeline. Verified threshold = 0.60.

We already have a `firm_profiles` table with 95 firms (18 with lawyer counts, 17 with team data). We're upgrading it, not rebuilding it.

---

## Phase A — Schema & data model

### A1. Extend `firm_profiles`
Add columns:
- `tier` (enum: tier_1, tier_2, tier_3, boutique, untiered) — copied from `firms.json` at seed
- `headcount_band` (enum: micro, boutique_size, mid, large, big_law) — computed
- `partner_associate_ratio` (numeric) — computed
- `hiring_velocity` (numeric) — open vacancies ÷ total_lawyers
- `growth_signal_90d` (enum: growing, stable, shrinking, unknown) — defaults `unknown` until we have diffs
- `intelligence_completeness_score` (numeric 0–1) — computed
- Per-section freshness: `team_last_updated_at`, `practice_areas_last_updated_at`, `news_last_updated_at`, `offices_last_updated_at`
- Structured social: `instagram_url`, `youtube_url` (nullable, optional)

### A2. New tables
- **`firm_offices`** — id, firm_slug fk, city, address, phone, email, headcount (nullable), is_hq (bool). Migrate from existing JSON `office_addresses` on first deploy.
- **`firm_practice_areas`** — id, firm_slug fk, area, partner_count (nullable), depth_score (computed), is_signature (bool). Migrate from existing `practice_areas[]`.
- **`firm_team_members`** — id, firm_slug fk, name, title, profile_url, image_url, practice_area (nullable), seniority (enum), first_seen_at, last_seen_at, status (active/departed). Migrate from existing `team_members` JSONB.
- **`firm_news_mentions`** — id, firm_slug fk, title, url, source (enum: bar_bench, livelaw, scc, business_standard, et, other), published_at, mention_type (enum: deal, award, lateral, ranking, article, other), excerpt
- **`firm_team_movements`** — id, firm_slug fk, member_name, movement_type (joined/departed), detected_at, prior_firm (nullable), next_firm (nullable)
- **`firm_rankings`** — id, firm_slug fk, ranking_source (enum: chambers, legal500, rsg, iflr1000, asialaw), practice_area, band_or_tier, year
- **`firm_comparable_index`** — firm_slug, comparable_slug, similarity_score, shared_practice_areas (int), same_tier (bool), same_city (bool); composite PK

All tables: RLS public SELECT; writes restricted to admins via `is_admin(auth.uid())`. Indexes on every `firm_slug`, plus `practice_areas.area`, `offices.city`, `news.published_at`, `team_members.status`.

### A3. Seed migration
One-shot loader (server fn, admin-only) that normalizes the existing JSONB columns on `firm_profiles` into the four new structured tables, copies `tier` from `firms.json`, and runs the first compute pass.

---

## Phase B — Computation pipeline

A single edge function `recompute-firm-intelligence` triggered by `pg_cron` nightly:
1. Recompute `headcount_band`, `partner_associate_ratio`, `hiring_velocity`, `intelligence_completeness_score` for every firm.
2. Snapshot current `firm_team_members` set; diff vs. last week's snapshot in a small `firm_team_snapshots` ledger; write new rows into `firm_team_movements`; flip `status` on departed members; set `growth_signal_90d` from net joins/exits over 90 days.
3. Recompute `firm_comparable_index` for all 95 firms (~9k pairs — trivial in SQL).
4. Pull Bar & Bench RSS (with LiveLaw fallback), classify mention_type via simple keyword rules + Lovable AI Gateway for ambiguous ones, upsert into `firm_news_mentions`. Match firms by name normalization against firm_slug. **If RSS fails 3x consecutively, log to a `pipeline_failures` table and skip silently — don't block the rest of the run.**
5. Update all `*_last_updated_at` timestamps.
6. Regenerate a small `firm_intelligence_index.json` snapshot (slug → chip flags) written to a public storage bucket so the directory list can render chips with zero DB roundtrips per card.

Manual "Run now" button in admin for dev/testing.

### B1. Rankings seeding
Manual one-time CSV upload UI in admin (small page) for top ~30 firms across Chambers / Legal500 / RSG. Not automated in v1.

---

## Phase C — Frontend

### C1. Directory upgrades (`/directory`)
- Intelligence chips on each card: **Verified** (completeness ≥ 0.60), **Hiring Now**, **Growing**, **Boutique** / **Big Law**, **Top Tier**, **Recently Active** (>2 news in 30d).
- New filter row above the list to toggle each chip.
- "Practice specialist" filter integrates with existing practice-area filter — surfaces firms where that area is `is_signature=true`.
- Card renders chip lookup from the prebuilt index file (no per-card query).

### C2. Existing FirmDrawer
- For firms with intelligence: prominent **"Open full profile →"** CTA at top of drawer.
- Compact preview: tier badge, headcount band, signature practices count, last news date.
- Drawer keeps its existing email-drafting behavior; profile page is the "read more" surface.

### C3. New profile page `/directory/firms/$slug`
Sections (in order):
1. **Hero** — name, tagline, tier badge, size band, founding year, HQ, total lawyers, completeness indicator, action buttons (Draft cold email, Compare, Open careers, Share)
2. **At a glance** — partner-associate ratio, total offices, practice area count, lateral movements last 90d, open vacancies count, news mentions last 90d
3. **Signature practices** — only `is_signature=true`, ranked; each links back to filtered directory
4. **All practice areas** — full chip cloud
5. **Office presence** — grid with city + address + headcount % distribution
6. **Team movements (90d)** — neutral display: "3 joins, 1 exit" + names
7. **Recent activity** — chronological news feed, type-tagged
8. **Rankings & recognition** — from `firm_rankings`
9. **Similar firms** — top 3–5 from `firm_comparable_index`
10. **Ask about this firm** — chat box (see C5)
11. **Contact** — emails, phone, website, social, careers, with per-section freshness timestamps

SEO: custom `<head>` per route — title `"{Firm} — Practice Areas, Offices, Hiring | Locus"`, meta description from tagline + headcount + offices, JSON-LD `LegalService` schema, canonical URL.

### C4. Comparison upgrade (`CompareBar`)
Normalized side-by-side rows: headcount band, partner-associate ratio, office count, total lawyers, practice area overlap (shared chips highlighted), tier, signature practices, news mention count, team growth 90d, open vacancies. Gracefully degrades for non-intelligence firms (rows render as "—").

### C5. "Ask about this firm" chat
Server fn `askAboutFirm({slug, question})`:
- Loads full intelligence record + related tables (offices, practice areas, team, news, movements, rankings).
- Streams answer via Lovable AI Gateway (`google/gemini-2.5-flash`).
- System prompt: answer ONLY from provided structured data + recent news; cite section ("Per Offices section…"); refuse speculation on culture/salary/work-life.
- Pre-canned suggested questions rendered as quick-reply chips.
- Stored in a lightweight `firm_chat_logs` table (firm_slug, question, answer, created_at, anon_id) for later quality review.

### C6. Firm-aware cold-email drafter
Edit the existing `draft-application-email` edge function:
- Accept optional `firm_context` payload: practice areas (signature flagged), tier, size band, hq_city, total_lawyers, tagline, last 3 news items, open vacancies count, best-fit recipient (careers_email if applying / general_email if cold pitch / practice-area lead if known).
- Two prompt branches: applying-to-posted-role vs. cold-pitch.
- Weave 1–2 specific firm details naturally; explicit instruction to never fabricate.

---

## Phase D — Wiring

- Keep `firms.json` as the 3,600-row browse list; no changes to the basic directory query.
- Build-time `firm_intelligence_index.json` lives in storage bucket `firm-intelligence`, refreshed by the nightly job.
- Public server fn `getFirmIntelligence(slug)` for the profile page (joins all six related tables in one round-trip).
- Admin server fn `seedFirmIntelligence()` and `recomputeNow()` exposed in a small admin page under `/admin/firm-intelligence`.

---

## Explicit non-goals (v1)
AI Match-Me recommender, full admin editor for intelligence rows, automated re-scrape orchestration, multi-city directory dedup, salary intelligence, alumni tracker.

---

## Risks acknowledged
- **News layer**: Bar & Bench RSS may be flaky/blocked. Pipeline degrades gracefully — `firm_news_mentions` stays empty; news section renders "No recent activity tracked yet" instead of breaking.
- **Team movements**: On day 1, `firm_team_movements` is empty (no historical snapshot). First useful diff appears 7 days after launch. Profile section hides itself when there's nothing to show.
- **Verified threshold (0.60)**: ~60–70 firms expected to qualify. We'll re-tune after launch based on which fields pass/fail in production.
- **AI chat thinness**: For firms with sparse data, chat will say "I don't have that information" often. System prompt explicitly accepts this rather than hallucinating.

---

## Build order (so each phase ships verifiable value)
1. Schema migration (Phase A) — approved & applied.
2. Seed migration normalizing existing JSONB into new tables.
3. Compute pipeline (Phase B1–B3 only, no news yet) + first manual run.
4. Profile page + chips + drawer CTA (Phase C1–C3).
5. Comparison upgrade (Phase C4).
6. Cold-email upgrade (Phase C6).
7. AI chat (Phase C5).
8. News ingestion (Phase B4) + rankings seeding (Phase B1) — last because most likely to need iteration.
