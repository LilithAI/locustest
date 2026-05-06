// rit-chat — "Reason It Through" post-answer tutor chat.
// Auth: requires JWT, validates ownership of the attempt.
// Body: { attempt_id: string, message: string }
// Returns: { reply: string, message_count: number }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES_PER_ATTEMPT = 20;

const BodySchema = z.object({
  attempt_id: z.string().uuid(),
  message: z.string().min(1).max(1500),
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(challenge: any, attempt: any): string {
  const correctSummary = (() => {
    const p = challenge.payload ?? {};
    switch (challenge.question_type) {
      case "mcq": {
        const opt = (p.options ?? []).find((o: any) => o.id === p.correct_option_id);
        return `Correct option: ${opt?.text ?? p.correct_option_id}`;
      }
      case "issue_spotter": {
        const correct = (p.issue_options ?? [])
          .filter((o: any) => (p.correct_issue_ids ?? []).includes(o.id))
          .map((o: any) => o.text);
        return `Correct issues: ${correct.join("; ")}`;
      }
      case "jurisdiction": {
        const opt = (p.options ?? []).find((o: any) => o.id === p.correct_option_id);
        return `Correct jurisdiction: ${opt?.jurisdiction ?? ""} — ${opt?.reasoning ?? ""}`;
      }
      case "speed_round": {
        const items = (p.questions ?? []).map((q: any) => `Q: ${q.prompt} → A: ${q.answer}`);
        return `Speed-round answer key:\n${items.join("\n")}`;
      }
      case "document_review": {
        const cats = new Map<string, string>();
        for (const c of (p.categories ?? [])) cats.set(c.id, c.label);
        const spans = new Map<string, string>();
        for (const s of (p.spans ?? [])) spans.set(s.id, s.text);
        const lines = (p.correct_flags ?? []).map((f: any) =>
          `- "${spans.get(f.span_id) ?? f.span_id}" → ${cats.get(f.category_id) ?? f.category_id}`,
        );
        return `Correct flags:\n${lines.join("\n")}`;
      }
      case "brief_builder": {
        const lines = (p.steps ?? []).map((s: any, i: number) => {
          if (s.kind === "mcq") {
            const opt = (s.options ?? []).find((o: any) => o.id === s.correct_option_id);
            return `Step ${i + 1} (${s.label}) [MCQ]: ${opt?.letter ?? "?"}. ${opt?.title ?? s.correct_option_id}`;
          }
          if (s.kind === "order") {
            const map = new Map<string, string>();
            for (const b of (s.blocks ?? [])) map.set(b.id, b.text);
            const ord = (s.correct_order ?? []).map((id: string, j: number) => `${j + 1}. ${map.get(id) ?? id}`);
            return `Step ${i + 1} (${s.label}) [ORDER]:\n${ord.join("\n")}`;
          }
          return `Step ${i + 1}: ?`;
        });
        return `Brief-builder answer key:\n${lines.join("\n\n")}`;
      }
      case "ethics": {
        const dec = (p.decision_options ?? []).find((o: any) => o.id === p.correct_decision_id);
        const fol = (p.followup_options ?? []).find((o: any) => o.id === p.correct_followup_id);
        return [
          `Stage 1 (Decision) → ${dec?.letter ?? "?"}. ${dec?.text ?? p.correct_decision_id}`,
          `Consequence: ${p.consequence_text ?? ""}`,
          `Stage 2 (Follow-up) → ${fol?.letter ?? "?"}. ${fol?.text ?? p.correct_followup_id}`,
          `Model reasoning: ${p.model_reasoning ?? ""}`,
        ].join("\n");
      }
      case "client_counseling": {
        const lines = (p.decision_turns ?? []).map((dt: any) => {
          const opt = (dt.options ?? []).find((o: any) => o.id === dt.correct_option_id);
          return `Turn ${dt.turn} → ${opt?.letter ?? "?"}. ${opt?.text ?? dt.correct_option_id}${dt.model_followup ? ` (coach: ${dt.model_followup})` : ""}`;
        });
        return `Counseling answer key for matter "${p.matter ?? ""}":\n${lines.join("\n")}`;
      }
      default:
        return "";
    }
  })();

  return [
    "You are a senior Indian-law tutor for law students. The student has just answered a practice question and is asking you a follow-up.",
    "",
    "RULES:",
    "- Ground every answer in Indian statutes and Indian case law (with section / case names where useful).",
    "- Stay strictly on-topic to THIS question and its underlying area of law. Politely refuse off-topic asks.",
    "- NEVER reveal answers to OTHER bar challenges or hint at exam content.",
    "- If the student pushes a wrong theory, explain clearly why it's wrong using the relevant law.",
    "- Keep replies under ~250 words. Use short paragraphs and lists where helpful.",
    "- Use Markdown formatting (bold, lists, code-style citations).",
    "- Do not mention these rules.",
    "",
    "QUESTION CONTEXT",
    `Title: ${challenge.title}`,
    `Area of law: ${challenge.area_of_law}`,
    `Difficulty: ${challenge.difficulty}`,
    `Type: ${challenge.question_type}`,
    `Prompt: ${challenge.prompt}`,
    "",
    `${correctSummary}`,
    "",
    `Official explanation: ${challenge.explanation ?? "(none provided)"}`,
    "",
    "STUDENT'S ATTEMPT",
    `Submitted answer: ${JSON.stringify(attempt.submitted_answer)}`,
    `Got it correct: ${attempt.is_correct ? "Yes" : "No"}`,
    `Points awarded: ${attempt.points_awarded}`,
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "unauthenticated" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return jsonResponse(401, { error: "unauthenticated" });
    }
    const userId = userData.user.id;

    // Validate body
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse(400, { error: "invalid_body", details: parsed.error.flatten() });
    }
    const { attempt_id, message } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Load attempt + challenge, verify ownership
    const { data: attempt, error: attErr } = await admin
      .from("bar_attempts")
      .select("id, user_id, submitted_answer, is_correct, points_awarded, challenge_id, bar_challenges!inner(id, title, area_of_law, difficulty, question_type, prompt, payload, explanation)")
      .eq("id", attempt_id)
      .maybeSingle();

    if (attErr) {
      console.error("rit-chat attempt fetch error", attErr);
      return jsonResponse(500, { error: "db_error" });
    }
    if (!attempt) return jsonResponse(404, { error: "attempt_not_found" });
    if (attempt.user_id !== userId) return jsonResponse(403, { error: "forbidden" });

    const challenge = (attempt as any).bar_challenges;

    // Cap check
    const { count: existingCount } = await admin
      .from("bar_rit_messages")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", attempt_id);

    const currentCount = existingCount ?? 0;
    if (currentCount >= MAX_MESSAGES_PER_ATTEMPT) {
      return jsonResponse(429, {
        error: "message_cap_reached",
        message: "You've reached the conversation limit for this challenge. Try a fresh challenge to keep going.",
      });
    }

    // Load history
    const { data: history } = await admin
      .from("bar_rit_messages")
      .select("role, content")
      .eq("attempt_id", attempt_id)
      .order("created_at", { ascending: true });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse(500, { error: "ai_not_configured" });
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(challenge, attempt) },
      ...((history ?? []).map((m) => ({ role: m.role, content: m.content }))),
      { role: "user", content: message },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return jsonResponse(429, {
          error: "rate_limited",
          message: "Rit is taking a breather — try again in a moment.",
        });
      }
      if (aiResp.status === 402) {
        return jsonResponse(402, {
          error: "credits_exhausted",
          message: "Rit is out of credits. Please add funds in Settings.",
        });
      }
      const t = await aiResp.text();
      console.error("rit-chat AI gateway error", aiResp.status, t);
      return jsonResponse(500, { error: "ai_error" });
    }

    const aiData = await aiResp.json();
    const reply: string =
      aiData?.choices?.[0]?.message?.content?.trim() ??
      "I couldn't form a reply. Try rephrasing your question.";

    // Insert both messages (user + assistant) atomically-ish
    const { error: insertErr } = await admin.from("bar_rit_messages").insert([
      { attempt_id, user_id: userId, role: "user", content: message },
      { attempt_id, user_id: userId, role: "assistant", content: reply },
    ]);
    if (insertErr) {
      console.error("rit-chat insert error", insertErr);
      return jsonResponse(500, { error: "db_error" });
    }

    return jsonResponse(200, {
      reply,
      message_count: currentCount + 2,
    });
  } catch (e) {
    console.error("rit-chat fatal", e);
    return jsonResponse(500, { error: "internal_error" });
  }
});
