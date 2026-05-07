// Scrapes a single firm careers page via Firecrawl, runs AI extraction,
// and inserts the result into vacancy_review_queue (status=pending).
// Designed to be invoked by the weekly cron orchestrator OR ad-hoc by an admin.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

const EXTRACTION_PROMPT = `You extract legal opportunity listings from a law firm's careers page (markdown form).

CRITICAL RULES:
- Output ONLY via the extract_listings tool.
- ONLY extract fields literally present in the source. If unclear or missing, return null. Do NOT guess.
- Return an array of listings. If the page has no current openings, return an empty array.
- Each listing must have role and (ideally) at least one of: location, deadline, apply_url, eligibility.
- Skip generic "send your CV anytime" / "we're always hiring" boilerplate — only return concrete openings.
- application_mode: "email" if an email is in the listing, "external_url" if an Apply link is shown, else "external_url" with apply_url=null.
- opportunity_type: "internship" (interns/trainees/clerks/students) or "job" (associates/lawyers/PQE).
`;

interface ScrapeBody {
  source_id: string;
}

function validate(b: unknown): { ok: true; data: ScrapeBody } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "invalid body" };
  const id = (b as { source_id?: unknown }).source_id;
  if (typeof id !== "string" || !id) return { ok: false, error: "source_id required" };
  return { ok: true, data: { source_id: id } };
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  const resp = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 1500,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Firecrawl ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  // SDK shape: data.markdown OR data.data.markdown
  const md =
    (data.markdown as string | undefined) ??
    (data.data?.markdown as string | undefined) ??
    "";
  if (!md.trim()) throw new Error("Firecrawl returned empty markdown");
  return md;
}

interface ExtractedListing {
  role: string;
  opportunity_type: "internship" | "job" | null;
  application_mode: "email" | "external_url" | null;
  application_email: string | null;
  apply_url: string | null;
  location: string | null;
  deadline: string | null;
  eligibility: string | null;
  stipend: string | null;
  description: string | null;
}

async function aiExtract(
  markdown: string,
  firmName: string,
  lovableKey: string,
): Promise<ExtractedListing[]> {
  const truncated = markdown.length > 12000 ? markdown.slice(0, 12000) : markdown;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `FIRM: ${firmName}\n\nCAREERS PAGE MARKDOWN:\n\n${truncated}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_listings",
            description: "Return all concrete openings found on the page.",
            parameters: {
              type: "object",
              properties: {
                listings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      role: { type: "string" },
                      opportunity_type: { type: ["string", "null"], enum: ["internship", "job", null] },
                      application_mode: { type: ["string", "null"], enum: ["email", "external_url", null] },
                      application_email: { type: ["string", "null"] },
                      apply_url: { type: ["string", "null"] },
                      location: { type: ["string", "null"] },
                      deadline: { type: ["string", "null"] },
                      eligibility: { type: ["string", "null"] },
                      stipend: { type: ["string", "null"] },
                      description: { type: ["string", "null"] },
                    },
                    required: ["role"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["listings"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_listings" } },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  try {
    const parsed = JSON.parse(args);
    return (parsed.listings ?? []) as ExtractedListing[];
  } catch {
    return [];
  }
}

function dedupeHash(firmSlug: string, role: string, location: string | null): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${norm(firmSlug)}|${norm(role)}|${norm(location ?? "")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: either service-role caller (cron) OR opportunities admin
    const authHeader = req.headers.get("Authorization");
    const isServiceCall = authHeader === `Bearer ${SERVICE_ROLE}`;
    if (!isServiceCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes, error: authErr } = await userClient.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authErr || !userRes?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: scopeOk } = await admin.rpc("has_admin_scope", {
        uid: userRes.user.id,
        scope: "opportunities_admin",
      });
      if (!scopeOk) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const v = validate(await req.json().catch(() => null));
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load source row
    const { data: source, error: srcErr } = await admin
      .from("firm_careers_sources")
      .select("*")
      .eq("id", v.data.source_id)
      .maybeSingle();
    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "source not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!source.active) {
      return new Response(JSON.stringify({ ok: true, skipped: "inactive" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let markdown = "";
    let listings: ExtractedListing[] = [];
    try {
      markdown = await firecrawlScrape(source.url, FIRECRAWL_API_KEY);
      listings = await aiExtract(markdown, source.firm_name, LOVABLE_API_KEY);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "scrape error";
      await admin
        .from("firm_careers_sources")
        .update({
          last_scraped_at: new Date().toISOString(),
          last_status: "error",
          last_error: msg.slice(0, 500),
          scrape_count: (source.scrape_count ?? 0) + 1,
        })
        .eq("id", source.id);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert each listing into the queue (idempotent on dedupe_hash via upsert-ignore)
    let inserted = 0;
    let duplicates = 0;
    for (const listing of listings) {
      if (!listing.role?.trim()) continue;
      const hash = dedupeHash(source.firm_slug, listing.role, listing.location);

      // Skip if already in queue (pending or otherwise) with same hash
      const { data: existing } = await admin
        .from("vacancy_review_queue")
        .select("id, status")
        .eq("dedupe_hash", hash)
        .maybeSingle();

      if (existing) {
        duplicates++;
        continue;
      }

      const { error: insErr } = await admin.from("vacancy_review_queue").insert({
        source: "firm_careers",
        source_url: source.url,
        source_firm: source.firm_name,
        source_title: listing.role,
        raw_text: markdown.slice(0, 20000),
        ai_extracted: listing as unknown as Record<string, unknown>,
        status: "pending",
        dedupe_hash: hash,
      });
      if (!insErr) inserted++;
      else console.error("insert error", insErr);
    }

    await admin
      .from("firm_careers_sources")
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: "success",
        last_error: null,
        scrape_count: (source.scrape_count ?? 0) + 1,
      })
      .eq("id", source.id);

    return new Response(
      JSON.stringify({
        ok: true,
        firm: source.firm_name,
        listings_found: listings.length,
        inserted,
        duplicates,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("scrape-firm-careers fatal:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
