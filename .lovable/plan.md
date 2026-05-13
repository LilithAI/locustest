## SEO Enhancement Plan for Locus

The basics are already in place (per-page titles via `usePageMeta`, OG tags, robots.txt, Organization JSON-LD, canonical URLs). The big gaps are: **Google sees the same blank-shell HTML for every route** (SPA limitation), the **sitemap is static and missing 90% of pages**, and there's **no rich structured data** for firms/playbook guides.

This plan tackles all three, plus keyword-targeted content tweaks and Google Search Console verification.

---

### Phase 1 — Build-time prerendering (biggest win)

Add `@prerenderer/rollup-plugin` + `@prerenderer/renderer-puppeteer` to `vite.config.ts`. After `npm run build`, it spins up headless Chrome, visits each route, and writes a real HTML file (`/directory/index.html`, `/playbook/index.html`, etc.) with full content + per-page meta tags baked in.

Routes to prerender:
- All static pages: `/`, `/waitlist`, `/directory`, `/playbook`, `/resources`, `/tools`, `/tools/cv-analyser`, `/the-bar`, `/the-bar/preview`, `/the-bar/browse`, `/the-bar/leaderboard`, `/opportunities`
- All playbook guide slugs (read from `src/content/playbook/index.ts`)
- All firm profile slugs (fetched at build time from Supabase via service-role key)

Routes excluded (auth/private/dynamic-only): `/app`, `/auth`, `/admin/*`, `/profile/edit`, `/u/:username`, `/the-bar/challenge/:id`, `/the-bar/history`, `/applications`, `/beta/*`, `/dock-lab`, `/tour-lab`, `/reset-password`, `/choose-username`, `/unsubscribe`.

Cloudflare Pages already supports puppeteer in its Node 20 build environment — no infra change needed.

### Phase 2 — Dynamic sitemap generator

Replace `public/sitemap.xml` (currently 7 hardcoded URLs) with a build-time script (`scripts/generate-sitemap.ts`) that runs before `vite build` and writes a fresh `public/sitemap.xml` containing:

- All static routes from Phase 1
- One entry per published firm (with `lastmod` from `updated_at`)
- One entry per playbook guide
- One entry per published opportunity (if you want them indexed)

Update `package.json` build script to: `tsx scripts/generate-sitemap.ts && vite build`.

### Phase 3 — Per-page meta audit

Run through every public page's `usePageMeta()` call and tighten titles + descriptions for keyword targeting:

- `/` — already strong (`Merit-Based Legal Internships in India`)
- `/directory` — target "law firm directory India" / "top Indian law firms"
- `/playbook` — target "law student career guide" / "legal internship guide"
- `/opportunities` — target "legal internships India 2026"
- `/the-bar` — target "Indian law practice questions" / "bar prep India"
- `/tools/cv-analyser` — target "law student CV review"
- Firm profile pages — title pattern: `{Firm Name} — Internships, Salary, PPO Insights`
- Playbook guide pages — title pattern: `{Guide Title} — Locus Playbook`

### Phase 4 — Richer structured data (JSON-LD)

Add to `index.html` (sitewide) alongside the existing Organization block:
- **WebSite** schema with `potentialAction` SearchAction → enables Google sitelinks search box
- Update **Organization** to include `logo`, `sameAs` (LinkedIn, Twitter, Instagram if any)

Add per-page schemas via a new `usePageMeta` extension (or new `useStructuredData` hook):
- Playbook guides → **Article** schema (headline, datePublished, author, image)
- Firm profiles → **Organization** schema (the firm itself) + **BreadcrumbList**
- Directory → **CollectionPage** + **BreadcrumbList**
- The Bar → **Quiz** / **LearningResource** schema

### Phase 5 — Internal linking + content cleanup

- Footer: ensure links to `/directory`, `/playbook`, `/the-bar`, `/opportunities`, `/tools` are present (boosts crawl + page-rank flow)
- Each playbook guide should link to 2-3 related guides
- Each firm profile should link back to `/directory` and to `/opportunities` filtered by that firm
- Verify every page has exactly one `<h1>` (the SEO scanner already passed this — keep it that way)

### Phase 6 — Google Search Console + indexing

- Use the Site Verification API to verify `https://locus.legal/` via meta tag
- Add the site as a Search Console property
- Submit `https://locus.legal/sitemap.xml` for indexing
- Result: you can monitor impressions, clicks, indexing errors directly

### Phase 7 — Keyword research check (Semrush)

Before finalizing copy in Phase 3, run Semrush against `locus.legal` and key competitor terms (e.g. "legal internships India", "Indian law firms directory") to confirm the keywords we're targeting actually have search volume. Pivot copy if data shows better terms.

---

### Technical notes (for engineering review)

- Stack: Vite + React Router DOM SPA, deployed on Cloudflare Pages (build: `npm install --legacy-peer-deps && npm run build`, output `dist`).
- Prerenderer requires `puppeteer` as a devDep. Build time will increase by ~30-90s depending on route count.
- Sitemap script needs Supabase service-role key as a Cloudflare Pages env var (`SUPABASE_SERVICE_ROLE_KEY`).
- Production domain in `usePageMeta.ts` is `https://locus.legal` — that stays the canonical.
- `public/_headers` already sets caching; we'll add `Cache-Control: public, max-age=3600` on `/sitemap.xml` and prerendered `*.html`.
- The current static OG image is hosted on Cloudflare R2 — fine, but consider generating per-firm and per-guide OG images later (not in this plan).

### Estimated impact

- **Prerendering + sitemap**: Google indexes 100+ pages instead of ~7. Most impactful change.
- **WebSite + SearchAction schema**: Brand searches get a sitelinks search box.
- **Article + Organization schemas**: Rich snippets in SERPs (image, dates).
- **Keyword-targeted titles**: Better ranking for the queries you actually want.

Approve and I'll execute phases 1-6 end-to-end. Phase 7 (Semrush) I can run now if you want a keyword sanity-check before we lock copy.
