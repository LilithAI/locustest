import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Locus's firm-intelligence assistant. You answer questions about a single Indian law firm using ONLY the structured FIRM_CONTEXT JSON the user supplies.

HARD RULES:
- If the answer is not directly supported by FIRM_CONTEXT, reply exactly: "Not in our records yet."
- Never invent partners, practice areas, offices, rankings, salaries, or news.
- Be concise: 1-3 sentences, plain prose, no bullet points unless the user asked for a list.
- Use British English. No emojis. Do not preface answers with "Based on the data" or "According to FIRM_CONTEXT".
- If the user asks something outside the firm's scope (legal advice, comparisons to firms not provided), politely redirect: "I can only answer questions about <firm name> based on Locus's profile."`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { slug, question, anon_id } = await req.json().catch(() => ({}));
    if (typeof slug !== "string" || !slug.trim() || typeof question !== "string" || !question.trim()) {
      return new Response(JSON.stringify({ error: "slug and question required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (question.length > 500) {
      return new Response(JSON.stringify({ error: "question too long (max 500 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: profile, error: pErr } = await sb
      .from("firm_profiles")
      .select("firm_slug, firm_name, tagline, description, hq_city, total_lawyers, partner_count, founded_year, tier, headcount_band, partner_associate_ratio, growth_signal_90d, website_url, careers_url, careers_email, general_email")
      .eq("firm_slug", slug)
      .maybeSingle();
    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "firm not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [offices, areas, news, movements, rankings] = await Promise.all([
      sb.from("firm_offices").select("city, is_hq, headcount").eq("firm_slug", slug),
      sb.from("firm_practice_areas").select("area, is_signature, depth_score").eq("firm_slug", slug).order("depth_score", { ascending: false, nullsFirst: false }).limit(20),
      sb.from("firm_news_mentions").select("title, source, published_at, mention_type").eq("firm_slug", slug).order("published_at", { ascending: false }).limit(5),
      sb.from("firm_team_movements").select("member_name, movement_type, detected_at").eq("firm_slug", slug).gte("detected_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
      sb.from("firm_rankings").select("ranking_source, practice_area, band_or_tier, year").eq("firm_slug", slug),
    ]);

    // Hiring snapshot from vacancies (best effort)
    const { data: vacs } = await sb.from("vacancies").select("role, location, status").ilike("firm_name", profile.firm_name).eq("status", "live").limit(5);

    const firmContext = {
      firm_name: profile.firm_name,
      tagline: profile.tagline,
      description: profile.description?.slice(0, 600) ?? null,
      hq_city: profile.hq_city,
      total_lawyers: profile.total_lawyers,
      partner_count: profile.partner_count,
      partner_associate_ratio: profile.partner_associate_ratio,
      founded_year: profile.founded_year,
      tier: profile.tier,
      headcount_band: profile.headcount_band,
      growth_signal_90d: profile.growth_signal_90d,
      offices: (offices.data ?? []).map((o: { city: string; is_hq: boolean; headcount: number | null }) => ({ city: o.city, hq: o.is_hq, lawyers: o.headcount })),
      practice_areas: (areas.data ?? []).map((a: { area: string; is_signature: boolean }) => a.is_signature ? `${a.area} (signature)` : a.area),
      recent_news: (news.data ?? []),
      team_movements_last_90d: (movements.data ?? []),
      rankings: (rankings.data ?? []),
      live_vacancies: (vacs ?? []),
      contact: {
        website: profile.website_url,
        careers_url: profile.careers_url,
        careers_email: profile.careers_email,
        general_email: profile.general_email,
      },
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `FIRM_CONTEXT:\n${JSON.stringify(firmContext, null, 2)}\n\nQUESTION: ${question}` },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const answer: string = data.choices?.[0]?.message?.content?.trim() ?? "Not in our records yet.";

    // Best-effort log (don't block response)
    sb.from("firm_chat_logs").insert({
      firm_slug: slug,
      question: question.slice(0, 500),
      answer: answer.slice(0, 2000),
      anon_id: typeof anon_id === "string" ? anon_id.slice(0, 100) : null,
    }).then(() => undefined, (e) => console.warn("chat log insert failed", e));

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ask-about-firm error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
