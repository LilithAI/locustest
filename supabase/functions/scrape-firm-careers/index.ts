// Vacancy Pipeline scraper — generalised across all source types.
// Scrapes one source via Firecrawl, runs LLM extraction + India-eligibility
// classification, upserts into vacancy_review_queue, manages lifecycle, and
// records a scrape_runs row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_DETAIL_FETCHES = 15;

// UN/intl HQ cities where postings are typically open to all member-state nationals (incl. India).
const INTL_HQ_CITIES = [
  "new york","geneva","vienna","nairobi","bangkok","bonn","the hague",
  "rome","paris","copenhagen","addis ababa","brussels","washington",
  "montreal","istanbul","jakarta",
];
// Common non-India country tokens that indicate a local-hire duty station.
const NON_INDIA_COUNTRIES = [
  "pakistan","bangladesh","sri lanka","nepal","bhutan","maldives","afghanistan",
  "kenya","ethiopia","uganda","tanzania","south sudan","sudan","somalia","nigeria",
  "ghana","rwanda","drc","congo","myanmar","thailand","vietnam","cambodia","laos",
  "philippines","indonesia","malaysia","singapore","japan","south korea","china",
  "uk","united kingdom","england","scotland","wales","ireland","france","germany",
  "spain","italy","netherlands","belgium","sweden","norway","denmark","finland",
  "switzerland","austria","poland","portugal","greece","turkey","ukraine","russia",
  "usa","united states","canada","mexico","brazil","argentina","chile","colombia",
  "peru","venezuela","australia","new zealand","uae","dubai","abu dhabi","qatar",
  "saudi arabia","oman","kuwait","bahrain","jordan","lebanon","israel","palestine",
  "iraq","iran","syria","yemen","egypt","morocco","tunisia","algeria","libya",
  "south africa",
];

const EXTRACTION_PROMPT = `You extract legal job vacancies from an employer's careers page (markdown).

RULES:
- Output ONLY via the extract_vacancies tool.
- Only extract concrete posted roles. Skip generic "send your CV anytime" / "we are always hiring" boilerplate.
- For each field, only fill if literally present in the source. If unclear or missing, return null. Do NOT guess.
- Return [] if there are no concrete openings.
- role_type values: lateral_hire, internship, retainership, graduate_trainee, fellowship, consultant, support_staff, other.
- application_mode values: external_url, email, onsite_form, ats_redirect, unclear.
- detail_url: if each role on this listing page links to its OWN detail page (e.g. "/opportunities/12345", "/jobs/abc-counsel"), return the absolute URL. If the markdown only shows a relative path, prepend the source's origin. If no per-role link exists, return null.
- description_full: a DETAILED description (800-2500 chars) summarising the role. Cover, when present in the source: what the role is about, key responsibilities, required qualifications / PQE / skills, eligibility nuances, location/remote setup, compensation/perks, application instructions, and any deadlines. Use short paragraphs and preserve bullet points (use "- " prefix). Do NOT invent facts. If the source is a thin listing row, return null for description_full and let the detail-page pass fill it in.
- description_excerpt: a tight ≤220 char one-line teaser for list cards.
`;

const DETAIL_PROMPT = `You are enriching ONE legal vacancy from its detail page (markdown).

Output ONLY via the enrich_vacancy tool.
- description_full: 800-2500 chars, faithful to the source. Preserve bullet points with "- ". Cover responsibilities, qualifications, eligibility, location, perks, application instructions, deadlines — only what's literally in the page.
- description_excerpt: ≤220 char one-line teaser.
- Fill pqe_min, pqe_max, application_mode, application_target, application_subject, source_deadline ONLY if literally present and not already known. Otherwise return null.
- Do NOT invent facts. If the page is empty/error/login-wall, return null for description_full.
`;

const ELIGIBILITY_PROMPT = `You decide if a legal vacancy is open to Indian law students/lawyers.

Rules (apply in order):

ELIGIBLE if any:
- Source country IN, OR vacancy location contains an Indian city or "India".
- Description mentions "India-qualified", "Indian bar", "BCI enrolled".
- Says "remote — India" / "work from India" / "open to India-based candidates".
- Source type is un_agency / intl_court / ifi AND the duty station is HQ/global (e.g. New York, Geneva, Vienna, Nairobi, Bangkok, Bonn, The Hague, Rome, Paris, Copenhagen, Addis Ababa, Brussels, Washington), OR the role is fully remote/global with no country-specific duty station.

INELIGIBLE if any:
- Requires non-Indian qualification not accepting Indian (e.g. "UK qualified solicitor", "must be admitted to NY bar", "Singapore Bar membership essential").
- Non-Indian location, no remote option, requires local work authorization (e.g. "London office, UK right to work required").
- Explicitly says "Indian nationals not eligible".
- Source type is un_agency / intl_court / ifi BUT the duty station is a specific non-India country (Pakistan, Bangladesh, Kenya, etc.). UN/intl country offices hire locally — they are NOT open to Indian applicants even though the agency is multilateral.

AMBIGUOUS if:
- International role with no clear nationality/qualification restriction stated and no specific duty station.
- Foreign location but fully remote with no location specified.
- Big Law overseas role that doesn't say UK/US qualification but typically requires it.
- Confidence below 0.7.

Always return a short reason. Output ONLY via the classify tool.`;

// Belt-and-braces post-filter: if the vacancy's location names a specific non-India country
// (and isn't an UN/intl HQ city), force ineligible. Catches classifier false-positives.
function forceLocalHireIneligible(
  location: string | null,
  isRemote: boolean | null,
  sourceType: string,
): { ineligible: boolean; reason?: string } {
  if (!location) return { ineligible: false };
  const loc = location.toLowerCase();
  if (loc.includes("india")) return { ineligible: false };
  if (isRemote) return { ineligible: false };
  if (INTL_HQ_CITIES.some((c) => loc.includes(c))) return { ineligible: false };
  // Only apply this guard for source types where we'd otherwise be permissive.
  const permissiveSources = ["un_agency", "intl_court", "ifi"];
  if (!permissiveSources.includes(sourceType)) return { ineligible: false };
  const matched = NON_INDIA_COUNTRIES.find((c) => loc.includes(c));
  if (matched) {
    return { ineligible: true, reason: `Local-hire duty station (${matched}); not open to Indian applicants.` };
  }
  return { ineligible: false };
}

interface ScrapeBody { source_id: string }

function validate(b: unknown): { ok: true; data: ScrapeBody } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "invalid body" };
  const id = (b as { source_id?: unknown }).source_id;
  if (typeof id !== "string" || !id) return { ok: false, error: "source_id required" };
  return { ok: true, data: { source_id: id } };
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

interface ExtractedVacancy {
  role_title: string;
  role_type: string | null;
  practice_area: string | null;
  location: string | null;
  is_remote: boolean | null;
  pqe_min: number | null;
  pqe_max: number | null;
  application_mode: string | null;
  application_target: string | null;
  application_subject: string | null;
  source_posted_date: string | null;
  source_deadline: string | null;
  description_excerpt: string | null;
  description_full: string | null;
  detail_url: string | null;
}

async function aiCall(body: unknown, lovableKey: string): Promise<any> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  return resp.json();
}

async function aiExtract(markdown: string, sourceName: string, lovableKey: string): Promise<ExtractedVacancy[]> {
  const truncated = markdown.length > 24000 ? markdown.slice(0, 24000) : markdown;
  const data = await aiCall({
    model: MODEL,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: `EMPLOYER: ${sourceName}\n\nCAREERS PAGE MARKDOWN:\n\n${truncated}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "extract_vacancies",
        description: "Return all concrete vacancies found on the page.",
        parameters: {
          type: "object",
          properties: {
            vacancies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role_title: { type: "string" },
                  role_type: { type: ["string", "null"] },
                  practice_area: { type: ["string", "null"] },
                  location: { type: ["string", "null"] },
                  is_remote: { type: ["boolean", "null"] },
                  pqe_min: { type: ["number", "null"] },
                  pqe_max: { type: ["number", "null"] },
                  application_mode: { type: ["string", "null"] },
                  application_target: { type: ["string", "null"] },
                  application_subject: { type: ["string", "null"] },
                  source_posted_date: { type: ["string", "null"] },
                  source_deadline: { type: ["string", "null"] },
                  description_excerpt: { type: ["string", "null"] },
                  description_full: { type: ["string", "null"] },
                  detail_url: { type: ["string", "null"] },
                },
                required: ["role_title"],
                additionalProperties: false,
              },
            },
          },
          required: ["vacancies"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "extract_vacancies" } },
  }, lovableKey);
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return [];
  try { return (JSON.parse(args).vacancies ?? []) as ExtractedVacancy[]; } catch { return []; }
}

interface EligibilityResult {
  eligibility: "eligible" | "ambiguous" | "ineligible";
  reason: string;
  confidence: number;
}

async function classifyEligibility(
  v: ExtractedVacancy,
  sourceCountry: string,
  sourceType: string,
  lovableKey: string,
): Promise<EligibilityResult> {
  const data = await aiCall({
    model: MODEL,
    messages: [
      { role: "system", content: ELIGIBILITY_PROMPT },
      { role: "user", content: `SOURCE COUNTRY: ${sourceCountry}\nSOURCE TYPE: ${sourceType}\nVACANCY:\n${JSON.stringify(v).slice(0, 4000)}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "classify",
        parameters: {
          type: "object",
          properties: {
            eligibility: { type: "string", enum: ["eligible", "ambiguous", "ineligible"] },
            reason: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["eligibility", "reason", "confidence"],
          additionalProperties: false,
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "classify" } },
  }, lovableKey);
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { eligibility: "ambiguous", reason: "classifier returned nothing", confidence: 0 };
  try {
    const p = JSON.parse(args);
    return {
      eligibility: p.eligibility,
      reason: String(p.reason ?? "").slice(0, 500),
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0)),
    };
  } catch {
    return { eligibility: "ambiguous", reason: "parse error", confidence: 0 };
  }
}

function dedupeHash(sourceId: string, role: string, location: string | null): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${sourceId}|${norm(role)}|${norm(location ?? "")}`;
}

function normRoleType(v: string | null): string | null {
  if (!v) return null;
  const allowed = ["lateral_hire","internship","retainership","graduate_trainee","fellowship","consultant","support_staff","other"];
  return allowed.includes(v) ? v : "other";
}
function normAppMode(v: string | null): string | null {
  if (!v) return null;
  const allowed = ["external_url","email","onsite_form","ats_redirect","unclear"];
  return allowed.includes(v) ? v : "unclear";
}
function safeDate(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth
    const authHeader = req.headers.get("Authorization");
    const isServiceCall = authHeader === `Bearer ${SERVICE_ROLE}`;
    let triggeredBy = "cron";
    if (!isServiceCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userRes?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: scopeOk } = await admin.rpc("has_admin_scope", {
        uid: userRes.user.id, scope: "opportunities_admin",
      });
      if (!scopeOk) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      triggeredBy = `admin:${userRes.user.id}`;
    }

    const v = validate(await req.json().catch(() => null));
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: source } = await admin
      .from("firm_careers_sources").select("*").eq("id", v.data.source_id).maybeSingle();
    if (!source) {
      return new Response(JSON.stringify({ error: "source not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!source.active || source.pipeline_status !== "active") {
      return new Response(JSON.stringify({ ok: true, skipped: "inactive" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceName = source.name ?? source.firm_name ?? "Unknown";

    // Begin run
    const { data: run } = await admin.from("scrape_runs").insert({
      source_id: source.id, status: "running", triggered_by: triggeredBy,
    }).select("id").single();
    const runId = run?.id;
    const logLines: string[] = [];

    let markdown = "";
    let extracted: ExtractedVacancy[] = [];
    try {
      logLines.push(`fetching ${source.url}`);
      markdown = await firecrawlScrape(source.url, FIRECRAWL_API_KEY);
      logLines.push(`got ${markdown.length} chars markdown`);
      extracted = await aiExtract(markdown, sourceName, LOVABLE_API_KEY);
      logLines.push(`extracted ${extracted.length} vacancies`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "scrape error";
      logLines.push(`ERROR ${msg}`);
      await admin.from("firm_careers_sources").update({
        last_scraped_at: new Date().toISOString(),
        last_status: "error",
        last_error: msg.slice(0, 500),
        scrape_count: (source.scrape_count ?? 0) + 1,
      }).eq("id", source.id);
      if (runId) {
        await admin.from("scrape_runs").update({
          status: "failed", completed_at: new Date().toISOString(),
          duration_ms: Date.now() - t0, error_message: msg.slice(0, 500),
          raw_log: logLines.join("\n"),
        }).eq("id", runId);
      }
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process each extracted vacancy
    const seenHashes = new Set<string>();
    let inserted = 0, updated = 0, duplicates = 0;
    const nowIso = new Date().toISOString();

    for (const x of extracted) {
      if (!x.role_title?.trim()) continue;
      const hash = dedupeHash(source.id, x.role_title, x.location);
      seenHashes.add(hash);

      const { data: existing } = await admin
        .from("vacancy_review_queue")
        .select("id, manual_eligibility_override, status")
        .eq("dedupe_hash", hash)
        .maybeSingle();

      const baseFields = {
        source_id: source.id,
        role_title: x.role_title,
        role_type: normRoleType(x.role_type),
        practice_area: x.practice_area,
        location: x.location,
        is_remote: x.is_remote ?? false,
        pqe_min: x.pqe_min,
        pqe_max: x.pqe_max,
        application_mode: normAppMode(x.application_mode),
        application_target: x.application_target,
        application_subject: x.application_subject,
        source_posted_date: safeDate(x.source_posted_date),
        source_deadline: safeDate(x.source_deadline),
        description_excerpt: x.description_excerpt?.slice(0, 240) ?? null,
        last_seen_at: nowIso,
        consecutive_misses: 0,
        lifecycle_status: "active" as const,
      };

      if (existing) {
        // Re-run classifier only if no manual override
        let eligPatch: Record<string, unknown> = {};
        if (!existing.manual_eligibility_override) {
          try {
            const elig = await classifyEligibility(x, source.country, source.source_type, LOVABLE_API_KEY);
            eligPatch = {
              eligibility_india: elig.eligibility,
              eligibility_reason: elig.reason,
              eligibility_confidence: elig.confidence,
            };
          } catch (e) {
            logLines.push(`classifier err on update: ${e instanceof Error ? e.message : ""}`);
          }
        }
        await admin.from("vacancy_review_queue").update({ ...baseFields, ...eligPatch }).eq("id", existing.id);
        duplicates++; updated++;
        continue;
      }

      // New vacancy — classify
      let eligibility: EligibilityResult = { eligibility: "ambiguous", reason: "not classified", confidence: 0 };
      try {
        eligibility = await classifyEligibility(x, source.country, source.source_type, LOVABLE_API_KEY);
      } catch (e) {
        logLines.push(`classifier err on new: ${e instanceof Error ? e.message : ""}`);
      }

      const { error: insErr } = await admin.from("vacancy_review_queue").insert({
        source: "firm_careers",
        source_url: source.url,
        source_firm: sourceName,
        source_title: x.role_title,
        raw_text: markdown.slice(0, 20000),
        ai_extracted: x as unknown as Record<string, unknown>,
        status: "pending",
        dedupe_hash: hash,
        first_seen_at: nowIso,
        eligibility_india: eligibility.eligibility,
        eligibility_reason: eligibility.reason,
        eligibility_confidence: eligibility.confidence,
        ...baseFields,
      });
      if (!insErr) inserted++;
      else logLines.push(`insert err: ${insErr.message}`);
    }

    // Lifecycle: increment misses for vacancies in queue from this source not seen this run
    const { data: existingForSource } = await admin
      .from("vacancy_review_queue")
      .select("id, dedupe_hash, consecutive_misses")
      .eq("source_id", source.id)
      .neq("lifecycle_status", "expired");
    let markedStale = 0;
    for (const row of existingForSource ?? []) {
      if (seenHashes.has(row.dedupe_hash)) continue;
      const misses = (row.consecutive_misses ?? 0) + 1;
      const lifecycle = misses >= 4 ? "expired" : misses >= 2 ? "stale" : "active";
      await admin.from("vacancy_review_queue")
        .update({ consecutive_misses: misses, lifecycle_status: lifecycle })
        .eq("id", row.id);
      if (lifecycle === "stale" || lifecycle === "expired") markedStale++;
    }

    await admin.from("firm_careers_sources").update({
      last_scraped_at: nowIso,
      last_success_at: nowIso,
      last_status: "success",
      last_error: null,
      scrape_count: (source.scrape_count ?? 0) + 1,
    }).eq("id", source.id);

    if (runId) {
      await admin.from("scrape_runs").update({
        status: "success",
        completed_at: nowIso,
        duration_ms: Date.now() - t0,
        vacancies_found: extracted.length,
        vacancies_new: inserted,
        vacancies_marked_stale: markedStale,
        raw_log: logLines.join("\n").slice(0, 20000),
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({
      ok: true, source: sourceName, found: extracted.length,
      inserted, updated, duplicates, markedStale,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("scrape fatal:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
