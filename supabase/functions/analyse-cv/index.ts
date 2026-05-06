import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// MULTI-AGENT PIPELINE
// ============================================================
// Pass 1 (parallel, ~15-40s): Facts + Tier-scoring + Structural-audit
// Pass 2 (~5-10s): Synthesis into the final CvAnalysis JSON
//
// Hard ceiling: 110s via AbortController to fail before platform 150s timeout.
// Models: stable Gemini 2.5 family (no preview, no reasoning effort).
// Frontend contract is unchanged — same Analysis schema.
// ============================================================

const FACTS_MODEL = "google/gemini-2.5-flash";
const TIER_MODEL = "google/gemini-2.5-pro";
const AUDIT_MODEL = "google/gemini-2.5-flash";
const SYNTH_MODEL = "google/gemini-2.5-flash";
const PERSISTED_MODEL = "multi-agent/gemini-2.5";

const HARD_CEILING_MS = 110_000;

// ------------------------------------------------------------
// AGENT 1 — FACTS EXTRACTION (PDF → structured raw facts)
// ------------------------------------------------------------
const FACTS_SYSTEM = `You are a CV fact-extractor for an Indian legal hiring platform. Read the attached PDF and extract every concrete signal — DO NOT score, judge, or rewrite. Return strictly via the submit_cv_facts tool.

Be exhaustive: capture EVERY internship, moot, publication, position of responsibility, certification, and skill. For each bullet point in the experience sections, copy the exact bullet text verbatim into bullets[]. We need raw text for downstream semantic analysis.

Date math: convert "Jun–Jul 2024" to duration_weeks (e.g. ~5). If only a month is given, estimate 4 weeks. If "ongoing", estimate to today.

If a field is genuinely absent, use empty string or empty array. Never invent.`;

const FACTS_TOOL = {
  type: "function",
  function: {
    name: "submit_cv_facts",
    description: "Return the raw structured facts extracted from the CV. No scoring.",
    parameters: {
      type: "object",
      properties: {
        identity: {
          type: "object",
          properties: {
            name: { type: "string" },
            college: { type: "string" },
            programme: { type: "string" },
            graduation_year: { type: "string" },
            current_year_of_study: { type: "string" },
            cgpa_or_rank: { type: "string" },
            email_present: { type: "boolean" },
            phone_present: { type: "boolean" },
            linkedin_present: { type: "boolean" },
          },
          required: ["name", "college", "programme", "graduation_year", "current_year_of_study", "cgpa_or_rank", "email_present", "phone_present", "linkedin_present"],
          additionalProperties: false,
        },
        structural_signals: {
          type: "object",
          properties: {
            page_count: { type: "number" },
            font_family_guess: { type: "string" },
            has_photo: { type: "boolean" },
            has_dob_or_marital: { type: "boolean" },
            uses_first_person: { type: "boolean" },
            chronological_order: { type: "boolean" },
            obvious_typos: { type: "array", items: { type: "string" } },
            sections_present: { type: "array", items: { type: "string" } },
          },
          required: ["page_count", "font_family_guess", "has_photo", "has_dob_or_marital", "uses_first_person", "chronological_order", "obvious_typos", "sections_present"],
          additionalProperties: false,
        },
        internships: {
          type: "array",
          items: {
            type: "object",
            properties: {
              firm_or_chamber: { type: "string" },
              role: { type: "string" },
              location: { type: "string" },
              period_raw: { type: "string" },
              duration_weeks: { type: "number" },
              practice_areas_mentioned: { type: "array", items: { type: "string" } },
              bullets: { type: "array", items: { type: "string" } },
            },
            required: ["firm_or_chamber", "role", "location", "period_raw", "duration_weeks", "practice_areas_mentioned", "bullets"],
            additionalProperties: false,
          },
        },
        moots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              year: { type: "string" },
              role_raw: { type: "string" },
              outcome_raw: { type: "string" },
              awards: { type: "array", items: { type: "string" } },
            },
            required: ["name", "year", "role_raw", "outcome_raw", "awards"],
            additionalProperties: false,
          },
        },
        publications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              venue: { type: "string" },
              year: { type: "string" },
              url_present: { type: "boolean" },
              kind_hint: { type: "string" },
            },
            required: ["title", "venue", "year", "url_present", "kind_hint"],
            additionalProperties: false,
          },
        },
        positions_of_responsibility: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              organisation: { type: "string" },
              period_raw: { type: "string" },
              bullets: { type: "array", items: { type: "string" } },
            },
            required: ["title", "organisation", "period_raw", "bullets"],
            additionalProperties: false,
          },
        },
        awards_and_scholarships: { type: "array", items: { type: "string" } },
        certifications: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        languages: { type: "array", items: { type: "string" } },
        databases_mentioned: { type: "array", items: { type: "string" } },
        ai_or_tech_mentioned: { type: "array", items: { type: "string" } },
        commercial_vocabulary_hits: { type: "array", items: { type: "string" } },
        other_sections_raw: { type: "string" },
      },
      required: ["identity", "structural_signals", "internships", "moots", "publications", "positions_of_responsibility", "awards_and_scholarships", "certifications", "skills", "languages", "databases_mentioned", "ai_or_tech_mentioned", "commercial_vocabulary_hits", "other_sections_raw"],
      additionalProperties: false,
    },
  },
};

// ------------------------------------------------------------
// AGENT 2 — TIER & VECTOR SCORER (BCI Rule 25 + 3 vectors)
// ------------------------------------------------------------
const TIER_SYSTEM = `You are an Indian legal hiring expert calibrated to the 2026 market. Speak as the consensus of a Tier-1 recruiter (CAM/SAM/AZB/Khaitan/Trilegal/JSA), a litigation senior at the SC/Delhi HC, and an NLU placement chair. BRUTALLY HONEST, partner-voice. No participation trophies. But FAIR — reward genuine signals.

You are given a candidate's verbatim CV facts as JSON. Your job is to TIER and SCORE — not to rewrite. Return strictly via submit_tier_scores.

==============================================================
APPLY RIGOROUSLY
==============================================================

PEDIGREE TIERING
- Tier 1 NLUs: NLSIU Bengaluru, NALSAR Hyderabad, NUJS Kolkata, NLU Jodhpur, GNLU Gandhinagar, NLU Delhi.
- Tier 2: NLIU Bhopal, HNLU Raipur, RMLNLU Lucknow, NUSRL Ranchi, etc; premier private (Symbiosis Pune, Jindal Global).
- Tier 3: newer NLUs, regional state universities, local private colleges.
- PROXIMITY ADVANTAGE: GLC Mumbai, CLC Delhi, ILS Pune — set proximity_advantage=true ONLY IF the CV shows continuous concurrent-semester internships at HCs or Tier 1/2 firms.

INTERNSHIPS / FIRM TIERING
- Tier 1 (Elite Six): AZB & Partners, Cyril Amarchand Mangaldas, Shardul Amarchand Mangaldas, Khaitan & Co, J. Sagar Associates (JSA), Trilegal.
- Tier 2 (Strong National): S&R Associates, Luthra and Luthra, IndusLaw, Dentons Link Legal, ELP, Nishith Desai Associates, DSK Legal.
- Tier 3 (Boutique/Regional): Argus, Keystone, Singhania, Phoenix Legal, Saraf and Partners, Veritas Legal, Talwar Thakore.
- Tier 4: Sole practitioners, district court advocates, NGOs.
- CALLBACK = same Tier 1/2 firm in TWO distinct windows. Set callback=true. Massive positive signal.
- Substance score (0–10) per internship: weigh tier × duration × bullet quality.

MOOT TIERING
- global_t1: Jessup, Vis (Vienna/East), ICC Trial Moot, Oxford Price Media, FDI, Jean Pictet, Stetson, Manfred Lachs, Henry Dunant.
- national_t1: BCI Trust, Surana & Surana Corporate Law, NUJS HSF Corporate Law, K.K. Luthra Memorial, NLSTIAM, D.M. Harish, GNLU Securities & Investment Law.
- national_t2: NLU-D All India Corporate, NLUO Maritime, ILS Pune S.P. Sathe, Amity National, NLS-NHRC, NLIU R.K. Tankha.
- tier3: intra-college, regional moots without pan-India participation.

PUBLICATION TIERING
- t1_peer_reviewed: NLSIR, IJLT, JILI, NUJS Law Review, Indian Law Review, Cambridge Law Review, JNLUD.
- t2_institutional: Delhi Law Review, Christ University Law Journal, CNLU LJ, Amity LR.
- t1_commercial_blog: IndiaCorpLaw, IRCCL, SpicyIP, Bar & Bench, LiveLaw, Kluwer Arbitration Blog, SCC Online Blog.
- student_blog: university blogs.
- predatory: pay-to-publish aggregators — flag.

BCI RULE 25
- 5-year integrated programme: ≥20 weeks of internships required.
- 3-year LLB: ≥12 weeks.
- LLM: 0 (mark compliant true).
- Sum every internship's duration_weeks. Report bci_weeks_total, bci_required_weeks, bci_compliant.

THREE VECTORS — score each independently 0–100.
- CORPORATE: Tier 1/2 firm transactional teams. M&A, PE, capital markets, due diligence, term sheets, IndiaCorpLaw, NUJS HSF, GNLU Securities.
- LITIGATION: dispute resolution, Sr. Adv. chambers, HC/SC, arbitration, drafting plaints/SLPs/writs, Jessup/Vis speaker awards.
- IN-HOUSE: corporate counsel, regulatory/compliance, DPDP Act, BNS, CLM, GC-team. Reward business acumen, secondments, tech-law literacy.

Per-vector rubric (0–100):
Pedigree & Academics (15) · Internship Ladder + Substance (30) · Vector-aligned moots (10) · Vector-aligned publications (10) · Tech & Commercial Awareness (10) · Semantic Quality (15) · Structure & Hygiene (10).

Verdicts: ONE sharp partner-voice sentence per vector. No hedging.
Strengths arrays: GENUINE differentiators only. Empty if none — never invent.
Red flags: real concerns only.
best_fit_vector: the vector with the highest overall_score.
hedging_warning: empty string if a clear vector dominates, otherwise one sharp line.`;

const TIER_TOOL = {
  type: "function",
  function: {
    name: "submit_tier_scores",
    description: "Return tier classifications and per-vector scores.",
    parameters: {
      type: "object",
      properties: {
        candidate_snapshot: {
          type: "object",
          properties: {
            name_present: { type: "boolean" },
            college_detected: { type: "string" },
            year_or_graduation: { type: "string" },
            cgpa_or_rank: { type: "string" },
            programme: { type: "string" },
          },
          required: ["name_present", "college_detected", "year_or_graduation", "cgpa_or_rank", "programme"],
          additionalProperties: false,
        },
        pedigree: {
          type: "object",
          properties: {
            institution_name: { type: "string" },
            tier: { type: "integer", minimum: 1, maximum: 3 },
            proximity_advantage: { type: "boolean" },
            gpa_raw: { type: "string" },
            gpa_context_note: { type: "string" },
          },
          required: ["institution_name", "tier", "proximity_advantage", "gpa_raw", "gpa_context_note"],
          additionalProperties: false,
        },
        bci: {
          type: "object",
          properties: {
            bci_weeks_total: { type: "number" },
            bci_required_weeks: { type: "number" },
            bci_compliant: { type: "boolean" },
          },
          required: ["bci_weeks_total", "bci_required_weeks", "bci_compliant"],
          additionalProperties: false,
        },
        internship_ladder: {
          type: "array",
          items: {
            type: "object",
            properties: {
              firm_or_chamber: { type: "string" },
              tier: { type: "integer", minimum: 1, maximum: 4 },
              role: { type: "string" },
              year_or_period: { type: "string" },
              duration_weeks: { type: "number" },
              callback: { type: "boolean" },
              substance_score: { type: "integer", minimum: 0, maximum: 10 },
              vector_alignment: { type: "string", enum: ["corporate", "litigation", "in_house", "mixed", "foundational"] },
            },
            required: ["firm_or_chamber", "tier", "role", "year_or_period", "duration_weeks", "callback", "substance_score", "vector_alignment"],
            additionalProperties: false,
          },
        },
        moots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              tier: { type: "string", enum: ["global_t1", "national_t1", "national_t2", "tier3"] },
              role: { type: "string", enum: ["speaker", "researcher", "both", "unknown"] },
              outcome: { type: "string" },
              vector_alignment: { type: "string", enum: ["corporate", "litigation", "in_house", "general"] },
            },
            required: ["name", "tier", "role", "outcome", "vector_alignment"],
            additionalProperties: false,
          },
        },
        publications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              venue: { type: "string" },
              tier: { type: "string", enum: ["t1_peer_reviewed", "t2_institutional", "t1_commercial_blog", "student_blog", "predatory"] },
              vector_alignment: { type: "string", enum: ["corporate", "litigation", "in_house", "general"] },
            },
            required: ["title", "venue", "tier", "vector_alignment"],
            additionalProperties: false,
          },
        },
        tech_literacy: {
          type: "object",
          properties: {
            databases_mentioned: { type: "array", items: { type: "string" } },
            ai_or_tech_mentioned: { type: "array", items: { type: "string" } },
            score: { type: "integer", minimum: 0, maximum: 10 },
            verdict: { type: "string" },
          },
          required: ["databases_mentioned", "ai_or_tech_mentioned", "score", "verdict"],
          additionalProperties: false,
        },
        vector_scores: {
          type: "object",
          properties: {
            corporate: vectorScoreSchema(),
            litigation: vectorScoreSchema(),
            in_house: vectorScoreSchema(),
          },
          required: ["corporate", "litigation", "in_house"],
          additionalProperties: false,
        },
        best_fit_vector: { type: "string", enum: ["corporate", "litigation", "in_house"] },
        hedging_warning: { type: "string" },
      },
      required: ["candidate_snapshot", "pedigree", "bci", "internship_ladder", "moots", "publications", "tech_literacy", "vector_scores", "best_fit_vector", "hedging_warning"],
      additionalProperties: false,
    },
  },
};

function vectorScoreSchema() {
  return {
    type: "object",
    properties: {
      overall_score: { type: "integer", minimum: 0, maximum: 100 },
      tier_fit_pct: { type: "integer", minimum: 0, maximum: 100 },
      verdict: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      red_flags: { type: "array", items: { type: "string" } },
    },
    required: ["overall_score", "tier_fit_pct", "verdict", "strengths", "red_flags"],
    additionalProperties: false,
  };
}

// ------------------------------------------------------------
// AGENT 3 — STRUCTURAL & SEMANTIC AUDIT
// ------------------------------------------------------------
const AUDIT_SYSTEM = `You are a structural and semantic CV auditor for Indian legal CVs. Given the verbatim extracted facts, judge formatting compliance and bullet quality. NO scoring of substance — only structure and verbs. Return via submit_cv_audit.

STRUCTURAL CHECKS
- Length: 1 page preferred fresh grads; max 2; >2 = length_ok=false.
- Font family: Times New Roman / Garamond / similar serif at 11–12 = font_compliant=true. Colourful templates / heavy graphics / unusual fonts = false.
- Reverse chronological order across sections.
- has_photo_or_dob: photo OR date of birth OR marital status present.
- uses_first_person: any "I", "me", "my".
- grammar_clean: no obvious typos.
- violations: short partner-voice strings, e.g. "Photo on CV — remove.", "Uses 'I' — convert to bullet form.", "3 pages — cut to 2."

SEMANTIC AUDIT (every bullet across internships + positions_of_responsibility)
- Strong verbs: Authored, Drafted, Negotiated, Mediated, Litigated, Formulated, Structured, Examined, Executed, Advised, Analyzed, Researched, Argued, Filed.
- Weak/passive: Assisted, Helped, Participated in, Gained exposure to, Shadowed, Handled, Observed, Worked on, Was part of.
- quantified_bullets: bullets containing a number or scale (e.g. "12 plaints", "₹50 cr", "3 weeks").
- action_scale_outcome_bullets: bullets that combine ALL THREE — strong verb + concrete scale + outcome.
- example_weak_bullet: verbatim weakest bullet from CV.
- example_strong_bullet: verbatim strongest, or empty string if none qualify.
- top_weak_verbs_used: array of weak verbs the CV leans on.`;

const AUDIT_TOOL = {
  type: "function",
  function: {
    name: "submit_cv_audit",
    description: "Return structural compliance + semantic-quality stats.",
    parameters: {
      type: "object",
      properties: {
        structural_audit: {
          type: "object",
          properties: {
            length_pages: { type: "number" },
            length_ok: { type: "boolean" },
            font_compliant: { type: "boolean" },
            chronological_order: { type: "boolean" },
            has_photo_or_dob: { type: "boolean" },
            uses_first_person: { type: "boolean" },
            grammar_clean: { type: "boolean" },
            violations: { type: "array", items: { type: "string" } },
          },
          required: ["length_pages", "length_ok", "font_compliant", "chronological_order", "has_photo_or_dob", "uses_first_person", "grammar_clean", "violations"],
          additionalProperties: false,
        },
        semantic_quality: {
          type: "object",
          properties: {
            total_bullets: { type: "integer" },
            strong_verb_bullets: { type: "integer" },
            weak_verb_bullets: { type: "integer" },
            quantified_bullets: { type: "integer" },
            action_scale_outcome_bullets: { type: "integer" },
            top_weak_verbs_used: { type: "array", items: { type: "string" } },
            example_weak_bullet: { type: "string" },
            example_strong_bullet: { type: "string" },
          },
          required: ["total_bullets", "strong_verb_bullets", "weak_verb_bullets", "quantified_bullets", "action_scale_outcome_bullets", "top_weak_verbs_used", "example_weak_bullet", "example_strong_bullet"],
          additionalProperties: false,
        },
      },
      required: ["structural_audit", "semantic_quality"],
      additionalProperties: false,
    },
  },
};

// ------------------------------------------------------------
// AGENT 4 — SYNTHESIS (merge → verdict + per-vector top_fixes)
// ------------------------------------------------------------
const SYNTH_SYSTEM = `You are a senior partner writing the FINAL feedback for a candidate. You receive three pre-computed agent outputs:
1. FACTS — verbatim CV facts (ground truth, never invent beyond this)
2. TIER_SCORES — institution/firm/moot/publication tiers + per-vector scores + verdicts
3. AUDIT — structural compliance + semantic bullet stats

Your job: compose ONE polished JSON via submit_cv_synthesis containing:

A. verdict_headline — ONE sharp partner-voice sentence summarising the entire CV. Reference best fit vector + the single biggest signal (e.g. "Trilegal callback + IndiaCorpLaw piece — top-quartile A0 corporate candidate; fix the passive verbs and you double your shortlist rate.")

B. For EACH vector (corporate, litigation, in_house): up to 5 top_fixes ranked by IMPACT × EFFORT.
   Each fix:
   - priority: 1..5
   - area: short noun phrase ("Bullet semantics", "BCI compliance", "Publications gap")
   - issue: one sentence diagnosis
   - current_text: EXACT verbatim quote from FACTS bullets, OR the literal string "MISSING" if absent
   - rewrite: a copy-pasteable concrete replacement that this candidate could literally paste into their CV. Use specifics from THEIR CV (firm names, areas they worked on). Trifecta: Action + Scale + Outcome.
   - impact: high|medium|low
   - effort: low|medium|high

   NEVER fabricate experience the candidate doesn't have. If they have no publications, the rewrite for "Publications gap" should be advice ("Pitch a 1500-word piece to IndiaCorpLaw on..."), not a fake citation.

Each vector's fixes must be DIFFERENT — corporate fixes target corporate readiness; litigation fixes target litigation readiness; in-house targets in-house.

C. Pass-through the BCI fields into structural_audit (bci_weeks_total, bci_compliant, bci_required_weeks).

Return ONLY via submit_cv_synthesis.`;

const SYNTH_TOOL = {
  type: "function",
  function: {
    name: "submit_cv_synthesis",
    description: "Final partner-voice synthesis with per-vector top_fixes.",
    parameters: {
      type: "object",
      properties: {
        verdict_headline: { type: "string" },
        per_vector_fixes: {
          type: "object",
          properties: {
            corporate: { type: "array", items: fixSchema() },
            litigation: { type: "array", items: fixSchema() },
            in_house: { type: "array", items: fixSchema() },
          },
          required: ["corporate", "litigation", "in_house"],
          additionalProperties: false,
        },
      },
      required: ["verdict_headline", "per_vector_fixes"],
      additionalProperties: false,
    },
  },
};

function fixSchema() {
  return {
    type: "object",
    properties: {
      priority: { type: "integer", minimum: 1, maximum: 5 },
      area: { type: "string" },
      issue: { type: "string" },
      current_text: { type: "string" },
      rewrite: { type: "string" },
      impact: { type: "string", enum: ["high", "medium", "low"] },
      effort: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: ["priority", "area", "issue", "current_text", "rewrite", "impact", "effort"],
    additionalProperties: false,
  };
}

// ============================================================
// HELPERS
// ============================================================

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const buf = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callGateway(body: any, signal: AbortSignal): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const t = await response.text();
    const err: any = new Error(`AI gateway ${response.status}: ${t.slice(0, 300)}`);
    err.status = response.status;
    throw err;
  }
  return await response.json();
}

function parseToolCall(data: any, fnName: string): any {
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error(`AI did not return ${fnName} tool call`);
  try { return JSON.parse(toolCall.function.arguments); }
  catch { throw new Error(`AI ${fnName} arguments not valid JSON`); }
}

// ============================================================
// AGENT CALLS
// ============================================================

async function agentFacts(base64: string, signal: AbortSignal) {
  const data = await callGateway({
    model: FACTS_MODEL,
    messages: [
      { role: "system", content: FACTS_SYSTEM },
      { role: "user", content: [
        { type: "file", file: { filename: "cv.pdf", file_data: `data:application/pdf;base64,${base64}` } },
        { type: "text", text: "Extract every fact from this CV via submit_cv_facts. Verbatim bullets." },
      ] },
    ],
    tools: [FACTS_TOOL],
    tool_choice: { type: "function", function: { name: "submit_cv_facts" } },
  }, signal);
  return { facts: parseToolCall(data, "submit_cv_facts"), usage: data.usage || {} };
}

async function agentTier(base64: string, signal: AbortSignal) {
  // Tier needs the PDF too — runs in parallel with facts so it cannot wait for facts.
  const data = await callGateway({
    model: TIER_MODEL,
    messages: [
      { role: "system", content: TIER_SYSTEM },
      { role: "user", content: [
        { type: "file", file: { filename: "cv.pdf", file_data: `data:application/pdf;base64,${base64}` } },
        { type: "text", text: "Tier and score this candidate via submit_tier_scores. Apply the Indian Legal Blueprint." },
      ] },
    ],
    tools: [TIER_TOOL],
    tool_choice: { type: "function", function: { name: "submit_tier_scores" } },
  }, signal);
  return { tier: parseToolCall(data, "submit_tier_scores"), usage: data.usage || {} };
}

async function agentAudit(base64: string, signal: AbortSignal) {
  const data = await callGateway({
    model: AUDIT_MODEL,
    messages: [
      { role: "system", content: AUDIT_SYSTEM },
      { role: "user", content: [
        { type: "file", file: { filename: "cv.pdf", file_data: `data:application/pdf;base64,${base64}` } },
        { type: "text", text: "Audit structure and bullet semantics via submit_cv_audit." },
      ] },
    ],
    tools: [AUDIT_TOOL],
    tool_choice: { type: "function", function: { name: "submit_cv_audit" } },
  }, signal);
  return { audit: parseToolCall(data, "submit_cv_audit"), usage: data.usage || {} };
}

async function agentSynth(facts: any, tier: any, audit: any, signal: AbortSignal) {
  const data = await callGateway({
    model: SYNTH_MODEL,
    messages: [
      { role: "system", content: SYNTH_SYSTEM },
      { role: "user", content:
        `FACTS:\n${JSON.stringify(facts)}\n\nTIER_SCORES:\n${JSON.stringify(tier)}\n\nAUDIT:\n${JSON.stringify(audit)}\n\nReturn the final synthesis via submit_cv_synthesis.` },
    ],
    tools: [SYNTH_TOOL],
    tool_choice: { type: "function", function: { name: "submit_cv_synthesis" } },
  }, signal);
  return { synth: parseToolCall(data, "submit_cv_synthesis"), usage: data.usage || {} };
}

// ============================================================
// FINAL ASSEMBLY — into the Analysis shape the frontend expects
// ============================================================

function assembleAnalysis(tier: any, audit: any, synth: any) {
  const fixes = synth.per_vector_fixes || {};
  const vs = tier.vector_scores || {};
  return {
    verdict_headline: synth.verdict_headline || "",
    candidate_snapshot: tier.candidate_snapshot,
    structural_audit: {
      ...audit.structural_audit,
      bci_weeks_total: tier.bci?.bci_weeks_total ?? 0,
      bci_compliant: tier.bci?.bci_compliant ?? false,
      bci_required_weeks: tier.bci?.bci_required_weeks ?? 0,
    },
    pedigree: tier.pedigree,
    internship_ladder: tier.internship_ladder || [],
    moots: tier.moots || [],
    publications: tier.publications || [],
    semantic_quality: audit.semantic_quality,
    tech_literacy: tier.tech_literacy,
    vector_scores: {
      corporate: { ...vs.corporate, top_fixes: fixes.corporate || [] },
      litigation: { ...vs.litigation, top_fixes: fixes.litigation || [] },
      in_house: { ...vs.in_house, top_fixes: fixes.in_house || [] },
    },
    best_fit_vector: tier.best_fit_vector || "corporate",
    hedging_warning: tier.hedging_warning || "",
  };
}

// ============================================================
// SERVER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  let userId = "unknown";

  // Hard ceiling abort
  const controller = new AbortController();
  const ceilingTimer = setTimeout(() => controller.abort(), HARD_CEILING_MS);

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
      return new Response(JSON.stringify({ error: "Forbidden", retryable: false }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: fileData, error: dlErr } = await adminClient.storage.from("cvs").download(cvStoragePath);
    if (dlErr || !fileData) {
      return new Response(JSON.stringify({ error: "CV not found in storage", retryable: false }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arr = new Uint8Array(await fileData.arrayBuffer());
    if (arr.length > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "CV must be 5 MB or smaller", retryable: false }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------- CACHE LOOKUP --------------
    const cvHash = await sha256Hex(arr);
    const { data: cached } = await adminClient
      .from("cv_analyses")
      .select("id, created_at, analysis, overall_score")
      .eq("user_id", userId)
      .eq("cv_hash", cvHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.analysis) {
      console.log(JSON.stringify({ event: "analyse_cv_cache_hit", user_id: userId, cv_hash: cvHash, cached_id: cached.id }));
      clearTimeout(ceilingTimer);
      return new Response(JSON.stringify({
        id: cached.id,
        created_at: cached.created_at,
        analysis: cached.analysis,
        duration_ms: Date.now() - start,
        cached: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const base64 = bytesToBase64(arr);

    // -------------- PASS 1 — parallel agents --------------
    let factsRes: any, tierRes: any, auditRes: any;
    const pass1Start = Date.now();
    try {
      [factsRes, tierRes, auditRes] = await Promise.all([
        agentFacts(base64, controller.signal),
        agentTier(base64, controller.signal),
        agentAudit(base64, controller.signal),
      ]);
    } catch (e: any) {
      if (e?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment.", retryable: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (e?.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace > Usage.", retryable: false }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }
    const pass1_ms = Date.now() - pass1Start;

    // -------------- PASS 2 — synthesis --------------
    const pass2Start = Date.now();
    const { synth, usage: u4 } = await agentSynth(factsRes.facts, tierRes.tier, auditRes.audit, controller.signal);
    const pass2_ms = Date.now() - pass2Start;

    const analysis = assembleAnalysis(tierRes.tier, auditRes.audit, synth);

    // -------------- PERSIST --------------
    const duration_ms = Date.now() - start;
    const prompt_tokens =
      (factsRes.usage?.prompt_tokens ?? 0) + (tierRes.usage?.prompt_tokens ?? 0) +
      (auditRes.usage?.prompt_tokens ?? 0) + (u4?.prompt_tokens ?? 0);
    const completion_tokens =
      (factsRes.usage?.completion_tokens ?? 0) + (tierRes.usage?.completion_tokens ?? 0) +
      (auditRes.usage?.completion_tokens ?? 0) + (u4?.completion_tokens ?? 0);

    console.log(JSON.stringify({
      event: "analyse_cv_ok", user_id: userId, pass1_ms, pass2_ms, total_ms: duration_ms,
      prompt_tokens, completion_tokens,
    }));

    const bestFit: "corporate" | "litigation" | "in_house" = analysis?.best_fit_vector ?? "corporate";
    const overallScore: number = analysis?.vector_scores?.[bestFit]?.overall_score ?? 0;
    const verdict: string = analysis?.verdict_headline ?? analysis?.vector_scores?.[bestFit]?.verdict ?? "";

    const { data: inserted, error: insErr } = await adminClient
      .from("cv_analyses")
      .insert({
        user_id: userId,
        cv_storage_path: cvStoragePath,
        cv_hash: cvHash,
        overall_score: overallScore,
        verdict,
        analysis,
        model: PERSISTED_MODEL,
        prompt_tokens,
        completion_tokens,
        duration_ms,
      })
      .select("id, created_at")
      .single();

    if (insErr) console.error("cv_analyses insert error:", insErr);

    clearTimeout(ceilingTimer);
    return new Response(JSON.stringify({
      id: inserted?.id ?? null,
      created_at: inserted?.created_at ?? new Date().toISOString(),
      analysis,
      duration_ms,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    clearTimeout(ceilingTimer);
    const aborted = e?.name === "AbortError" || controller.signal.aborted;
    console.error("analyse-cv error:", e);
    if (aborted) {
      return new Response(JSON.stringify({
        error: "Analysis took too long. Please try again — the system was busy.",
        retryable: true,
      }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Internal server error. Please try again.", retryable: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
