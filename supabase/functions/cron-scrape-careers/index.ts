// Weekly cron orchestrator: iterates active firm_careers_sources and invokes
// scrape-firm-careers for each with bounded concurrency and pacing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONCURRENCY = 3;
const SPACING_MS = 2000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: only service-role caller (i.e. pg_cron via vault key)
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${SERVICE_ROLE}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: sources, error } = await admin
      .from("firm_careers_sources")
      .select("id, firm_name, url")
      .eq("active", true)
      .order("last_scraped_at", { ascending: true, nullsFirst: true });

    if (error || !sources) {
      return new Response(JSON.stringify({ error: error?.message ?? "no sources" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ firm: string; ok: boolean; detail: unknown }> = [];
    const scrapeUrl = `${SUPABASE_URL}/functions/v1/scrape-firm-careers`;

    // Simple bounded concurrency
    let cursor = 0;
    async function worker() {
      while (cursor < sources.length) {
        const i = cursor++;
        const src = sources[i];
        try {
          const resp = await fetch(scrapeUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ source_id: src.id }),
          });
          const json = await resp.json().catch(() => ({}));
          results.push({ firm: src.firm_name, ok: resp.ok, detail: json });
        } catch (e) {
          results.push({
            firm: src.firm_name,
            ok: false,
            detail: e instanceof Error ? e.message : "fetch failed",
          });
        }
        await sleep(SPACING_MS);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const inserted = results.reduce((sum, r) => {
      const d = r.detail as { inserted?: number };
      return sum + (typeof d?.inserted === "number" ? d.inserted : 0);
    }, 0);
    const failures = results.filter((r) => !r.ok || (r.detail as { ok?: boolean })?.ok === false).length;

    return new Response(
      JSON.stringify({
        ok: true,
        sources_processed: results.length,
        listings_inserted: inserted,
        failures,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cron-scrape-careers fatal:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
