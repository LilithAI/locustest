// draft-question-from-prompt
//
// MANUAL TEST CASES:
// 1. Valid admin + valid topic source + valid params → 200, 1 challenge created.
// 2. AI returns {refused: true} → 422 with reason.
// 3. source_id is a PDF source → 400.
// 4. Non-admin caller → 403.
// 5. Missing/invalid body → 400.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";

const McqPayloadSchema = z.object({
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(6),
  correct_option_id: z.string().min(1),
}).refine((p) => p.options.some((o) => o.id === p.correct_option_id), { message: "correct_option_id mismatch" });

const IssueSpotterPayloadSchema = z.object({
  issue_options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(3).max(10),
  correct_issue_ids: z.array(z.string().min(1)).min(1),
}).refine((p) => {
  const ids = new Set(p.issue_options.map((o) => o.id));
  return p.correct_issue_ids.every((id) => ids.has(id));
}, { message: "correct_issue_ids mismatch" });

const SpeedRoundPayloadSchema = z.object({
  questions: z.array(z.object({ id: z.string().min(1), prompt: z.string().min(1), answer: z.string().min(1), aliases: z.array(z.string().min(1)).max(10).optional() })).min(5).max(15),
  time_limit_seconds: z.number().int().min(30).max(300),
});

const JurisdictionPayloadSchema = z.object({
  options: z.array(z.object({ id: z.string().min(1), jurisdiction: z.string().min(1), reasoning: z.string().min(1) })).min(2).max(5),
  correct_option_id: z.string().min(1),
}).refine((p) => p.options.some((o) => o.id === p.correct_option_id), { message: "correct_option_id mismatch" });

const DocumentReviewPayloadSchema = z.object({
  document_html: z.string().min(1),
  spans: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(20),
  categories: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(1).max(8),
  correct_flags: z.array(z.object({ span_id: z.string().min(1), category_id: z.string().min(1) })).min(1),
}).refine((p) => {
  const sIds = new Set(p.spans.map((s) => s.id));
  const cIds = new Set(p.categories.map((c) => c.id));
  if (!p.correct_flags.every((f) => sIds.has(f.span_id) && cIds.has(f.category_id))) return false;
  const re = /\{\{(.+?)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p.document_html)) !== null) {
    if (!sIds.has(m[1])) return false;
  }
  return true;
}, { message: "document_html markers / correct_flags must reference real spans + categories" });

const BriefBuilderPayloadSchema = z.object({
  fact_pattern: z.string().min(1),
  citation: z.string().optional().default(""),
  steps: z.array(z.object({
    kind: z.enum(["mcq", "order"]),
    label: z.string().min(1),
    prompt: z.string().min(1),
    options: z.array(z.object({
      id: z.string().min(1), letter: z.string().min(1).max(2),
      title: z.string().min(1), desc: z.string().optional().default(""), meta: z.string().optional().default(""),
    })).optional(),
    correct_option_id: z.string().optional(),
    blocks: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).optional(),
    correct_order: z.array(z.string().min(1)).optional(),
  }).refine((s) => {
    if (s.kind === "mcq") {
      if (!s.options || s.options.length < 2 || !s.correct_option_id) return false;
      return s.options.some((o) => o.id === s.correct_option_id);
    }
    if (!s.blocks || s.blocks.length < 2 || !s.correct_order) return false;
    const ids = new Set(s.blocks.map((b) => b.id));
    return s.correct_order.length === s.blocks.length && s.correct_order.every((id) => ids.has(id));
  }, { message: "step shape invalid for its kind" })).min(2).max(6),
});

const EthicsPayloadSchema = z.object({
  scenario: z.string().min(1),
  decision_options: z.array(z.object({ id: z.string().min(1), letter: z.string().min(1).max(2), text: z.string().min(1) })).min(2).max(6),
  correct_decision_id: z.string().min(1),
  consequence_text: z.string().min(1),
  followup_options: z.array(z.object({ id: z.string().min(1), letter: z.string().min(1).max(2), text: z.string().min(1) })).min(2).max(6),
  correct_followup_id: z.string().min(1),
  model_reasoning: z.string().min(1),
}).refine((p) =>
  p.decision_options.some((o) => o.id === p.correct_decision_id) &&
  p.followup_options.some((o) => o.id === p.correct_followup_id),
  { message: "correct ids must match options" });

const ClientCounselingPayloadSchema = z.object({
  matter: z.string().min(1),
  transcript: z.array(z.object({
    turn: z.number().int().min(1), role: z.enum(["client", "lawyer"]), text: z.string().min(1),
  })).min(1).max(20),
  decision_turns: z.array(z.object({
    turn: z.number().int().min(1), prompt: z.string().min(1),
    options: z.array(z.object({ id: z.string().min(1), letter: z.string().min(1).max(2), text: z.string().min(1) })).min(2).max(6),
    correct_option_id: z.string().min(1),
    model_followup: z.string().optional().default(""),
  }).refine((t) => t.options.some((o) => o.id === t.correct_option_id), {
    message: "decision_turn correct_option_id must match an option id",
  })).min(1).max(10),
});

const V1_TYPES = [
  "mcq", "issue_spotter", "speed_round", "jurisdiction",
  "document_review", "brief_builder", "ethics", "client_counseling",
] as const;
type V1Type = typeof V1_TYPES[number];

const AREAS = [
  "constitutional", "criminal", "contract", "torts", "corporate", "ip", "labour", "tax", "evidence",
  "procedure", "family", "property", "administrative", "international", "jurisprudence", "environmental", "other",
] as const;
const DIFFS = ["easy", "medium", "hard"] as const;

const BASE_POINTS_BY_TYPE: Record<V1Type, number> = {
  mcq: 5, issue_spotter: 15, jurisdiction: 10, speed_round: 3,
  document_review: 10, brief_builder: 10, ethics: 10, client_counseling: 10,
};
const DIFFICULTY_MULTIPLIER: Record<typeof DIFFS[number], number> = { easy: 1.0, medium: 1.5, hard: 2.0 };

function computeBasePoints(type: V1Type, diff: typeof DIFFS[number], speedRoundCount?: number): number {
  if (type === "speed_round") {
    const n = speedRoundCount ?? 5;
    return Math.max(1, Math.min(100, Math.round(BASE_POINTS_BY_TYPE.speed_round * n * DIFFICULTY_MULTIPLIER[diff])));
  }
  return Math.max(1, Math.min(100, Math.round(BASE_POINTS_BY_TYPE[type] * DIFFICULTY_MULTIPLIER[diff])));
}

const BodySchema = z.object({
  source_id: z.string().uuid(),
  question_type: z.enum(V1_TYPES),
  area_of_law: z.enum(AREAS).optional(),
  difficulty: z.enum(DIFFS),
});

function buildPrompt(topic: string, qt: V1Type, area: string | undefined, diff: string): string {
  const areaLine = area
    ? `- Area of law: ${area}`
    : `- Area of law: INFER the most appropriate from this exact list and put it in "area_of_law": ${AREAS.join(", ")}.`;
  const areaOuterLine = area ? `"${area}"` : `<one of: ${AREAS.join(" | ")}>`;
  return `You are drafting a single legal question for an Indian law student platform.

Topic prompt provided by admin:
"""
${topic}
"""

Required parameters:
- Question type: ${qt}
${areaLine}
- Difficulty: ${diff}

Return EXACTLY ONE question as a JSON object (not an array). Per-type payload shapes:
- mcq: { "options":[{"id":"a","text":"..."}], "correct_option_id":"a" }  (2-6 options)
- issue_spotter: { "issue_options":[{"id":"a","text":"..."}], "correct_issue_ids":["a"] }  (3-10 issues)
- speed_round: { "questions":[{"id":"q1","prompt":"...","answer":"...","aliases":["alt phrasing 1","alt phrasing 2"]}], "time_limit_seconds":60 }  (5-8 sub-qs; aliases optional but recommended for any answer with common alternate phrasings, abbreviations like "SC"/"Supreme Court", or short forms — 1-3 alternates each, no need for typo variants since the grader handles those)
- jurisdiction: { "options":[{"id":"a","jurisdiction":"...","reasoning":"..."}], "correct_option_id":"a" }  (2-5 options)
- document_review: { "reviewer_brief":"Partner's instruction to the junior, 1-2 sentences", "agreement_type":"NDA | Mutual NDA | SOW | MSA | Employment Agreement | SaaS | Licensing | Distribution | Consultancy | Shareholder | etc.", "doc_id":"DOC-XXX-NNN", "doc_title":"...", "doc_subtitle":"Between Party A and Party B", "doc_date":"Month YYYY", "document_html":"clause text with {{s1}}, {{s2}}... markers", "spans":[{"id":"s1","text":"verbatim phrase the marker replaces"}], "categories":[{"id":"one_sided","label":"One-sided"},{"id":"overbroad","label":"Overbroad"},{"id":"missing_carveout","label":"Missing Carve-out"},{"id":"vague","label":"Vague / Unenforceable"},{"id":"missing_clause","label":"Standard Clause Missing"},{"id":"boilerplate_wrong","label":"Wrong Boilerplate"},{"id":"liability_risk","label":"Liability Risk"},{"id":"ip_leakage","label":"IP Leakage"},{"id":"term_trap","label":"Termination / Renewal Trap"},{"id":"confidentiality_gap","label":"Confidentiality Gap"},{"id":"payment_risk","label":"Payment / Tax Risk"},{"id":"compliance_gap","label":"Compliance Gap"}], "correct_flags":[{"span_id":"s1","category_id":"one_sided"}], "rationale":{"s1":"Why s1 is a problem — 1-2 sentences a junior can learn from."}, "suggested_redline":{"s1":"How a senior would rewrite the clause."} }
- brief_builder: { "fact_pattern":"...", "citation":"X v. Y (2024)", "steps":[ {"kind":"mcq","label":"Statute","prompt":"...","options":[{"id":"a","letter":"A","title":"...","desc":"...","meta":""}],"correct_option_id":"a"}, {"kind":"mcq","label":"Precedent",...}, {"kind":"order","label":"Arguments","prompt":"order strongest→weakest","blocks":[{"id":"b1","text":"..."}],"correct_order":["b1","b2","b3"]}, {"kind":"mcq","label":"Rebuttal",...} ] }  (exactly 4 steps)
- ethics: { "scenario":"...", "decision_options":[{"id":"a","letter":"A","text":"..."}], "correct_decision_id":"a", "consequence_text":"...", "followup_options":[{"id":"a","letter":"A","text":"..."}], "correct_followup_id":"a", "model_reasoning":"..." }
- client_counseling: { "matter":"...", "transcript":[{"turn":1,"role":"client","text":"..."}], "decision_turns":[{"turn":1,"prompt":"How do you respond?","options":[{"id":"a","letter":"A","text":"..."}],"correct_option_id":"a","model_followup":"..."}] }  (3-5 decision turns)

Outer object shape:
{
  "question_type": "${qt}",
  "area_of_law": ${areaOuterLine},
  "difficulty": "${diff}",
  "title": string (60 chars max),
  "prompt": string,
  "explanation": string | null,
  "payload": { ... }
}

RULES:
1. Must be grounded in real Indian law. Do not invent sections, cases, or rules.
2. If you cannot confidently draft a correct question at the requested difficulty, return {"refused": true, "reason": "..."}.
3. Otherwise return the challenge object directly. No markdown. No preamble.
4. MCQ distractors must be plausible (reflect common student errors), not obviously wrong.
5. Issue spotter: include at least 1 red-herring issue.
6. Speed round: 5-8 sub-questions, 60s time limit unless topic suggests otherwise.
7. Jurisdiction reasoning must reference real Indian statutes or case law if possible.
8. Explanation: 1-3 sentences (rule + why correct answer follows).
9. area_of_law MUST be one of the allowed enum values exactly (lowercase, snake-style as listed).
10. document_review is the AGREEMENT REVIEW TRAINER. The draft MUST be a realistic excerpt from a commercial agreement (NDA, SOW, MSA, Employment, SaaS, Licensing, Distribution, Consultancy, Shareholder, etc.) — NOT a statute extract, board resolution, or memo. Pick categories ONLY from the fixed taxonomy in the payload shape. Each span.text MUST be a verbatim substring of document_html (the marker {{sN}} is what gets replaced; spans.text is the underlying phrase). Always include reviewer_brief, rationale (one entry per correct_flag span_id), and suggested_redline (one entry per correct_flag span_id). For India-flavour drafts, use Indian Contract Act, DPDP Act, POSH Act, Section 27 non-compete unenforceability, GST/TDS, gratuity/PF where relevant.

Return the JSON object. Nothing else.`;
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

function validatePayload(qt: V1Type, payload: unknown): boolean {
  switch (qt) {
    case "mcq": return McqPayloadSchema.safeParse(payload).success;
    case "issue_spotter": return IssueSpotterPayloadSchema.safeParse(payload).success;
    case "speed_round": return SpeedRoundPayloadSchema.safeParse(payload).success;
    case "jurisdiction": return JurisdictionPayloadSchema.safeParse(payload).success;
    case "document_review": return DocumentReviewPayloadSchema.safeParse(payload).success;
    case "brief_builder": return BriefBuilderPayloadSchema.safeParse(payload).success;
    case "ethics": return EthicsPayloadSchema.safeParse(payload).success;
    case "client_counseling": return ClientCounselingPayloadSchema.safeParse(payload).success;
    default: return false;
  }
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

  let generationId: string | null = null;
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

  const finalizeLog = async (patch: Record<string, unknown>) => {
    if (!generationId) return;
    await adminClient.from("bar_ai_generations").update({ ...patch, duration_ms: Date.now() - start }).eq("id", generationId);
  };

  try {
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured", retryable: false });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized", retryable: false });

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userRes?.user?.id) return json(401, { error: "Unauthorized", retryable: false });
    const userId = userRes.user.id;

    const { data: scopeOk } = await adminClient.rpc("has_admin_scope", { uid: userId, scope: "bar_admin" });
    if (!scopeOk) return json(403, { error: "Forbidden — admin only", retryable: false });

    const parsedBody = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedBody.success) return json(400, { error: "Invalid body", details: parsedBody.error.flatten(), retryable: false });
    const { source_id, question_type, area_of_law, difficulty } = parsedBody.data;

    const { data: source } = await adminClient.from("bar_sources").select("*").eq("id", source_id).maybeSingle();
    if (!source) return json(404, { error: "Source not found", retryable: false });
    if (source.source_type !== "topic_prompt") return json(400, { error: "Source is not a topic_prompt source", retryable: false });
    if (!source.topic_prompt) return json(400, { error: "Source has no topic_prompt text", retryable: false });

    const { data: logRow, error: logErr } = await adminClient.from("bar_ai_generations").insert({
      source_id, generation_type: "topic_draft", requested_by: userId,
      question_type_hint: question_type, area_of_law_hint: area_of_law, difficulty_hint: difficulty,
      model: MODEL, outcome: "ai_error",
    }).select("id").single();
    if (logErr || !logRow) return json(500, { error: "Failed to create log row", retryable: true });
    generationId = logRow.id;

    const userPrompt = buildPrompt(source.topic_prompt, question_type, area_of_law, difficulty);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You draft accurate Indian legal questions. Return strict JSON only." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      await finalizeLog({ outcome: "rate_limit", error_message: "AI rate limited" });
      return json(429, { error: "Rate limited — try again shortly.", retryable: true });
    }
    if (aiResp.status === 402) {
      await finalizeLog({ outcome: "quota_exceeded", error_message: "AI credits exhausted" });
      return json(402, { error: "AI credits exhausted.", retryable: false });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      await finalizeLog({ outcome: "ai_error", error_message: `Gateway ${aiResp.status}: ${t.slice(0, 500)}` });
      return json(500, { error: "AI gateway error", retryable: true });
    }

    const aiData = await aiResp.json();
    const text: string = aiData.choices?.[0]?.message?.content ?? "";
    const promptTokens = aiData.usage?.prompt_tokens ?? null;
    const completionTokens = aiData.usage?.completion_tokens ?? null;

    let parsed: any;
    try {
      parsed = JSON.parse(stripFencesObj(text));
    } catch {
      await finalizeLog({ outcome: "parse_fail", error_message: "JSON parse failed", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(500, { error: "AI returned malformed JSON", retryable: true });
    }

    if (parsed?.refused === true) {
      const reason = typeof parsed.reason === "string" ? parsed.reason : "AI declined";
      await finalizeLog({ outcome: "validation_fail", error_message: reason, prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: `AI declined to draft a question on this topic: ${reason}`, retryable: false });
    }

    // Validate
    if (parsed?.question_type !== question_type) {
      await finalizeLog({ outcome: "validation_fail", error_message: "question_type mismatch", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: "AI returned wrong question type", retryable: true });
    }
    if (typeof parsed.title !== "string" || typeof parsed.prompt !== "string") {
      await finalizeLog({ outcome: "validation_fail", error_message: "missing title/prompt", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: "AI output missing title/prompt", retryable: true });
    }
    if (!validatePayload(question_type, parsed.payload)) {
      await finalizeLog({ outcome: "validation_fail", error_message: "payload validation failed", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(422, { error: "AI payload failed validation", retryable: true });
    }

    // Resolve area_of_law: explicit hint wins, else trust AI's inference, else "other"
    const resolvedArea: typeof AREAS[number] = area_of_law
      ?? ((AREAS as readonly string[]).includes(parsed?.area_of_law) ? parsed.area_of_law : "other");

    const speedCount = question_type === "speed_round" ? parsed.payload.questions?.length : undefined;
    const points = computeBasePoints(question_type, difficulty, speedCount);

    const { data: inserted, error: insErr } = await adminClient.from("bar_challenges").insert({
      title: String(parsed.title).slice(0, 200),
      prompt: parsed.prompt,
      explanation: typeof parsed.explanation === "string" ? parsed.explanation : null,
      question_type, area_of_law: resolvedArea, difficulty,
      payload: parsed.payload,
      points_base: points,
      status: "draft",
      source_id,
      source_page: null,
      source_citation: `Drafted from topic: ${source.title}`,
      ai_generation_id: generationId,
      created_by: userId,
    }).select("id").single();

    if (insErr || !inserted) {
      await finalizeLog({ outcome: "ai_error", error_message: insErr?.message ?? "insert failed", prompt_tokens: promptTokens, completion_tokens: completionTokens });
      return json(500, { error: "Failed to insert challenge", retryable: true });
    }

    await finalizeLog({
      outcome: "success", challenges_created: 1,
      prompt_tokens: promptTokens, completion_tokens: completionTokens,
    });

    return json(200, { generation_id: generationId, challenge_id: inserted.id });
  } catch (e) {
    console.error("draft-question-from-prompt error:", e);
    await finalizeLog({ outcome: "ai_error", error_message: e instanceof Error ? e.message : "Unknown" });
    return json(500, { error: e instanceof Error ? e.message : "Unknown", retryable: true });
  }
});
