import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a CV parser for a legal internship platform. Extract structured information from the attached PDF CV and return ONLY valid JSON — no explanation, no markdown, no code fences, just the JSON object.

Extract these fields. For any field you cannot confidently determine from the CV, use null (for single values) or [] (for arrays). DO NOT guess or fabricate. Missing data is better than wrong data.

Schema to return:

{ "bio": string | null, "college": string | null, "degree": "BA LLB" | "BBA LLB" | "BCom LLB" | "LLB (3yr)" | "LLM" | "Other" | null, "graduation_year": integer | null, "subjects_of_interest": string[], "internships": [ { "firm_name": string, "role": string, "start_date": "YYYY-MM-DD" | null, "end_date": "YYYY-MM-DD" | null, "description": string | null } ], "moots": [ { "competition_name": string, "year": integer, "role": "speaker" | "researcher" | "both", "result": "winner" | "runner_up" | "semi_finalist" | "quarter_finalist" | "participant" } ], "publications": [ { "title": string, "publisher": string, "url": string | null, "publication_date": "YYYY-MM-DD" | null } ] }

RULES:

DO NOT extract CGPA, marks, or grades — skip these entirely.

For bio: write a concise 1-2 sentence professional summary from the CV's objective/profile section. Max 280 characters. If no explicit bio/summary exists, return null — do not generate one.

For dates where only month+year are known (e.g. "June 2024"), use the 1st of the month (2024-06-01). For year-only dates, return null.

For ongoing internships (e.g. "Present"), set end_date to null.

For degree: match to the exact enum values above. "B.A. LL.B." → "BA LLB", "B.B.A. LL.B." → "BBA LLB", etc. If it doesn't match any option cleanly, use "Other".

For moots: if role is unclear, default to "speaker". If result is unclear, default to "participant". DO NOT invent placements.

For subjects_of_interest: extract from sections titled "Areas of Interest", "Subjects", "Specialization", or inferred from coursework. Cap at 10 items. Lowercase the values.

For internships: role should be the student's position (e.g. "Legal Intern", "Research Intern"), firm_name should be the organization (e.g. "Cyril Amarchand Mangaldas").

For publications: if a URL is visible in the CV, include it. Otherwise null.

Omit any entry that's too malformed to extract cleanly. Better to skip than fabricate.

Return ONLY the JSON object. No other text.`;

const DEGREE_ENUM = ["BA LLB", "BBA LLB", "BCom LLB", "LLB (3yr)", "LLM", "Other"];
const MOOT_ROLES = ["speaker", "researcher", "both"];
const MOOT_RESULTS = ["winner", "runner_up", "semi_finalist", "quarter_finalist", "participant"];

function isValidUrl(s: string): boolean {
  try { new URL(s); return true; } catch { return false; }
}

function validate(raw: any) {
  const out: any = {
    bio: null,
    college: null,
    degree: null,
    graduation_year: null,
    subjects_of_interest: [],
    internships: [],
    moots: [],
    publications: [],
  };
  if (!raw || typeof raw !== "object") return null;

  if (typeof raw.bio === "string" && raw.bio.trim()) {
    out.bio = raw.bio.trim().slice(0, 280);
  }
  if (typeof raw.college === "string" && raw.college.trim()) {
    out.college = raw.college.trim();
  }
  if (typeof raw.degree === "string" && DEGREE_ENUM.includes(raw.degree)) {
    out.degree = raw.degree;
  }
  const gy = typeof raw.graduation_year === "string" ? parseInt(raw.graduation_year, 10) : raw.graduation_year;
  if (Number.isInteger(gy) && gy >= 1950 && gy <= 2100) {
    out.graduation_year = gy;
  }
  if (Array.isArray(raw.subjects_of_interest)) {
    out.subjects_of_interest = raw.subjects_of_interest
      .filter((s: any) => typeof s === "string" && s.trim())
      .map((s: string) => s.trim().toLowerCase())
      .slice(0, 10);
  }
  if (Array.isArray(raw.internships)) {
    out.internships = raw.internships
      .filter((i: any) => i && typeof i.firm_name === "string" && i.firm_name.trim() && typeof i.role === "string" && i.role.trim())
      .map((i: any) => ({
        firm_name: i.firm_name.trim(),
        role: i.role.trim(),
        start_date: typeof i.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(i.start_date) ? i.start_date : null,
        end_date: typeof i.end_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(i.end_date) ? i.end_date : null,
        description: typeof i.description === "string" && i.description.trim() ? i.description.trim().slice(0, 500) : null,
      }));
  }
  if (Array.isArray(raw.moots)) {
    out.moots = raw.moots
      .map((m: any) => {
        if (!m || typeof m.competition_name !== "string" || !m.competition_name.trim()) return null;
        const yr = typeof m.year === "string" ? parseInt(m.year, 10) : m.year;
        if (!Number.isInteger(yr) || yr < 1950 || yr > 2100) return null;
        return {
          competition_name: m.competition_name.trim(),
          year: yr,
          role: MOOT_ROLES.includes(m.role) ? m.role : "speaker",
          result: MOOT_RESULTS.includes(m.result) ? m.result : "participant",
        };
      })
      .filter(Boolean);
  }
  if (Array.isArray(raw.publications)) {
    out.publications = raw.publications
      .filter((p: any) => p && typeof p.title === "string" && p.title.trim() && typeof p.publisher === "string" && p.publisher.trim())
      .map((p: any) => ({
        title: p.title.trim(),
        publisher: p.publisher.trim(),
        url: typeof p.url === "string" && isValidUrl(p.url) ? p.url : null,
        publication_date: typeof p.publication_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.publication_date) ? p.publication_date : null,
      }));
  }
  return out;
}

function extractJson(text: string): any | null {
  if (!text) return null;
  // Strip code fences if present
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) t = fence[1].trim();
  // Find first { and last }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return null;
  const candidate = t.slice(first, last + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

async function callGemini(base64Pdf: string, stricter: boolean): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const userContent: any[] = [
    {
      type: "file",
      file: {
        filename: "cv.pdf",
        file_data: `data:application/pdf;base64,${base64Pdf}`,
      },
    },
    {
      type: "text",
      text: stricter
        ? "Parse this CV. Return ONLY valid JSON matching the schema in your system prompt. No markdown, no code fences, no preamble. Just the raw JSON object starting with { and ending with }."
        : "Parse this CV and return the structured JSON.",
    },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    const err: any = new Error(`AI gateway error ${response.status}: ${t}`);
    err.status = response.status;
    throw err;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function bytesToBase64(bytes: Uint8Array): string {
  // chunk to avoid call-stack issues on large PDFs
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  let userId = "unknown";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", retryable: false }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !userRes?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized", retryable: false }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const cvStoragePath = body?.cv_storage_path;
    if (typeof cvStoragePath !== "string" || !cvStoragePath.trim()) {
      return new Response(JSON.stringify({ error: "cv_storage_path required", retryable: false }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cvStoragePath.startsWith(`${userId}/`)) {
      console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "forbidden", duration_ms: Date.now() - start }));
      return new Response(JSON.stringify({ error: "Forbidden", retryable: false }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fileData, error: dlErr } = await adminClient.storage.from("cvs").download(cvStoragePath);
    if (dlErr || !fileData) {
      console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "not_found", duration_ms: Date.now() - start }));
      return new Response(JSON.stringify({ error: "CV not found in storage", retryable: false }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arr = new Uint8Array(await fileData.arrayBuffer());
    const base64 = bytesToBase64(arr);

    let aiText = "";
    try {
      aiText = await callGemini(base64, false);
    } catch (e: any) {
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", retryable: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (e?.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted.", retryable: false }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    let parsed = extractJson(aiText);
    if (!parsed) {
      // retry once with stricter prompt
      try {
        aiText = await callGemini(base64, true);
        parsed = extractJson(aiText);
      } catch {
        // fall through
      }
    }

    if (!parsed) {
      console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "parse_fail", duration_ms: Date.now() - start }));
      return new Response(JSON.stringify({ error: "Could not parse CV — please try again or fill manually", retryable: true }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validated = validate(parsed);
    if (!validated) {
      console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "validate_fail", duration_ms: Date.now() - start }));
      return new Response(JSON.stringify({ error: "Could not parse CV — please try again or fill manually", retryable: true }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "success", duration_ms: Date.now() - start }));
    return new Response(JSON.stringify(validated), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-cv error:", e);
    console.log(JSON.stringify({ user_id: userId, ts: new Date().toISOString(), outcome: "error", duration_ms: Date.now() - start }));
    return new Response(JSON.stringify({ error: "Internal server error. Please try again.", retryable: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
