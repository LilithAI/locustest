import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EXTRACTION_TOOL, buildPrompt } from "./extractor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const SUB_PAGE_PATTERN =
  /\/(people|team|attorneys|lawyer|partner|practice|service|expertise|sector|office|contact|about)\b/i;

interface FirecrawlMapResp {
  success: boolean;
  links?: Array<{ url: string } | string>;
}
interface FirecrawlScrapeResp {
  success: boolean;
  data?: { markdown?: string };
}
interface FirecrawlSearchResp {
  success: boolean;
  data?: {
    web?: Array<{ url: string; title: string; description?: string }>;
  };
}

async function firecrawl<T>(
  path: string,
  body: unknown,
  apiKey: string,
): Promise<T> {
  const r = await fetch(`${FIRECRAWL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Firecrawl ${path} ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

function pickSubPages(links: string[], origin: string): string[] {
  const sameHost = links.filter((u) => {
    try {
      const url = new URL(u);
      return url.host === new URL(origin).host;
    } catch {
      return false;
    }
  });
  const matches = sameHost.filter((u) => SUB_PAGE_PATTERN.test(u));
  // Dedupe by path category
  const seen = new Set<string>();
  const picks: string[] = [];
  for (const u of matches) {
    const m = u.match(SUB_PAGE_PATTERN);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(u);
    if (picks.length >= 4) break;
  }
  return picks;
}

function computeCompleteness(p: {
  tagline?: string | null;
  founded_year?: number | null;
  total_lawyers?: number | null;
  partner_count?: number | null;
  general_email?: string | null;
  phone_main?: string | null;
  hq_city?: string | null;
  offices_count: number;
  practice_areas_count: number;
  rankings_count: number;
  news_count: number;
}): number {
  let filled = 0;
  const checks = [
    p.tagline,
    p.founded_year,
    p.total_lawyers,
    p.partner_count,
    p.general_email,
    p.phone_main,
    p.hq_city,
    p.offices_count > 0,
    p.practice_areas_count >= 3,
    p.rankings_count > 0,
    p.news_count > 0,
  ];
  for (const c of checks) if (c) filled++;
  return Math.round((filled / checks.length) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY)
      return json({ error: "FIRECRAWL_API_KEY not configured" }, 500);
    if (!LOVABLE_API_KEY)
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRows } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug ?? "").trim();
    if (!slug) return json({ error: "slug required" }, 400);

    // 1. Load firm
    const { data: firm, error: firmErr } = await sb
      .from("firm_profiles")
      .select("firm_slug, firm_name, website_url")
      .eq("firm_slug", slug)
      .maybeSingle();
    if (firmErr || !firm)
      return json({ error: `firm not found: ${slug}` }, 404);
    if (!firm.website_url)
      return json({ error: "firm has no website_url" }, 400);

    const debug: Record<string, unknown> = { slug, steps: [] };
    const t0 = Date.now();

    // 2. Map website
    const mapResp = await firecrawl<FirecrawlMapResp>(
      "/map",
      { url: firm.website_url, limit: 200, includeSubdomains: false },
      FIRECRAWL_API_KEY,
    );
    const allLinks = (mapResp.links ?? [])
      .map((l) => (typeof l === "string" ? l : l.url))
      .filter(Boolean);
    const subPages = pickSubPages(allLinks, firm.website_url);
    (debug.steps as unknown[]).push({
      step: "map",
      total: allLinks.length,
      picked: subPages,
    });

    // 3. Scrape homepage + sub-pages
    const urlsToScrape = [firm.website_url, ...subPages];
    const scraped = await Promise.allSettled(
      urlsToScrape.map((u) =>
        firecrawl<FirecrawlScrapeResp>(
          "/scrape",
          { url: u, formats: ["markdown"], onlyMainContent: true },
          FIRECRAWL_API_KEY,
        ),
      ),
    );
    const markdowns = scraped
      .map((r, i) => {
        if (r.status !== "fulfilled") return "";
        const md = r.value?.data?.markdown ?? "";
        return md ? `\n\n--- PAGE: ${urlsToScrape[i]} ---\n${md}` : "";
      })
      .join("");
    (debug.steps as unknown[]).push({
      step: "scrape",
      pages: urlsToScrape.length,
      mdChars: markdowns.length,
    });

    // 4. News search
    const searchQuery = `"${firm.firm_name}" (site:barandbench.com OR site:livelaw.in OR site:economictimes.com)`;
    let newsResults: Array<{ title: string; url: string; description?: string }> =
      [];
    try {
      const searchResp = await firecrawl<FirecrawlSearchResp>(
        "/search",
        { query: searchQuery, limit: 10, tbs: "qdr:m" },
        FIRECRAWL_API_KEY,
      );
      newsResults = searchResp.data?.web ?? [];
    } catch (e) {
      console.warn("news search failed:", String(e));
    }
    (debug.steps as unknown[]).push({
      step: "search",
      results: newsResults.length,
    });

    // 5. Gemini extraction
    const prompt = buildPrompt({
      firmName: firm.firm_name,
      websiteUrl: firm.website_url,
      websiteMarkdown: markdowns,
      newsResults,
    });

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          tools: [EXTRACTION_TOOL],
          tool_choice: { type: "function", function: { name: "extract_firm_intelligence" } },
        }),
      },
    );
    const aiText = await aiResp.text();
    if (!aiResp.ok)
      return json(
        { error: "AI extraction failed", status: aiResp.status, body: aiText.slice(0, 500), debug },
        502,
      );

    let extracted: Record<string, unknown> = {};
    try {
      const aiJson = JSON.parse(aiText);
      const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
      const argsStr = toolCall?.function?.arguments;
      if (!argsStr) throw new Error("no tool_call in AI response");
      extracted = JSON.parse(argsStr);
    } catch (e) {
      return json(
        { error: "AI returned bad payload", reason: String(e), raw: aiText.slice(0, 500) },
        502,
      );
    }

    (debug.steps as unknown[]).push({
      step: "ai",
      tookMs: Date.now() - t0,
      keys: Object.keys(extracted),
    });

    // 6. Write to DB
    const e = extracted as {
      tagline?: string | null;
      founded_year?: number | null;
      total_lawyers?: number | null;
      partner_count?: number | null;
      general_email?: string | null;
      careers_email?: string | null;
      phone_main?: string | null;
      hq_city?: string | null;
      offices?: Array<{ city: string; address?: string | null; is_hq: boolean }>;
      practice_areas?: Array<{ name: string; partner_count?: number | null; is_signature: boolean }>;
      rankings?: Array<{ source: string; year: number; band_or_tier: string; practice_area?: string | null }>;
      news?: Array<{ title: string; url: string; source: string; published_at?: string | null; mention_type: string; excerpt?: string | null }>;
    };

    const offices = e.offices ?? [];
    const practiceAreas = e.practice_areas ?? [];
    const rankings = e.rankings ?? [];
    const news = e.news ?? [];

    // firm_profiles: NULL-safe overwrite — only set fields the AI actually returned
    const profilePatch: Record<string, unknown> = { last_scraped_at: new Date().toISOString() };
    const maybeSet = (k: string, v: unknown) => {
      if (v !== null && v !== undefined && v !== "") profilePatch[k] = v;
    };
    maybeSet("tagline", e.tagline);
    maybeSet("founded_year", e.founded_year);
    maybeSet("total_lawyers", e.total_lawyers);
    maybeSet("partner_count", e.partner_count);
    maybeSet("general_email", e.general_email);
    maybeSet("careers_email", e.careers_email);
    maybeSet("phone_main", e.phone_main);
    maybeSet("hq_city", e.hq_city);

    const completeness = computeCompleteness({
      tagline: e.tagline,
      founded_year: e.founded_year,
      total_lawyers: e.total_lawyers,
      partner_count: e.partner_count,
      general_email: e.general_email,
      phone_main: e.phone_main,
      hq_city: e.hq_city,
      offices_count: offices.length,
      practice_areas_count: practiceAreas.length,
      rankings_count: rankings.length,
      news_count: news.length,
    });
    profilePatch.intelligence_completeness_score = completeness;

    await sb.from("firm_profiles").update(profilePatch).eq("firm_slug", slug);

    // firm_offices: full replace
    if (offices.length > 0) {
      await sb.from("firm_offices").delete().eq("firm_slug", slug);
      await sb.from("firm_offices").insert(
        offices.map((o) => ({
          firm_slug: slug,
          city: o.city,
          address: o.address ?? null,
          is_hq: !!o.is_hq,
        })),
      );
    }

    // firm_practice_areas: full replace
    if (practiceAreas.length > 0) {
      await sb.from("firm_practice_areas").delete().eq("firm_slug", slug);
      await sb.from("firm_practice_areas").insert(
        practiceAreas.map((p) => ({
          firm_slug: slug,
          area: p.name,
          partner_count: p.partner_count ?? null,
          is_signature: !!p.is_signature,
        })),
      );
    }

    // firm_rankings: replace
    if (rankings.length > 0) {
      await sb.from("firm_rankings").delete().eq("firm_slug", slug);
      await sb.from("firm_rankings").insert(
        rankings.map((r) => ({
          firm_slug: slug,
          ranking_source: r.source,
          year: r.year,
          band_or_tier: r.band_or_tier,
          practice_area: r.practice_area ?? null,
        })),
      );
    }

    // firm_news_mentions: dedupe on url
    if (news.length > 0) {
      const existing = await sb
        .from("firm_news_mentions")
        .select("url")
        .eq("firm_slug", slug);
      const have = new Set((existing.data ?? []).map((r) => r.url));
      const fresh = news.filter((n) => n.url && !have.has(n.url));
      if (fresh.length > 0) {
        await sb.from("firm_news_mentions").insert(
          fresh.map((n) => ({
            firm_slug: slug,
            title: n.title,
            url: n.url,
            source: n.source,
            mention_type: n.mention_type,
            published_at: n.published_at ?? new Date().toISOString(),
            excerpt: n.excerpt ?? null,
          })),
        );
      }
    }

    return json({
      success: true,
      slug,
      completeness,
      counts: {
        offices: offices.length,
        practice_areas: practiceAreas.length,
        rankings: rankings.length,
        news: news.length,
      },
      debug,
    });
  } catch (e) {
    console.error("refresh-firm-intelligence error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
