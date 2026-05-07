// Apply admin-reviewed firm intelligence patch to firm_profiles + child tables.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SCALAR_FIELDS = [
  "tagline",
  "founded_year",
  "total_lawyers",
  "partner_count",
  "general_email",
  "careers_email",
  "phone_main",
  "hq_city",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const adminId = userData.user.id;
    const { data: roleRows } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId);
    if (!(roleRows ?? []).some((r) => r.role === "admin"))
      return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug ?? "").trim();
    if (!slug) return json({ error: "slug required" }, 400);

    const patch = (body.patch ?? {}) as Record<string, unknown>;
    const sections = (body.sections ?? {}) as Record<string, boolean>;
    const sourceType = String(body.source_type ?? "manual");
    const sourceExcerpt = String(body.source_excerpt ?? "").slice(0, 1000);

    const { data: firm } = await sb
      .from("firm_profiles")
      .select("firm_slug")
      .eq("firm_slug", slug)
      .maybeSingle();
    if (!firm) return json({ error: `firm not found: ${slug}` }, 404);

    const applied: Record<string, unknown> = {};

    // Scalar fields
    const profilePatch: Record<string, unknown> = {};
    for (const k of SCALAR_FIELDS) {
      if (k in patch) {
        const v = patch[k];
        profilePatch[k] = v === "" ? null : v;
        applied[k] = v;
      }
    }
    if (Object.keys(profilePatch).length > 0) {
      profilePatch.last_scraped_at = new Date().toISOString();
      const { error } = await sb.from("firm_profiles").update(profilePatch).eq("firm_slug", slug);
      if (error) return json({ error: `profile update failed: ${error.message}` }, 500);
    }

    // Offices
    if (sections.offices && Array.isArray(patch.offices)) {
      const rows = (patch.offices as Array<{ city: string; address?: string | null; is_hq?: boolean }>)
        .filter((o) => o.city)
        .map((o) => ({ firm_slug: slug, city: o.city, address: o.address ?? null, is_hq: !!o.is_hq }));
      await sb.from("firm_offices").delete().eq("firm_slug", slug);
      if (rows.length > 0) await sb.from("firm_offices").insert(rows);
      applied.offices_count = rows.length;
    }

    // Practice areas
    if (sections.practice_areas && Array.isArray(patch.practice_areas)) {
      const rows = (patch.practice_areas as Array<{ name: string; partner_count?: number | null; is_signature?: boolean }>)
        .filter((p) => p.name)
        .map((p) => ({
          firm_slug: slug,
          area: p.name,
          partner_count: p.partner_count ?? null,
          is_signature: !!p.is_signature,
        }));
      await sb.from("firm_practice_areas").delete().eq("firm_slug", slug);
      if (rows.length > 0) await sb.from("firm_practice_areas").insert(rows);
      applied.practice_areas_count = rows.length;
    }

    // Rankings
    if (sections.rankings && Array.isArray(patch.rankings)) {
      const rows = (patch.rankings as Array<{ source: string; year: number; band_or_tier: string; practice_area?: string | null }>)
        .filter((r) => r.source && r.year && r.band_or_tier)
        .map((r) => ({
          firm_slug: slug,
          ranking_source: r.source,
          year: r.year,
          band_or_tier: r.band_or_tier,
          practice_area: r.practice_area ?? null,
        }));
      await sb.from("firm_rankings").delete().eq("firm_slug", slug);
      if (rows.length > 0) await sb.from("firm_rankings").insert(rows);
      applied.rankings_count = rows.length;
    }

    // News (append, dedupe by url)
    if (sections.news && Array.isArray(patch.news)) {
      const items = patch.news as Array<{ title: string; url: string; source: string; mention_type: string; published_at?: string | null; excerpt?: string | null }>;
      if (items.length > 0) {
        const existing = await sb.from("firm_news_mentions").select("url").eq("firm_slug", slug);
        const have = new Set((existing.data ?? []).map((r) => r.url));
        const fresh = items.filter((n) => n.url && !have.has(n.url));
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
        applied.news_added = fresh.length;
      }
    }

    // Audit log
    await sb.from("firm_edit_log").insert({
      firm_slug: slug,
      admin_user_id: adminId,
      source_type: sourceType,
      source_excerpt: sourceExcerpt,
      applied_fields: applied,
    });

    return json({ success: true, slug, applied });
  } catch (e) {
    console.error("apply-firm-intelligence error:", e);
    return json({ error: String(e) }, 500);
  }
});
