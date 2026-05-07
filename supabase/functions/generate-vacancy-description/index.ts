// Generates a long-form vacancy description from extracted fields + raw scraped markdown.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You write polished, well-structured legal opportunity descriptions for a public job board.

MANDATORY OUTPUT STRUCTURE — follow exactly:

1) Start the output with a "## Quick facts" section containing EXACTLY these 5 bullets in this order. Every bullet must always be present. If the source genuinely does not contain a value, write "Not specified" for that bullet — never invent.

## Quick facts
- **Firm:** <firm / organization name>
- **Role & location:** <role title> — <city / remote / hybrid>
- **Eligibility:** <year of study / degree / qualification required>
- **Stipend & duration:** <stipend amount or "Unpaid"> · <duration, e.g. 6 weeks>
- **Deadline & how to apply:** <deadline date> — <how to apply: email / form URL / portal>

2) Then write the long-form description (~800–1000 words; minimum 300 if source is sparse — never pad with filler or invented facts). Use these section headings, skipping any with no source info:
   ## Role overview
   ## Key responsibilities
   ## Eligibility & qualifications
   ## Experience required
   ## Practice area
   ## Location & work setup
   ## Stipend / compensation
   ## Application process
   ## Deadline
   ## Assessment / task brief

RULES:
- Synthesize ONLY from the provided structured fields and raw scraped markdown. Do not invent firm history, perks, or requirements.
- Use bullet points for lists of responsibilities or requirements.
- Do not include the firm name as a heading — that's in the card.
- Do not start with "About [Firm]" boilerplate.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: require opportunities_admin
    const authHeader = req.headers.get("Authorization");
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

    const body = await req.json().catch(() => null) as {
      ai_extracted?: Record<string, unknown>;
      raw_text?: string;
      firm_name?: string;
      role?: string;
    } | null;
    if (!body) {
      return new Response(JSON.stringify({ error: "invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = (body.ai_extracted ?? {}) as Record<string, unknown>;
    const raw = (body.raw_text ?? "").slice(0, 25000);
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = ext[k];
        if (v != null && String(v).trim() !== "") return String(v);
      }
      return "";
    };
    const essentials = {
      firm: body.firm_name || pick("firm_name", "firm", "organization", "company"),
      role: body.role || pick("role", "title", "position"),
      location: pick("location", "city", "work_location"),
      eligibility: pick("eligibility", "year", "year_of_study", "qualification", "degree"),
      stipend: pick("stipend", "compensation", "salary", "pay"),
      duration: pick("duration", "tenure", "length"),
      deadline: pick("deadline", "apply_by", "last_date", "application_deadline"),
      how_to_apply: pick("application_method", "how_to_apply", "apply_via", "application_url", "apply_url", "email", "application_email"),
    };
    const userContent =
      `ESSENTIAL FACTS (must appear in Quick facts block):\n${JSON.stringify(essentials, null, 2)}\n\n` +
      `FIRM: ${body.firm_name ?? "(unknown)"}\n` +
      `ROLE: ${body.role ?? "(unknown)"}\n\n` +
      `STRUCTURED FIELDS (JSON):\n${JSON.stringify(ext, null, 2)}\n\n` +
      `RAW SCRAPED PAGE (markdown, may include navigation noise):\n${raw}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Top up Lovable AI usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway ${resp.status}: ${t.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const description = data.choices?.[0]?.message?.content as string | undefined;
    if (!description) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ description }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-vacancy-description fatal:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
