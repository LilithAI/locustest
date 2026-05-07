// Scrapes a single firm careers page via Firecrawl, runs AI extraction,
// optionally drills into each opening's detail page for richer data,
// and inserts results into vacancy_review_queue (status=pending).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const MAX_DETAIL_SCRAPES = 8;

const LISTING_PROMPT = `You extract a list of CONCRETE, CURRENT legal opportunity openings from a law firm's careers page (markdown).

RULES:
- Output ONLY via the extract_listings tool.
- Skip generic "send your CV anytime" / "we're always hiring" boilerplate.
- For each opening, return role title and (if a dedicated detail page exists) the link to that detail/apply page.
- detail_url should be the link a candidate clicks to read more about THAT specific role (not the generic careers page URL).
- If no concrete openings, return an empty array.
- opportunity_type: "internship" (interns/trainees/clerks/students) or "job" (associates/lawyers/PQE).
`;

const DETAIL_PROMPT = `You extract one legal opportunity's full details from a job detail page (markdown).

RULES:
- Output ONLY via the extract_detail tool.
- Pull every field that appears on the page, even if phrased loosely.
- description: 2-4 sentence summary of the role and key responsibilities (synthesize from bullets if needed).
- eligibility: degree, year of study, PQE, bar admission requirements (combine multiple lines into a clean paragraph).
- responsibilities: bullet-style summary of day-to-day work.
- practice_area: e.g. "Corporate / M&A", "Disputes", "IP", "Tax", "Banking & Finance".
- task_brief: any written task / case study / assessment they ask applicants to submit, if mentioned.
- stipend / salary if stated. Deadline as written.
- application_mode: "email" if an email address is given, else "external_url".
- country: infer from location if obvious (e.g. "Mumbai" → "India").
- Set fields to null if NOT present. Do NOT guess.
`;

interface ListingStub {
  role: string;
  opportunity_type: "internship" | "job" | null;
  detail_url: string | null;
}

interface ExtractedListing {
  role: string;
  opportunity_type: "internship" | "job" | null;
  application_mode: "email" | "external_url" | null;
  application_email: string | null;
  apply_url: string | null;
  location: string | null;
  country: string | null;
  deadline: string | null;
  eligibility: string | null;
  qualifications: string | null;
  experience_years: string | null;
  responsibilities: string | null;
  practice_area: string | null;
  task_brief: string | null;
  start_date: string | null;
  stipend: string | null;
  description: string | null;
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  const resp = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Firecrawl ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  const md = (data.markdown as string | undefined) ?? (data.data?.markdown as string | undefined) ?? "";
  if (!md.trim()) throw new Error("Firecrawl returned empty markdown");
  return md;
}

async function aiCall(
  systemPrompt: string,
  userContent: string,
  toolName: string,
  toolSchema: Record<string, unknown>,
  model: string,
  lovableKey: string,
): Promise<unknown> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [{ type: "function", function: { name: toolName, description: "Extract", parameters: toolSchema } }],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });
  if (!resp.ok) throw new Error(`AI gateway ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try { return JSON.parse(args); } catch { return null; }
}

const stubProps = {
  role: { type: "string" },
  opportunity_type: { type: ["string", "null"], enum: ["internship", "job", null] },
  detail_url: { type: ["string", "null"] },
};

const detailProps = {
  role: { type: "string" },
  opportunity_type: { type: ["string", "null"], enum: ["internship", "job", null] },
  application_mode: { type: ["string", "null"], enum: ["email", "external_url", null] },
  application_email: { type: ["string", "null"] },
  apply_url: { type: ["string", "null"] },
  location: { type: ["string", "null"] },
  country: { type: ["string", "null"] },
  deadline: { type: ["string", "null"] },
  eligibility: { type: ["string", "null"] },
  qualifications: { type: ["string", "null"] },
  experience_years: { type: ["string", "null"] },
  responsibilities: { type: ["string", "null"] },
  practice_area: { type: ["string", "null"] },
  task_brief: { type: ["string", "null"] },
  start_date: { type: ["string", "null"] },
  stipend: { type: ["string", "null"] },
  description: { type: ["string", "null"] },
};

async function extractListingStubs(markdown: string, firmName: string, key: string): Promise<ListingStub[]> {
  const truncated = markdown.length > 15000 ? markdown.slice(0, 15000) : markdown;
  const result = await aiCall(
    LISTING_PROMPT,
    `FIRM: ${firmName}\n\nCAREERS PAGE MARKDOWN:\n\n${truncated}`,
    "extract_listings",
    {
      type: "object",
      properties: {
        listings: {
          type: "array",
          items: { type: "object", properties: stubProps, required: ["role"], additionalProperties: false },
        },
      },
      required: ["listings"],
      additionalProperties: false,
    },
    "google/gemini-2.5-flash",
    key,
  );
  return ((result as { listings?: ListingStub[] } | null)?.listings ?? []).filter((l) => l.role?.trim());
}

async function extractDetail(
  markdown: string,
  firmName: string,
  stub: ListingStub,
  key: string,
): Promise<ExtractedListing | null> {
  const truncated = markdown.length > 25000 ? markdown.slice(0, 25000) : markdown;
  const result = await aiCall(
    DETAIL_PROMPT,
    `FIRM: ${firmName}\nKNOWN ROLE TITLE: ${stub.role}\n\nDETAIL PAGE MARKDOWN:\n\n${truncated}`,
    "extract_detail",
    {
      type: "object",
      properties: detailProps,
      required: ["role"],
      additionalProperties: false,
    },
    "google/gemini-2.5-pro",
    key,
  );
  if (!result) return null;
  const r = result as ExtractedListing;
  if (!r.opportunity_type && stub.opportunity_type) r.opportunity_type = stub.opportunity_type;
  return r;
}

// Fallback: extract full listings from the listing page itself when no detail link.
async function extractListingsRich(markdown: string, firmName: string, key: string): Promise<ExtractedListing[]> {
  const truncated = markdown.length > 20000 ? markdown.slice(0, 20000) : markdown;
  const result = await aiCall(
    DETAIL_PROMPT + "\n\nNOTE: This page may contain MULTIPLE openings. Return all of them.",
    `FIRM: ${firmName}\n\nCAREERS PAGE MARKDOWN:\n\n${truncated}`,
    "extract_listings",
    {
      type: "object",
      properties: {
        listings: {
          type: "array",
          items: { type: "object", properties: detailProps, required: ["role"], additionalProperties: false },
        },
      },
      required: ["listings"],
      additionalProperties: false,
    },
    "google/gemini-2.5-pro",
    key,
  );
  return ((result as { listings?: ExtractedListing[] } | null)?.listings ?? []).filter((l) => l.role?.trim());
}

function resolveUrl(maybeUrl: string | null, base: string): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

function dedupeHash(firmSlug: string, role: string, location: string | null): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${norm(firmSlug)}|${norm(role)}|${norm(location ?? "")}`;
}

interface ScrapeBody { source_id: string }

function validate(b: unknown): { ok: true; data: ScrapeBody } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "invalid body" };
  const id = (b as { source_id?: unknown }).source_id;
  if (typeof id !== "string" || !id) return { ok: false, error: "source_id required" };
  return { ok: true, data: { source_id: id } };
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

    let listingMarkdown = "";
    const finalListings: Array<{ listing: ExtractedListing; detailMd: string }> = [];

    try {
      listingMarkdown = await firecrawlScrape(source.url, FIRECRAWL_API_KEY);

      // Pass 1: discover openings + detail URLs.
      const stubs = await extractListingStubs(listingMarkdown, source.firm_name, LOVABLE_API_KEY);

      // Resolve detail URLs and dedupe.
      const resolved = stubs.map((s) => ({
        ...s,
        detail_url: resolveUrl(s.detail_url, source.url),
      }));
      const withDetail = resolved.filter(
        (s) => s.detail_url && s.detail_url !== source.url,
      );

      if (withDetail.length === 0) {
        // No detail pages — extract richly from the listing page itself.
        const rich = await extractListingsRich(listingMarkdown, source.firm_name, LOVABLE_API_KEY);
        for (const r of rich) finalListings.push({ listing: r, detailMd: listingMarkdown });
      } else {
        const capped = withDetail.slice(0, MAX_DETAIL_SCRAPES);
        for (const stub of capped) {
          try {
            const detailMd = await firecrawlScrape(stub.detail_url!, FIRECRAWL_API_KEY);
            const detail = await extractDetail(detailMd, source.firm_name, stub, LOVABLE_API_KEY);
            if (detail) {
              if (!detail.apply_url) detail.apply_url = stub.detail_url;
              finalListings.push({ listing: detail, detailMd });
            }
          } catch (e) {
            console.error("detail scrape failed", stub.detail_url, e);
          }
        }
        if (withDetail.length > MAX_DETAIL_SCRAPES) {
          console.log(`Skipped ${withDetail.length - MAX_DETAIL_SCRAPES} detail pages (cap=${MAX_DETAIL_SCRAPES})`);
        }
      }
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

    let inserted = 0;
    let duplicates = 0;
    for (const { listing, detailMd } of finalListings) {
      if (!listing.role?.trim()) continue;
      const hash = dedupeHash(source.firm_slug, listing.role, listing.location);

      const { data: existing } = await admin
        .from("vacancy_review_queue")
        .select("id")
        .eq("dedupe_hash", hash)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error: insErr } = await admin.from("vacancy_review_queue").insert({
        source: "firm_careers",
        source_url: listing.apply_url ?? source.url,
        source_firm: source.firm_name,
        source_title: listing.role,
        raw_text: detailMd.slice(0, 30000),
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
        listings_found: finalListings.length,
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
