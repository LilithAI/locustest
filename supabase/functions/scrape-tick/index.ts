// Cron tick: picks due vacancy sources by scrape_frequency and invokes the
// scrape-firm-careers function for each. Runs sequentially with a small cap
// per tick to stay under edge time / rate limits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREQ_HOURS: Record<string, number> = {
  daily: 24,
  weekly: 24 * 7,
  biweekly: 24 * 14,
  monthly: 24 * 30,
};

const MAX_PER_TICK = 8;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: sources, error } = await supa
    .from("firm_careers_sources")
    .select("id,name,scrape_frequency,last_scraped_at,pipeline_status,active")
    .eq("active", true)
    .neq("pipeline_status", "paused");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const due = (sources ?? []).filter((s) => {
    const hrs = FREQ_HOURS[s.scrape_frequency as string] ?? 168;
    if (!s.last_scraped_at) return true;
    const ageHrs = (now - new Date(s.last_scraped_at).getTime()) / 36e5;
    return ageHrs >= hrs;
  }).slice(0, MAX_PER_TICK);

  const results: Array<{ id: string; name: string; ok: boolean; error?: string }> = [];
  for (const s of due) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/scrape-firm-careers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_id: s.id }),
      });
      const j = await resp.json().catch(() => ({}));
      results.push({ id: s.id, name: s.name ?? "", ok: resp.ok && j.error == null, error: j.error });
    } catch (e) {
      results.push({ id: s.id, name: s.name ?? "", ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
