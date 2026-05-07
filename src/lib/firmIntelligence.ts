// Firm Intelligence client helpers.
// Bridges the 3,600-row firms.json browse list with the ~95 enriched firm_profiles
// rows by normalizing firm names to a comparable key.

import { supabase } from "@/integrations/supabase/client";

export type IntelligenceChips = {
  verified: boolean;
  hiring_now: boolean;
  growing: boolean;
  big_law: boolean;
  boutique: boolean;
  top_tier: boolean;
  recently_active: boolean;
};

export type FirmIntelligenceSummary = {
  firm_slug: string;
  firm_name: string;
  tagline: string | null;
  hq_city: string | null;
  total_lawyers: number | null;
  partner_count: number | null;
  tier: string;
  headcount_band: string | null;
  intelligence_completeness_score: number;
  growth_signal_90d: string;
  chips: IntelligenceChips;
};

export type FirmIntelligenceFull = FirmIntelligenceSummary & {
  website_url: string | null;
  description: string | null;
  founded_year: number | null;
  general_email: string | null;
  careers_email: string | null;
  press_email: string | null;
  phone_main: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  careers_url: string | null;
  team_page_url: string | null;
  partner_associate_ratio: number | null;
  hiring_velocity: number | null;
  team_last_updated_at: string | null;
  practice_areas_last_updated_at: string | null;
  news_last_updated_at: string | null;
  offices_last_updated_at: string | null;
  last_scraped_at: string | null;
  locus_take: string | null;
  offices: Array<{
    id: string;
    city: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    headcount: number | null;
    is_hq: boolean;
  }>;
  practice_areas: Array<{
    area: string;
    partner_count: number | null;
    depth_score: number | null;
    is_signature: boolean;
  }>;
  team_members: Array<{
    name: string;
    title: string | null;
    profile_url: string | null;
    image_url: string | null;
    practice_area: string | null;
    seniority: string;
    status: string;
  }>;
  news: Array<{
    title: string;
    url: string;
    source: string;
    published_at: string;
    mention_type: string;
    excerpt: string | null;
  }>;
  movements: Array<{
    member_name: string;
    movement_type: string;
    detected_at: string;
  }>;
  rankings: Array<{
    ranking_source: string;
    practice_area: string | null;
    band_or_tier: string;
    year: number;
  }>;
  similar: Array<{
    firm_slug: string;
    firm_name: string;
    similarity_score: number;
  }>;
};

const VERIFIED_THRESHOLD = 0.6;

/** Normalize a firm name to a comparable key. */
export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&,.'"`’()]+/g, " ")
    .replace(/\b(llp|llc|inc|ltd|co|company|the|and|associates|advocates|solicitors|partners|law|legal|firm|chambers|attorneys|offices)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function chipsFor(row: {
  intelligence_completeness_score: number | null;
  headcount_band: string | null;
  growth_signal_90d: string | null;
  tier: string | null;
  hiring_now: boolean;
  recently_active: boolean;
}): IntelligenceChips {
  const c = Number(row.intelligence_completeness_score ?? 0);
  return {
    verified: c >= VERIFIED_THRESHOLD,
    hiring_now: !!row.hiring_now,
    growing: row.growth_signal_90d === "growing",
    big_law: row.headcount_band === "big_law" || row.headcount_band === "large",
    boutique: row.headcount_band === "micro" || row.headcount_band === "boutique_size",
    top_tier: row.tier === "tier_1",
    recently_active: !!row.recently_active,
  };
}

let _indexPromise: Promise<Map<string, FirmIntelligenceSummary>> | null = null;

/** Loads the intelligence index (~95 rows) and indexes by normalized name. */
export function loadIntelligenceIndex(): Promise<Map<string, FirmIntelligenceSummary>> {
  if (_indexPromise) return _indexPromise;
  _indexPromise = (async () => {
    const { data: profiles, error } = await supabase
      .from("firm_profiles")
      .select(
        "firm_slug, firm_name, tagline, hq_city, total_lawyers, partner_count, tier, headcount_band, intelligence_completeness_score, growth_signal_90d"
      );
    if (error || !profiles) return new Map();

    // Recently-active = >2 news mentions in last 30 days
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const { data: newsCounts } = await supabase
      .from("firm_news_mentions")
      .select("firm_slug")
      .gte("published_at", since30.toISOString());
    const recentMap = new Map<string, number>();
    (newsCounts ?? []).forEach((n: { firm_slug: string }) => {
      recentMap.set(n.firm_slug, (recentMap.get(n.firm_slug) ?? 0) + 1);
    });

    // Hiring-now = at least one live vacancy
    const { data: vacs } = await supabase
      .from("vacancies")
      .select("firm_name")
      .eq("status", "live");
    const hiringSet = new Set<string>();
    (vacs ?? []).forEach((v: { firm_name: string | null }) => {
      if (v.firm_name) hiringSet.add(normName(v.firm_name));
    });

    const map = new Map<string, FirmIntelligenceSummary>();
    for (const p of profiles) {
      const key = normName(p.firm_name);
      const summary: FirmIntelligenceSummary = {
        firm_slug: p.firm_slug,
        firm_name: p.firm_name,
        tagline: p.tagline,
        hq_city: p.hq_city,
        total_lawyers: p.total_lawyers,
        partner_count: p.partner_count,
        tier: p.tier ?? "untiered",
        headcount_band: p.headcount_band,
        intelligence_completeness_score: Number(p.intelligence_completeness_score ?? 0),
        growth_signal_90d: p.growth_signal_90d ?? "unknown",
        chips: chipsFor({
          intelligence_completeness_score: p.intelligence_completeness_score,
          headcount_band: p.headcount_band,
          growth_signal_90d: p.growth_signal_90d,
          tier: p.tier,
          hiring_now: hiringSet.has(key),
          recently_active: (recentMap.get(p.firm_slug) ?? 0) > 2,
        }),
      };
      map.set(key, summary);
      // Also index by slug for lookup by URL.
      map.set(p.firm_slug, summary);
    }
    return map;
  })();
  return _indexPromise;
}

export function getIntelligenceForName(
  index: Map<string, FirmIntelligenceSummary>,
  name: string
): FirmIntelligenceSummary | null {
  return index.get(normName(name)) ?? null;
}

/** Loads full firm intelligence by slug for the profile page. */
export async function getFirmIntelligenceBySlug(
  slug: string
): Promise<FirmIntelligenceFull | null> {
  const { data: p, error } = await supabase
    .from("firm_profiles")
    .select("*")
    .eq("firm_slug", slug)
    .maybeSingle();
  if (error || !p) return null;

  const [offices, practiceAreas, team, news, movements, rankings, similar] = await Promise.all([
    supabase.from("firm_offices").select("*").eq("firm_slug", slug).order("is_hq", { ascending: false }),
    supabase
      .from("firm_practice_areas")
      .select("*")
      .eq("firm_slug", slug)
      .order("depth_score", { ascending: false, nullsFirst: false }),
    supabase
      .from("firm_team_members")
      .select("*")
      .eq("firm_slug", slug)
      .eq("status", "active")
      .order("seniority"),
    supabase
      .from("firm_news_mentions")
      .select("*")
      .eq("firm_slug", slug)
      .order("published_at", { ascending: false })
      .limit(20),
    supabase
      .from("firm_team_movements")
      .select("*")
      .eq("firm_slug", slug)
      .gte("detected_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order("detected_at", { ascending: false }),
    supabase.from("firm_rankings").select("*").eq("firm_slug", slug).order("year", { ascending: false }),
    supabase
      .from("firm_comparable_index")
      .select("comparable_slug, similarity_score")
      .eq("firm_slug", slug)
      .order("similarity_score", { ascending: false })
      .limit(5),
  ]);

  // Resolve similar firms' display names
  const similarSlugs = (similar.data ?? []).map((s: { comparable_slug: string }) => s.comparable_slug);
  let similarRows: Array<{ firm_slug: string; firm_name: string; similarity_score: number }> = [];
  if (similarSlugs.length) {
    const { data: srows } = await supabase
      .from("firm_profiles")
      .select("firm_slug, firm_name")
      .in("firm_slug", similarSlugs);
    similarRows = (similar.data ?? [])
      .map((s: { comparable_slug: string; similarity_score: number }) => {
        const r = (srows ?? []).find((x: { firm_slug: string }) => x.firm_slug === s.comparable_slug);
        return r
          ? { firm_slug: r.firm_slug, firm_name: r.firm_name, similarity_score: Number(s.similarity_score) }
          : null;
      })
      .filter(Boolean) as Array<{ firm_slug: string; firm_name: string; similarity_score: number }>;
  }

  // Hiring-now check for chips
  const { data: vacs } = await supabase
    .from("vacancies")
    .select("firm_name")
    .eq("status", "live");
  const hiring = (vacs ?? []).some(
    (v: { firm_name: string | null }) =>
      v.firm_name && normName(v.firm_name) === normName(p.firm_name)
  );

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const recentNewsCount = (news.data ?? []).filter(
    (n: { published_at: string }) => new Date(n.published_at) >= since30
  ).length;

  return {
    firm_slug: p.firm_slug,
    firm_name: p.firm_name,
    tagline: p.tagline,
    description: p.description,
    hq_city: p.hq_city,
    total_lawyers: p.total_lawyers,
    partner_count: p.partner_count,
    founded_year: p.founded_year,
    tier: p.tier ?? "untiered",
    headcount_band: p.headcount_band,
    intelligence_completeness_score: Number(p.intelligence_completeness_score ?? 0),
    growth_signal_90d: p.growth_signal_90d ?? "unknown",
    partner_associate_ratio: p.partner_associate_ratio,
    hiring_velocity: p.hiring_velocity,
    website_url: p.website_url,
    general_email: p.general_email,
    careers_email: p.careers_email,
    press_email: p.press_email,
    phone_main: p.phone_main,
    linkedin_url: p.linkedin_url,
    twitter_url: p.twitter_url,
    instagram_url: p.instagram_url,
    youtube_url: p.youtube_url,
    careers_url: p.careers_url,
    team_page_url: p.team_page_url,
    team_last_updated_at: p.team_last_updated_at,
    practice_areas_last_updated_at: p.practice_areas_last_updated_at,
    news_last_updated_at: p.news_last_updated_at,
    offices_last_updated_at: p.offices_last_updated_at,
    last_scraped_at: p.last_scraped_at,
    locus_take: p.locus_take,
    chips: chipsFor({
      intelligence_completeness_score: p.intelligence_completeness_score,
      headcount_band: p.headcount_band,
      growth_signal_90d: p.growth_signal_90d,
      tier: p.tier,
      hiring_now: hiring,
      recently_active: recentNewsCount > 2,
    }),
    offices: (offices.data ?? []) as FirmIntelligenceFull["offices"],
    practice_areas: (practiceAreas.data ?? []) as FirmIntelligenceFull["practice_areas"],
    team_members: (team.data ?? []) as FirmIntelligenceFull["team_members"],
    news: (news.data ?? []) as FirmIntelligenceFull["news"],
    movements: (movements.data ?? []) as FirmIntelligenceFull["movements"],
    rankings: (rankings.data ?? []) as FirmIntelligenceFull["rankings"],
    similar: similarRows,
  };
}

export const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
  boutique: "Boutique",
  untiered: "Untiered",
};

export const HEADCOUNT_LABELS: Record<string, string> = {
  micro: "Micro (<10 lawyers)",
  boutique_size: "Boutique (10-25)",
  mid: "Mid-size (25-100)",
  large: "Large (100-500)",
  big_law: "Big Law (500+)",
};
