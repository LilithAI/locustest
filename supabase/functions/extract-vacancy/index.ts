import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You extract structured legal vacancy details from messy raw text shared by a curator (often a screenshot OCR, a WhatsApp forward, or a LinkedIn post).

CRITICAL:
- Output ONLY via the provided extract_vacancy tool.
- firm_name and role are required. If unclear, infer the cleanest short version.
- opportunity_type is REQUIRED. Classify as one of:
    * "internship" — time-bound, often for law students. Signals: "intern", "internship", "clerkship", "summer position", "X-week assessment", "trainee", "law student", "currently in 3rd/4th/5th year", small/no stipend, short defined duration.
    * "job" — open-ended employment for qualified lawyers. Signals: "associate", "lawyer", "counsel", "lateral hire", "full-time", "PQE", "X years experience required", a CTC/salary instead of stipend, "qualified advocate".
  When signals genuinely conflict, prefer "internship" but lean "job" if the post explicitly demands prior years of experience or post-qualification.

APPLICATION MODE — decide in this priority order:
1. If text contains a valid email address → application_mode = "email", application_email = that email, application_url = null.
2. Else if text contains a URL matching any of these patterns → application_mode = "external_url", application_url = that URL, application_email = null:
   - Workday: *.myworkdayjobs.com, *.workday.com
   - SuccessFactors: *.successfactors.com, career*.sapsf.com
   - Greenhouse: boards.greenhouse.io, *.greenhouse.io/jobs
   - Lever: jobs.lever.co
   - LinkedIn job postings: linkedin.com/jobs/view/
   - Naukri: naukri.com/job-listings
   - Generic careers/portal hints: URL path contains /careers, /jobs, /apply, /job-application
   - Firm careers portals: careers.ey.com, careers.deloitte.com, kpmgindia.taleo.net, pwc.wd3.myworkdayjobs.com, talent.cyrilshroff.com, etc.
3. Else if no email AND no URL but the post mentions "apply via our portal", "submit through our careers page", "via company website", "apply on company website" → application_mode = "external_url", application_url = null (the curator will paste it).
4. Else → application_mode = "email", application_email = "" (admin will be prompted).

NEVER invent or guess an email or URL. Pick only what's literally in the text.

TIER (only when unambiguous, else null):
- "tier_1": CAM/AMSS, Cyril Amarchand Mangaldas, AZB, AZB & Partners, Trilegal, Khaitan & Co, L&L Partners, Luthra, JSA, J Sagar, SAM, Shardul Amarchand, ELP, Economic Laws Practice, S&R, Talwar Thakore, Argus, IndusLaw, Nishith Desai
- "big_4": EY, Ernst & Young, Deloitte, KPMG, PwC, PricewaterhouseCoopers, Grant Thornton, BDO
- "in_house": phrases like "in-house counsel", "legal team at [Company]", or any non-law-firm corporate (e.g. Flipkart Legal, Razorpay Legal, Swiggy)
- "psu": ONGC, BHEL, NTPC, SAIL, BPCL, IOCL, GAIL, Coal India, Indian Oil, etc.
- "boutique": small firms that explicitly self-describe as boutique
- Else null.

PRACTICE_AREA: infer one of these from role title + description, else null:
Corporate, M&A, Disputes/Litigation, IP, TMT, Banking & Finance, Tax, Competition, Real Estate, Employment, Policy/Regulatory, General

OTHER FIELDS:
- description: keep the freeform body the curator wrote (instructions, eligibility specifics, deadlines mentioned in prose). Strip emojis. Strip "DM me", "comment 'interested'", or any non-email/URL instructions. Max 800 chars.
- task_brief: if (and ONLY if) the post explicitly requires the applicant to complete a written task / assignment / research prompt / drafting exercise as part of applying (e.g. "submit a 500-word note on…", "draft a clause for…", "answer the following question and email it"), capture the FULL task wording verbatim here (max 2000 chars). Do NOT put generic "send your CV" or "attach transcript" instructions here. If no written task, return null.
- eligibility: a one-line summary like "3rd-5th year, NLU only" or "2-4 PQE, litigation background" — null if not specified.
- stipend: free-form (covers stipend OR salary/CTC), null if not stated.
- location: city only, null if remote/unspecified.
- source_credit: capture an attribution like "via @handle" or "shared by Jane" if present, else null.

Return JSON only via the tool.`;

interface ExtractInput { text: string }

function validate(b: unknown): { ok: true; data: ExtractInput } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "invalid body" };
  const t = (b as { text?: unknown }).text;
  if (typeof t !== "string" || !t.trim()) return { ok: false, error: "text required" };
  if (t.length > 8000) return { ok: false, error: "text too long (max 8000 chars)" };
  return { ok: true, data: { text: t } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userRes?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin gate
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: scopeOk } = await adminClient.rpc("has_admin_scope", {
      uid: userRes.user.id,
      scope: "opportunities_admin",
    });
    if (!scopeOk) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.json().catch(() => null);
    const v = validate(raw);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `RAW SOURCE TEXT:\n\n${v.data.text}\n\nExtract via the extract_vacancy tool.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_vacancy",
            description: "Return structured vacancy fields.",
            parameters: {
              type: "object",
              properties: {
                firm_name: { type: "string" },
                role: { type: "string" },
                opportunity_type: { type: "string", enum: ["internship", "job"] },
                application_mode: { type: "string", enum: ["email", "external_url"], description: "How applicants submit." },
                application_email: { type: ["string", "null"], description: "Email when mode=email; empty string if none found; null when mode=external_url." },
                application_url: { type: ["string", "null"], description: "Portal URL when mode=external_url; null otherwise; null even when mode=external_url if curator did not paste the link." },
                tier: {
                  type: ["string", "null"],
                  enum: ["tier_1","tier_2","tier_3","boutique","in_house","psu","big_4","other", null],
                  description: "Firm tier when unambiguous, else null.",
                },
                practice_area: { type: ["string", "null"], description: "One of Corporate, M&A, Disputes/Litigation, IP, TMT, Banking & Finance, Tax, Competition, Real Estate, Employment, Policy/Regulatory, General. Null if unclear." },
                location: { type: ["string", "null"] },
                eligibility: { type: ["string", "null"] },
                stipend: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                task_brief: { type: ["string", "null"] },
                source_credit: { type: ["string", "null"] },
              },
              required: ["firm_name", "role", "opportunity_type", "application_mode"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_vacancy" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned nothing." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(toolCall.function.arguments); }
    catch { return new Response(JSON.stringify({ error: "Malformed AI response." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    }); }

    const clean = (s: unknown, max: number) => {
      if (s === null || s === undefined) return null;
      const t = String(s).trim();
      return t ? t.slice(0, max) : null;
    };

    const rawType = typeof parsed.opportunity_type === "string" ? parsed.opportunity_type.toLowerCase().trim() : "";
    const opportunity_type: "internship" | "job" = rawType === "job" ? "job" : "internship";

    const rawMode = typeof parsed.application_mode === "string" ? parsed.application_mode.toLowerCase().trim() : "";
    const rawEmail = clean(parsed.application_email, 200) ?? "";
    const rawUrl = clean(parsed.application_url, 2000);
    // Mode resolution: trust explicit mode; else infer from presence
    let application_mode: "email" | "external_url" =
      rawMode === "external_url" ? "external_url" : rawMode === "email" ? "email" : "email";
    if (!rawMode) {
      if (rawUrl && !rawEmail) application_mode = "external_url";
      else application_mode = "email";
    }

    const TIERS = new Set(["tier_1","tier_2","tier_3","boutique","in_house","psu","big_4","other"]);
    const rawTier = typeof parsed.tier === "string" ? parsed.tier.toLowerCase().trim() : "";
    const tier = TIERS.has(rawTier) ? rawTier : null;

    return new Response(JSON.stringify({
      firm_name: clean(parsed.firm_name, 200) ?? "",
      role: clean(parsed.role, 200) ?? "",
      opportunity_type,
      application_mode,
      application_email: application_mode === "email" ? rawEmail : "",
      application_url: application_mode === "external_url" ? rawUrl : null,
      tier,
      practice_area: clean(parsed.practice_area, 80),
      location: clean(parsed.location, 100),
      eligibility: clean(parsed.eligibility, 200),
      stipend: clean(parsed.stipend, 100),
      description: clean(parsed.description, 800),
      task_brief: clean(parsed.task_brief, 2000),
      source_credit: clean(parsed.source_credit, 100),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract-vacancy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
