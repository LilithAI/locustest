// Extract firm intelligence from pasted text or PDF (admin-only).
// Returns structured JSON for review — does NOT write to DB.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EXTRACTION_TOOL } from "./extractor.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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

function buildPrompt(firmName: string, text: string): string {
  return `You are extracting structured intelligence for the Indian law firm "${firmName}".

The source below is admin-supplied raw content (a brochure, ranking blurb, partner email, or pasted notes). Extract only facts supported by the source. Do NOT hallucinate. Use null / empty arrays for unknowns.

=== SOURCE ===
${text.slice(0, 80000)}

Now call the extract_firm_intelligence tool. Be strict:
- practice_areas: human-readable names only.
- Mark is_signature=true for the 5-7 most central practices.
- Only include rankings with explicit directory + year.
- Only include news items that have a real URL in the source. If the source has no URLs, return an empty news array.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth: admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: roleRows } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (!(roleRows ?? []).some((r) => r.role === "admin"))
      return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug ?? "").trim();
    const sourceType = String(body.source_type ?? "").trim();
    if (!slug) return json({ error: "slug required" }, 400);
    if (!["text", "pdf"].includes(sourceType))
      return json({ error: "source_type must be 'text' or 'pdf'" }, 400);

    // Load firm
    const { data: firm } = await sb
      .from("firm_profiles")
      .select("firm_slug, firm_name")
      .eq("firm_slug", slug)
      .maybeSingle();
    if (!firm) return json({ error: `firm not found: ${slug}` }, 404);

    // Get source text
    let sourceText = "";
    if (sourceType === "text") {
      sourceText = String(body.text ?? "").trim();
      if (!sourceText) return json({ error: "text required" }, 400);
      if (sourceText.length > 200_000)
        return json({ error: "text too large (max 200k chars)" }, 400);
    } else {
      const b64 = String(body.pdf_base64 ?? "").trim();
      if (!b64) return json({ error: "pdf_base64 required" }, 400);
      try {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        if (bytes.length > 15_000_000)
          return json({ error: "PDF too large (max 15MB)" }, 400);
        const pdf = await getDocumentProxy(bytes);
        const { text } = await extractText(pdf, { mergePages: true });
        sourceText = Array.isArray(text) ? text.join("\n") : String(text ?? "");
        if (!sourceText.trim())
          return json({ error: "PDF had no extractable text" }, 400);
      } catch (e) {
        return json({ error: `PDF parse failed: ${String(e).slice(0, 200)}` }, 400);
      }
    }

    // Call Lovable AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: buildPrompt(firm.firm_name, sourceText) }],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "function", function: { name: "extract_firm_intelligence" } },
      }),
    });
    const aiText = await aiResp.text();
    if (!aiResp.ok)
      return json({ error: "AI extraction failed", status: aiResp.status, body: aiText.slice(0, 500) }, 502);

    let extracted: Record<string, unknown> = {};
    try {
      const aiJson = JSON.parse(aiText);
      const argsStr = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!argsStr) throw new Error("no tool_call in response");
      extracted = JSON.parse(argsStr);
    } catch (e) {
      return json({ error: "AI returned bad payload", reason: String(e), raw: aiText.slice(0, 500) }, 502);
    }

    return json({
      success: true,
      slug,
      firm_name: firm.firm_name,
      extracted,
      source_excerpt: sourceText.slice(0, 500),
      source_chars: sourceText.length,
    });
  } catch (e) {
    console.error("extract-firm-intelligence error:", e);
    return json({ error: String(e) }, 500);
  }
});
