/**
 * Build-time sitemap generator.
 * Runs before `vite build`. Writes public/sitemap.xml with:
 *   - All public static routes
 *   - All published playbook guides (read from src/content/playbook/index.ts)
 *   - All firms with slugs (fetched from Supabase via the public anon key)
 *
 * If Supabase is unreachable at build time we still emit the static + guide
 * routes so the site never ships without a sitemap.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://locus.legal";

interface Entry {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const staticRoutes: Entry[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/waitlist", changefreq: "weekly", priority: "0.9" },
  { loc: "/directory", changefreq: "weekly", priority: "0.9" },
  { loc: "/opportunities", changefreq: "daily", priority: "0.9" },
  { loc: "/playbook", changefreq: "weekly", priority: "0.8" },
  { loc: "/the-bar", changefreq: "weekly", priority: "0.8" },
  { loc: "/the-bar/preview", changefreq: "monthly", priority: "0.6" },
  { loc: "/the-bar/browse", changefreq: "weekly", priority: "0.6" },
  { loc: "/the-bar/leaderboard", changefreq: "daily", priority: "0.5" },
  { loc: "/resources", changefreq: "monthly", priority: "0.7" },
  { loc: "/tools", changefreq: "monthly", priority: "0.7" },
  { loc: "/tools/cv-analyser", changefreq: "monthly", priority: "0.8" },
];

function readPlaybookSlugs(): string[] {
  const path = resolve(process.cwd(), "src/content/playbook/index.ts");
  const src = readFileSync(path, "utf8");
  // Pull every published guide: { slug: "...", ... } where comingSoon is not true.
  // Simple text scan — registry uses a flat array of objects.
  const blocks = src.split(/\{\s*slug:/).slice(1);
  const slugs: string[] = [];
  for (const block of blocks) {
    const slugMatch = block.match(/^\s*"([^"]+)"/);
    if (!slugMatch) continue;
    if (/comingSoon:\s*true/.test(block.split(/},/)[0] ?? "")) continue;
    slugs.push(slugMatch[1]);
  }
  return slugs;
}

async function fetchFirmSlugs(): Promise<{ slug: string; updated_at?: string }[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[sitemap] Supabase env vars missing — skipping firm rows");
    return [];
  }
  const all: { slug: string; updated_at?: string }[] = [];
  const pageSize = 1000;
  let from = 0;
  // Cap at 5000 to keep build snappy.
  while (from < 5000) {
    const res = await fetch(
      `${url}/rest/v1/firm_profiles?select=slug,updated_at&slug=not.is.null&order=updated_at.desc.nullslast&limit=${pageSize}&offset=${from}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) {
      console.warn(`[sitemap] firm_profiles fetch ${res.status} — skipping firms`);
      return all;
    }
    const rows = (await res.json()) as { slug: string; updated_at: string | null }[];
    if (!rows.length) break;
    all.push(...rows.map((r) => ({ slug: r.slug, updated_at: r.updated_at ?? undefined })));
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function toXml(entries: Entry[]): string {
  const urls = entries
    .map((e) => {
      const lines = [
        `  <url>`,
        `    <loc>${BASE_URL}${e.loc}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

async function main() {
  const entries: Entry[] = staticRoutes.map((r) => ({ ...r, lastmod: today }));

  const guideSlugs = readPlaybookSlugs();
  for (const slug of guideSlugs) {
    entries.push({
      loc: `/playbook/${slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  const firms = await fetchFirmSlugs();
  for (const f of firms) {
    entries.push({
      loc: `/directory/firms/${f.slug}`,
      lastmod: f.updated_at ? f.updated_at.slice(0, 10) : today,
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  const xml = toXml(entries);
  writeFileSync(resolve(process.cwd(), "public/sitemap.xml"), xml, "utf8");
  console.log(
    `[sitemap] wrote public/sitemap.xml — ${entries.length} URLs ` +
      `(${staticRoutes.length} static, ${guideSlugs.length} guides, ${firms.length} firms)`,
  );
}

main().catch((err) => {
  console.error("[sitemap] failed:", err);
  process.exit(1);
});
