// Generates a long-form vacancy description from extracted fields + raw scraped markdown.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You write polished, well-structured legal opportunity descriptions for a public job board.

REQUIREMENTS:
- Length: aim for ~800-1000 words. If the source has limited information, write as much as is honestly supportable (minimum 300) — do NOT pad with generic filler or invented facts.
- Synthesize ONLY from the provided structured fields and raw scraped markdown. Do not invent firm history, perks, or requirements that are not present.
- Use clean Markdown with these section headings (skip any section that has no source info):
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
- Write in clear professional prose. Use bullet points for lists of responsibilities or requirements.
- Do not include the firm name as a heading — that's already in the card.
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

    const ext = body.ai_extracted ?? {};
    const raw = (body.raw_text ?? "").slice(0, 25000);
    const userContent =
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
