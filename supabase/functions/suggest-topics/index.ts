// suggest-topics
// Admin-only. Generates topic_prompt sources from AI either by surprise or by expanding a seed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";

const AREAS = [
  "constitutional", "criminal", "contract", "torts", "corporate", "ip", "labour", "tax", "evidence",
  "procedure", "family", "property", "administrative", "international", "jurisprudence", "environmental", "other",
] as const;
const DIFFS = ["easy", "medium", "hard"] as const;
const LICENSES = ["public_domain", "licensed", "fair_use_claim", "user_submitted", "other"] as const;

const BodySchema = z.object({
  mode: z.enum(["surprise", "expand"]),
  count: z.number().int().min(1).max(10).optional(),
  seed: z.string().trim().max(500).optional(),
  areas: z.array(z.enum(AREAS)).max(17).optional(),
  difficulty_hint: z.enum(DIFFS).optional(),
  license: z.enum(LICENSES).default("other"),
}).refine((b) => b.mode !== "expand" || (b.seed && b.seed.length >= 3), {
  message: "seed required for expand mode (min 3 chars)",
});

const TopicSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(500),
  topic_prompt: z.string().min(40).max(4000),
  suggested_area: z.enum(AREAS).optional(),
  suggested_difficulty: z.enum(DIFFS).optional(),
});

function buildSurprisePrompt(count: number, areas?: string[], diff?: string): string {
  const areaLine = areas?.length ? `Restrict to these areas: ${areas.join(", ")}.` : "Cover a diverse mix of areas.";
  const diffLine = diff ? `Target difficulty: ${diff}.` : "Mix difficulties (lean medium/hard).";
  return `Propose ${count} exam-worthy Indian-law topics suitable for drafting tough multiple-choice / issue-spotter / jurisdiction questions for senior law students.

${areaLine}
${diffLine}

For EACH topic, return:
- title: short headline (max 60 chars), e.g. "Section 69A blocking orders & natural justice"
- description: 1–2 sentence summary of why this is a meaty topic and what subskill it tests
- topic_prompt: a detailed paragraph (3–6 sentences) that an examiner would use as a brief — name the controlling statute(s), key Supreme Court authority, and the doctrinal tension or fact pattern that produces a good question. Ground it in REAL Indian law. Do not invent sections or cases.
- suggested_area: one of ${AREAS.join(", ")}
- suggested_difficulty: one of ${DIFFS.join(", ")}

Return strict JSON: {"topics":[ { ... }, ... ]}.
If you cannot produce ${count} grounded topics, return {"refused": true, "reason":"..."}.`;
}

function buildExpandPrompt(seed: string, areas?: string[], diff?: string): string {
  const areaLine = areas?.length ? `Preferred area(s): ${areas.join(", ")}.` : "";
  const diffLine = diff ? `Target difficulty: ${diff}.` : "";
  return `An admin gave this seed for a legal-question topic:
"""
${seed}
"""

${areaLine}
${diffLine}

Research the seed in the context of Indian law and produce ONE rich topic for question drafting. Return:
- title: max 60 chars
- description: 1–2 sentence summary
- topic_prompt: 4–8 sentence brief naming the controlling statute(s), leading Supreme Court / High Court authority, the doctrinal tension, and at least one concrete fact pattern an examiner could use. Ground everything in REAL Indian law — do NOT invent sections or cases. If the seed is too vague or you are not confident, return {"refused": true, "reason":"..."}.
- suggested_area: one of ${AREAS.join(", ")}
- suggested_difficulty: one of ${DIFFS.join(", ")}

Return strict JSON exactly as: {"topics":[ { ... } ]} (a single-element array).`;
}

function stripFencesObj(t: string): string {
  let s = t.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const start = Date.now();

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
  let generationId: string | null = null;

  const finalizeLog = async (patch: Record<string, unknown>) => {
    if (!generationId) return;
    await adminClient.from("bar_ai_generations")
      .update({ ...patch, duration_ms: Date.now() - start })
      .eq("id", generationId);
  };

  try {
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userRes?.user?.id) return json(401, { error: "Unauthorized" });
    const userId = userRes.user.id;

    const { data: scopeOk } = await adminClient.rpc("has_admin_scope", {
      uid: userId, scope: "bar_admin",
    });
    if (!scopeOk) return json(403, { error: "Forbidden — admin only" });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: "Invalid body", details: parsed.error.flatten() });
    const body = parsed.data;
    const count = body.mode === "surprise" ? (body.count ?? 5) : 1;

    const { data: logRow, error: logErr } = await adminClient.from("bar_ai_generations").insert({
      source_id: null,
      generation_type: "topic_suggest",
      requested_by: userId,
      area_of_law_hint: body.areas?.[0] ?? null,
      difficulty_hint: body.difficulty_hint ?? null,
      model: MODEL,
      outcome: "ai_error",
    }).select("id").single();
    if (logErr || !logRow) {
      return json(500, { error: "Failed to create log row", details: logErr?.message });
    }
    generationId = logRow.id;

    const userPrompt = body.mode === "surprise"
      ? buildSurprisePrompt(count, body.areas, body.difficulty_hint)
      : buildExpandPrompt(body.seed!, body.areas, body.difficulty_hint);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are a senior Indian-law academic. Return strict JSON only. Ground all output in real statutes and case law; never fabricate citations." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      await finalizeLog({ outcome: "rate_limit", error_message: "AI rate limited" });
      return json(429, { error: "Rate limited — try again shortly." });
    }
    if (aiResp.status === 402) {
      await finalizeLog({ outcome: "quota_exceeded", error_message: "AI credits exhausted" });
      return json(402, { error: "AI credits exhausted." });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      await finalizeLog({ outcome: "ai_error", error_message: `Gateway ${aiResp.status}: ${t.slice(0, 500)}` });
      return json(500, { error: "AI gateway error" });
    }

    const aiData = await aiResp.json();
    const text: string = aiData.choices?.[0]?.message?.content ?? "";
    const promptTokens = aiData.usage?.prompt_tokens ?? null;
    const completionTokens = aiData.usage?.completion_tokens ?? null;

    let parsedAi: any;
    try { parsedAi = JSON.parse(stripFencesObj(text)); }
    catch {
      await finalizeLog({ outcome: "parse_fail", error_message: "JSON parse failed", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(500, { error: "AI returned malformed JSON" });
    }

    if (parsedAi?.refused === true) {
      const reason = typeof parsedAi.reason === "string" ? parsedAi.reason : "AI declined";
      await finalizeLog({ outcome: "validation_fail", error_message: reason, prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: `AI declined: ${reason}` });
    }

    const rawTopics = Array.isArray(parsedAi?.topics) ? parsedAi.topics : [];
    const validTopics = rawTopics
      .map((t: unknown) => TopicSchema.safeParse(t))
      .filter((r: any) => r.success)
      .map((r: any) => r.data);

    if (validTopics.length === 0) {
      await finalizeLog({ outcome: "validation_fail", error_message: "no valid topics", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: "AI returned no valid topics" });
    }

    const rows = validTopics.map((t: any) => ({
      title: t.title.slice(0, 200),
      description: t.description,
      source_type: "topic_prompt" as const,
      topic_prompt: t.topic_prompt,
      license: body.license,
      uploaded_by: userId,
    }));

    const { data: inserted, error: insErr } = await adminClient.from("bar_sources").insert(rows).select("id");
    if (insErr || !inserted) {
      await finalizeLog({ outcome: "ai_error", error_message: insErr?.message ?? "insert failed", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(500, { error: "Failed to insert topic sources", details: insErr?.message });
    }

    await finalizeLog({
      outcome: "success",
      challenges_created: 0,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
    });

    return json(200, {
      generation_id: generationId,
      sources_created: inserted.length,
      source_ids: inserted.map((r: any) => r.id),
    });
  } catch (e) {
    console.error("suggest-topics error:", e);
    await finalizeLog({ outcome: "ai_error", error_message: e instanceof Error ? e.message : "Unknown" });
    return json(500, { error: "Internal server error. Please try again." });
  }
});
