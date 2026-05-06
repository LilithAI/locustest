import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================================
// Recipient-type matrix (condensed from Locus knowledge base §A4)
// =====================================================================
const RECIPIENT_TYPES = {
  tier1_firm: {
    label: "Tier-1 law firm",
    length: "150–200 words",
    tone: "Formal-corporate; confident, dated, named",
    salutation: "Dear Mr./Ms. [HR or Partner Surname], or Dear Hiring Team,",
    signoff: "Warm regards / Best regards",
    must: "Specific practice team, exact internship dates and office, one referenced firm matter or practice focus, one quantified credential. Include CGPA only if ≥7.0/10 with the scale ('CGPA 8.1/10').",
    avoid: "'Esteemed', 'prestigious', 'reputed', 'valued', litigation framing in a corporate letter, mass-CC tone.",
  },
  tier2_firm: {
    label: "Mid-tier / Tier-2 firm",
    length: "180–220 words",
    tone: "Formal but slightly warmer; show genuine interest in this firm specifically",
    salutation: "Dear Mr./Ms. [Surname], or Dear Hiring Team,",
    signoff: "Warm regards",
    must: "One concrete reason for choosing this firm over a Tier-1 (region, mentorship, niche), exact dates, office.",
    avoid: "Pretending you didn't apply to Tier-1, generic 'rapidly growing firm' praise.",
  },
  ip_boutique: {
    label: "IP boutique",
    length: "180–240 words",
    tone: "Specialist-technical",
    salutation: "Dear [HR/Partner Surname] or Dear Hiring Team,",
    signoff: "Sincerely / Warm regards",
    must: "IP elective or IP moot/publication, sub-team if known (Patents/TM/Litigation), science background if any.",
    avoid: "Generic 'interest in IP', conflating trademark with copyright.",
  },
  tax_boutique: {
    label: "Tax boutique",
    length: "180–220 words",
    tone: "Technical-precise",
    salutation: "Dear Hiring Team,",
    signoff: "Sincerely",
    must: "Sub-vertical (Direct / GST / Customs / Transfer Pricing), CA or commerce background if any, one cited ruling or notification.",
    avoid: "'Want to learn tax from scratch', generic finance enthusiasm.",
  },
  disputes_boutique: {
    label: "Disputes / litigation boutique",
    length: "180–240 words",
    tone: "Litigation-aware, drafting-focused",
    salutation: "Dear Mr./Ms. [Surname],",
    signoff: "Sincerely",
    must: "Drafting samples available, CPC/CrPC/Arbitration familiarity, willingness to attend court.",
    avoid: "Pure corporate vocabulary ('synergies', 'deal pipeline').",
  },
  sc_chamber: {
    label: "Supreme Court senior advocate chamber",
    length: "120–170 words",
    tone: "Highly deferential, terse, scholarly",
    salutation: "Respected Sir/Ma'am, or Respected Mr./Ms. [Surname],",
    signoff: "Yours faithfully / Respectfully",
    must: "Reference one recent matter argued by the senior, drafting + research interest, willingness to be physically present in Delhi.",
    avoid: "'Best regards' (chamber culture rejects it), corporate aspirations, claiming expertise, mentioning firm pedigree.",
  },
  hc_chamber: {
    label: "High Court senior advocate chamber",
    length: "120–170 words",
    tone: "Deferential, regional-aware",
    salutation: "Respected Sir/Ma'am,",
    signoff: "Yours faithfully",
    must: "Local context, regional language fluency if relevant, court attendance willingness.",
    avoid: "Same as SC chamber.",
  },
  inhouse_corporate: {
    label: "In-house legal team (corporate / FMCG / manufacturing)",
    length: "180–220 words",
    tone: "Corporate-practical",
    salutation: "Dear Hiring Team,",
    signoff: "Best regards",
    must: "Reference the company's sector/product, contracts or regulatory exposure (FSSAI / BIS / labour) if relevant.",
    avoid: "Romanticising 'passion for law', tier-1-firm vocabulary.",
  },
  inhouse_tech: {
    label: "In-house legal team (tech / SaaS startup)",
    length: "180–240 words",
    tone: "Slightly casual-corporate, product-aware",
    salutation: "Dear [Company] Team, or Hi [Name],",
    signoff: "Best regards",
    must: "Reference their product/sector, DPDP Act / IT Rules awareness, prior policy or tech-law exposure if any.",
    avoid: "Heavy legalese, 'Respected Sir/Ma'am'.",
  },
  legaltech_startup: {
    label: "Legal-tech startup",
    length: "150–220 words",
    tone: "Casual, product-minded, brief",
    salutation: "Hi [Name/Team],",
    signoff: "Best / Cheers",
    must: "Reference their product or blog, tech-comfort, side projects if any.",
    avoid: "Tier-1 firm formality, 'esteemed'.",
  },
} as const;

type RecipientType = keyof typeof RECIPIENT_TYPES;

function buildTypeBlock(type: RecipientType): string {
  const t = RECIPIENT_TYPES[type];
  return `RECIPIENT TYPE: ${t.label}
- Length: ${t.length}
- Tone: ${t.tone}
- Salutation: ${t.salutation}
- Sign-off: ${t.signoff}
- Must include: ${t.must}
- Must avoid: ${t.avoid}`;
}

// =====================================================================
// Blocklists (knowledge base §A9 + §A10)
// =====================================================================
const AI_TELL_PHRASES = [
  "i hope this email finds you well", "i am writing to express my keen interest",
  "i am writing to express my strong interest", "i am thrilled to apply",
  "i am excited to apply", "i would welcome the opportunity to discuss my candidacy",
  "delve into", "delve deeper", "rich tapestry", "navigate the complexities",
  "navigate the complex", "leverage my", "leveraging my", "ever-evolving landscape",
  "ever-changing landscape", "the legal landscape", "in today's dynamic",
  "embark on this journey", "unlock my potential", "pivotal role", "spearhead",
  "synergy", "synergistic", "holistic approach", "results-driven",
  "deeply passionate", "cutting-edge", "innovative approach",
  "commitment to excellence", "proven track record", "wealth of experience",
  "nuanced understanding", "foster meaningful relationships",
  "i am a highly motivated", "dynamic law student",
];
const INDIANISM_PHRASES = [
  "kindly do the needful", "do the needful", "please revert", "revert back",
  "reply back", "return back", "esteemed", "prestigious", "reputed firm",
  "reputed organization", "reputed organisation", "valued organisation",
  "celebrated firm", "myself ", "passed out from", "good in studies",
  "for your kind perusal", "same is attached", "vide your advertisement",
  "hereinabove", "aforementioned position", "said firm", "for the same",
  "herewith", "out of station", "cousin brother", "real sister",
  "senior most", "would be a golden opportunity", "no less than a golden",
];
const NON_NLU_APOLOGETIC = [
  "despite being from", "despite my college", "although i am from",
  "even though i am not from", "non-nlu", "tier-2 college", "tier 2 college",
  "tier-3 college", "small college", "not as renowned",
  "i know i am not from", "i am from a tier",
];
const AMERICAN_SPELLINGS: Array<[string, string]> = [
  ["organization", "organisation"], ["organize", "organise"],
  ["organized", "organised"], ["organizing", "organising"],
  ["specialize", "specialise"], ["specialized", "specialised"],
  ["realize", "realise"], ["realized", "realised"],
  ["recognize", "recognise"], ["analyze", "analyse"],
  ["customize", "customise"], ["optimization", "optimisation"],
  ["color", "colour"], ["honor", "honour"], ["favor", "favour"],
  ["behavior", "behaviour"], ["center", "centre"], ["program ", "programme "],
];

interface ValidationResult {
  ok: boolean;
  hits: string[];
}

function validateDraft(body: string): ValidationResult {
  const hits: string[] = [];
  const lower = body.toLowerCase();

  for (const p of AI_TELL_PHRASES) if (lower.includes(p)) hits.push(`AI tell: "${p}"`);
  for (const p of INDIANISM_PHRASES) if (lower.includes(p)) hits.push(`Indianism: "${p.trim()}"`);
  for (const p of NON_NLU_APOLOGETIC) if (lower.includes(p)) hits.push(`Apologetic phrasing: "${p}"`);
  for (const [us, uk] of AMERICAN_SPELLINGS) {
    if (lower.includes(us)) hits.push(`American spelling "${us.trim()}" — use "${uk.trim()}"`);
  }

  // Em-dash count: max 1 per letter
  const emDashCount = (body.match(/—/g) || []).length;
  if (emDashCount > 1) hits.push(`Too many em-dashes (${emDashCount}); use at most 1`);

  // Adjective tricolons (e.g. "passionate, dedicated, and detail-oriented")
  if (/\b\w+,\s+\w+,\s+and\s+\w+\b/i.test(body)) {
    // only flag if all three words look like adjectives (heuristic: end in -ed, -ive, -ic, -al, -ous, -ent, -ant, -ful)
    const m = body.match(/\b(\w+),\s+(\w+),\s+and\s+(\w+)\b/i);
    if (m) {
      const adjLike = (w: string) => /(?:ed|ive|ic|al|ous|ent|ant|ful|ing)$/i.test(w);
      if (adjLike(m[1]) && adjLike(m[2]) && adjLike(m[3])) {
        hits.push(`Adjective tricolon: "${m[0]}"`);
      }
    }
  }

  // Paragraph length variance (3+ paragraphs, stdev <8)
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 3) {
    const counts = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdev = Math.sqrt(counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length);
    if (stdev < 6 && counts.every((c) => c > 30)) {
      hits.push(`Paragraphs too uniform (stdev ${stdev.toFixed(1)}); vary length`);
    }
  }

  return { ok: hits.length === 0, hits };
}

// =====================================================================
// Prompts
// =====================================================================
const BASE_RULES = `You draft a single Indian legal internship application email — SUBJECT and BODY — that reads as if a real Indian law student wrote it on a phone, not as if generated by AI.

HARD RULES (these are zero-tolerance):
1. Output only via the draft_email tool. Never use placeholders like [Your Name], [Firm Name], [Date], [Insert X]. If a fact is missing, omit that sentence entirely.
2. British English ONLY: organisation, favour, honour, programme, analyse, recognise, specialise, defence. Never American spelling — it is now itself an AI tell.
3. No emojis. No exclamation marks. Maximum ONE em-dash in the entire email. Vary sentence length aggressively.
4. Do NOT invent credentials, deals, case names, partner names, marks, ranks, awards, or experience the sender did not provide. Indian recruiters check; fabrication is career-ending.
5. Sign off with the sender's display name on its own line. If display_name is missing, end with the sign-off line and nothing more.
6. Mention that the CV is attached in the closing paragraph (not in formal portal mode).
7. Mention sender's CGPA ONLY if it is provided AND ≥7.0/10, and ALWAYS write the scale ("CGPA 8.1/10", never just "8.1").
8. The first sentence must carry information — name, year, college, exact dates, office, and the ask. No throat-clearing openers.
9. Reference at least ONE specific thing about the target (their practice area, sector, city, a recent matter, or their stated legal needs). If the target data has nothing specific, use a source-led opener ("I came across your firm's [practice/work] and am writing to apply…") rather than inventing.

ABSOLUTELY DO NOT WRITE these phrases (they are recruiter-flagged ChatGPT/template tells):
- "I hope this email finds you well", "I am writing to express my keen/strong interest", "I am thrilled/excited to apply", "I would welcome the opportunity to discuss my candidacy"
- delve, delve into, rich tapestry, navigate the complexities, leverage, leveraging, ever-evolving landscape, embark on this journey, unlock my potential, pivotal, spearhead, synergy, holistic, results-driven, cutting-edge, commitment to excellence, proven track record, wealth of experience, nuanced understanding
- "esteemed", "prestigious", "reputed", "valued", "celebrated" (just use the firm's name)
- "kindly do the needful", "please revert", "revert back", "for your kind perusal", "same is attached", "Myself [Name]", "passed out from"
- Adjective tricolons like "passionate, dedicated, and detail-oriented"
- More than one em-dash

USING THE BRIEF (when present):
- brief.fit_reason: weave into the opening hook concretely; do NOT quote the label verbatim.
- brief.availability + brief.duration: weave into the closing ("I am available for a [duration] internship during [availability]").
- brief.work_mode: only mention if "remote" or "hybrid"; otherwise omit.
- brief.signature_line: this is the ONE thing the sender wants remembered. Place as the strongest sentence in the middle paragraph. PARAPHRASE; never quote verbatim.
- brief.highlights: weave into the middle paragraph as natural prose, NEVER as a bulleted list. Lead with whichever overlaps most with the target's practice/sector. Merge similar items.
- If the brief is empty, fall back to SENDER fields only.

TONE OPTIONS:
- formal (default): traditional, professional. Use the salutation specified by the recipient type.
- warm: still professional, slightly more personable.
- concise: shorter (within the recipient-type minimum), bullet-tight prose, prioritise clarity.

SUBJECT LINE: Indian convention is "Internship Application – [Month YYYY] – [Practice/Office]" when those facts exist. If only the role and sender name are known, use "Internship Application – [Sender Name], [Year]". Maximum 60 characters. No clickbait.`;

const NON_NLU_OVERLAY = `

NON-NLU OVERLAY (sender is not from a top NLU — apply silently):
- NEVER write "despite", "although", "even though", "non-NLU", "tier-2", "tier-3", "small college", "not as renowned". These phrases prime the reader to think about pedigree they would not otherwise notice.
- The college appears EXACTLY ONCE, factually, in the first sentence ("I am [Name], a [Year]-year B.A. LL.B. (Hons.) student at [College]") and is never referenced again.
- The first sentence after the ask must reference a verifiable achievement (publication, moot, named internship, quantified work) — not the college.
- Quantify everything where data exists. Replace vague effort with numbers.
- Never apologise for, justify, or contextualise the college.`;

const FOLLOWUP_SYSTEM_PROMPT = `You draft a SHORT, polite follow-up email from an Indian law student who already sent an application a few days ago and has not heard back.

You will receive: TARGET (firm), SENDER (student), and ORIGINAL (when they wrote and the role).

HARD RULES:
- Output only via the draft_email tool. Never use placeholders.
- Body length: 60–90 words. Three short sentences plus salutation and sign-off.
- British English only.
- No emojis. No exclamation marks. No "I hope this email finds you well." No "Just following up". No "Per my last email". No "kindly do the needful".
- Sentence 1: gently reference that the sender wrote on <original.applied_on> regarding the <original.role> position.
- Sentence 2: briefly reiterate genuine interest (one specific reason — sector/practice/city).
- Sentence 3: offer additional materials (writing samples, transcripts) and thank them for their time.
- Salutation: "Dear [Target Short Name] Team," or "Dear Hiring Team,".
- Sign off with the sender's display name. If missing, end with "Warm regards,".
- Subject: 5–8 words, e.g. "Following up — Internship Application" or "Following up on my application".
- Do NOT re-pitch the CV. Do NOT repeat the original email. Do NOT mention attaching the CV again.

Always output via the draft_email tool.`;

// =====================================================================
// Types & validation
// =====================================================================
interface Internship {
  firm_name: string; role: string;
  start_date: string | null; end_date: string | null;
  description: string | null;
}
interface BriefHighlight { kind: string; label: string; detail?: string | null; }
interface Brief {
  fit_reason?: string | null; availability?: string | null;
  duration?: string | null; signature_line?: string | null;
  work_mode?: string | null; highlights?: BriefHighlight[];
}
interface Body {
  target: {
    name: string; kind: "firm" | "startup";
    type?: string | null; city?: string | null; sector?: string | null;
    practice_areas?: string | null; legal_needs?: string | null;
  };
  role: string;
  tone: "formal" | "warm" | "concise";
  recipient_type: RecipientType;
  brief?: Brief | null;
  mode?: "initial" | "followup";
  original?: { applied_on: string; role: string } | null;
  rewrite_notes?: string | null;
  current_draft?: { subject: string; body: string } | null;
  user: {
    display_name: string | null; college: string | null;
    degree: string | null; graduation_year: number | null;
    cgpa: number | null; is_nlu: boolean; bio: string | null;
    subjects_of_interest: string[]; internships: Internship[]; has_cv: boolean;
  };
}

const ALLOWED_HIGHLIGHT_KINDS = new Set([
  "internship", "subject", "education", "moot", "publication", "cgpa", "bio",
]);

function sanitizeBrief(b: any): Brief | null {
  if (!b || typeof b !== "object") return null;
  const out: Brief = {};
  if (typeof b.fit_reason === "string" && b.fit_reason.trim()) out.fit_reason = b.fit_reason.trim().slice(0, 120);
  if (typeof b.availability === "string" && b.availability.trim()) out.availability = b.availability.trim().slice(0, 120);
  if (typeof b.duration === "string" && b.duration.trim()) out.duration = b.duration.trim().slice(0, 60);
  if (typeof b.signature_line === "string" && b.signature_line.trim()) out.signature_line = b.signature_line.trim().slice(0, 200);
  if (typeof b.work_mode === "string" && b.work_mode.trim()) out.work_mode = b.work_mode.trim().slice(0, 30);
  if (Array.isArray(b.highlights)) {
    out.highlights = b.highlights
      .filter((h: any) => h && typeof h === "object" && ALLOWED_HIGHLIGHT_KINDS.has(h.kind) && typeof h.label === "string")
      .slice(0, 4)
      .map((h: any) => ({
        kind: String(h.kind), label: String(h.label).slice(0, 120),
        detail: h.detail ? String(h.detail).slice(0, 200) : null,
      }));
  }
  if (!out.fit_reason && !out.availability && !out.duration && !out.signature_line && !out.work_mode && !(out.highlights && out.highlights.length)) return null;
  return out;
}

function isRecipientType(s: any): s is RecipientType {
  return typeof s === "string" && s in RECIPIENT_TYPES;
}

function validateBody(b: any): { ok: true; data: Body } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "invalid body" };
  if (!b.target || typeof b.target.name !== "string" || !b.target.name.trim())
    return { ok: false, error: "target.name required" };
  if (b.target.kind !== "firm" && b.target.kind !== "startup")
    return { ok: false, error: "target.kind must be firm|startup" };
  if (typeof b.role !== "string" || !b.role.trim()) return { ok: false, error: "role required" };
  const tone = b.tone === "warm" || b.tone === "concise" ? b.tone : "formal";
  if (!b.user || typeof b.user !== "object") return { ok: false, error: "user required" };
  const recipient_type: RecipientType = isRecipientType(b.recipient_type)
    ? b.recipient_type
    : (b.target.kind === "startup" ? "inhouse_corporate" : "tier2_firm");
  return {
    ok: true,
    data: {
      target: {
        name: String(b.target.name).trim().slice(0, 200), kind: b.target.kind,
        type: b.target.type ? String(b.target.type).slice(0, 100) : null,
        city: b.target.city ? String(b.target.city).slice(0, 100) : null,
        sector: b.target.sector ? String(b.target.sector).slice(0, 200) : null,
        practice_areas: b.target.practice_areas ? String(b.target.practice_areas).slice(0, 300) : null,
        legal_needs: b.target.legal_needs ? String(b.target.legal_needs).slice(0, 300) : null,
      },
      role: String(b.role).trim().slice(0, 100),
      tone, recipient_type,
      brief: sanitizeBrief(b.brief),
      mode: b.mode === "followup" ? "followup" : "initial",
      original: b.original && typeof b.original === "object" && b.original.applied_on
        ? { applied_on: String(b.original.applied_on).slice(0, 30), role: String(b.original.role ?? "Legal Internship").slice(0, 100) }
        : null,
      rewrite_notes: typeof b.rewrite_notes === "string" && b.rewrite_notes.trim()
        ? b.rewrite_notes.trim().slice(0, 500) : null,
      current_draft: b.current_draft && typeof b.current_draft === "object"
        && typeof b.current_draft.subject === "string" && typeof b.current_draft.body === "string"
        && b.current_draft.body.trim()
        ? {
            subject: String(b.current_draft.subject).slice(0, 200),
            body: String(b.current_draft.body).slice(0, 4000),
          }
        : null,
      user: {
        display_name: b.user.display_name ? String(b.user.display_name).slice(0, 100) : null,
        college: b.user.college ? String(b.user.college).slice(0, 200) : null,
        degree: b.user.degree ? String(b.user.degree).slice(0, 50) : null,
        graduation_year: Number.isInteger(b.user.graduation_year) ? b.user.graduation_year : null,
        cgpa: typeof b.user.cgpa === "number" && b.user.cgpa > 0 ? Math.min(b.user.cgpa, 10) : null,
        is_nlu: Boolean(b.user.is_nlu),
        bio: b.user.bio ? String(b.user.bio).slice(0, 400) : null,
        subjects_of_interest: Array.isArray(b.user.subjects_of_interest)
          ? b.user.subjects_of_interest.filter((s: any) => typeof s === "string").slice(0, 10) : [],
        internships: Array.isArray(b.user.internships)
          ? b.user.internships.slice(0, 3).map((i: any) => ({
              firm_name: String(i.firm_name ?? "").slice(0, 200),
              role: String(i.role ?? "").slice(0, 100),
              start_date: i.start_date ?? null, end_date: i.end_date ?? null,
              description: i.description ? String(i.description).slice(0, 300) : null,
            })) : [],
        has_cv: Boolean(b.user.has_cv),
      },
    },
  };
}

// =====================================================================
// AI call
// =====================================================================
async function invokeAi(messages: Array<{ role: string; content: string }>): Promise<{ subject: string; body: string } | { error: string; status: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { error: "LOVABLE_API_KEY not configured", status: 500 };

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [{
        type: "function",
        function: {
          name: "draft_email",
          description: "Return the drafted application email.",
          parameters: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Subject line, max 60 chars, no placeholders." },
              body: { type: "string", description: "Full email body, salutation through signature, no placeholders." },
            },
            required: ["subject", "body"], additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "draft_email" } },
    }),
  });

  if (!aiResp.ok) {
    if (aiResp.status === 429) return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
    if (aiResp.status === 402) return { error: "AI credits exhausted. Please add credits to continue.", status: 402 };
    const t = await aiResp.text();
    console.error("AI gateway error", aiResp.status, t);
    return { error: "AI gateway error", status: 500 };
  }

  const data = await aiResp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return { error: "AI returned no draft. Please retry.", status: 500 };
  let parsed: { subject?: string; body?: string };
  try { parsed = JSON.parse(toolCall.function.arguments); }
  catch { return { error: "AI returned malformed draft. Please retry.", status: 500 }; }
  if (!parsed.subject?.trim() || !parsed.body?.trim()) return { error: "AI returned empty draft. Please retry.", status: 500 };
  return { subject: parsed.subject.trim(), body: parsed.body.trim() };
}

// =====================================================================
// Handler
// =====================================================================
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

    const raw = await req.json().catch(() => null);
    const v = validateBody(raw);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFollowup = v.data.mode === "followup";

    const briefBlock = v.data.brief && !isFollowup
      ? `\n\nBRIEF (sender's guided answers — prioritise these):\n${JSON.stringify(v.data.brief, null, 2)}`
      : "";
    const originalBlock = isFollowup && v.data.original
      ? `\n\nORIGINAL APPLICATION:\n${JSON.stringify(v.data.original, null, 2)}` : "";

    const senderForPrompt = {
      ...v.data.user,
      // Strip CGPA below threshold so the model can't cite it.
      cgpa: v.data.user.cgpa && v.data.user.cgpa >= 7.0 ? `${v.data.user.cgpa.toFixed(2)}/10` : null,
    };

    const rewriteBlock = !isFollowup && v.data.current_draft
      ? `\n\nREWRITE MODE — the sender has an existing draft and wants it changed.

CURRENT DRAFT (rewrite this — do NOT just lightly edit it):
SUBJECT: ${v.data.current_draft.subject}
BODY:
${v.data.current_draft.body}
${v.data.rewrite_notes ? `\nSENDER'S REWRITE INSTRUCTIONS (apply these strongly, they override generic defaults):\n"""${v.data.rewrite_notes}"""\n` : ""}
REWRITE RULES:
- Treat the sender's instructions as the highest-priority signal. If they ask to add a fact, that fact MUST appear concretely in the new draft.
- Keep only the verifiable facts (name, college, role, dates, the target's name). Drop generic filler.
- Change the OPENING SENTENCE — it must be structurally different from the current draft's opener.
- Vary paragraph structure and sentence rhythm noticeably from the current draft.
- The new draft must read as a meaningfully different email, not a cosmetic edit.
- All HARD RULES, blocklists and recipient-type rules above still apply.`
      : "";

    const userPrompt = isFollowup
      ? `TARGET:\n${JSON.stringify(v.data.target, null, 2)}\n\nSENDER:\n${JSON.stringify(
          { display_name: v.data.user.display_name, college: v.data.user.college, degree: v.data.user.degree }, null, 2,
        )}${originalBlock}\n\nDraft the SHORT follow-up email now via the draft_email tool.`
      : `${buildTypeBlock(v.data.recipient_type)}\n\nTARGET:\n${JSON.stringify(v.data.target, null, 2)}\n\nSENDER:\n${JSON.stringify(senderForPrompt, null, 2)}\n\nROLE: ${v.data.role}\nTONE: ${v.data.tone}${briefBlock}${rewriteBlock}\n\nDraft the email now via the draft_email tool.`;

    const activeSystemPrompt = isFollowup
      ? FOLLOWUP_SYSTEM_PROMPT
      : (v.data.user.is_nlu ? BASE_RULES : BASE_RULES + NON_NLU_OVERLAY);

    const messages = [
      { role: "system", content: activeSystemPrompt },
      { role: "user", content: userPrompt },
    ];

    let result = await invokeAi(messages);
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const warnings: string[] = [];

    if (!isFollowup) {
      const check = validateDraft(result.body);
      if (!check.ok) {
        console.log("[draft-application-email] first-pass validator hits:", check.hits);
        // Auto-retry once with feedback.
        const retryMessages = [
          ...messages,
          {
            role: "assistant",
            content: JSON.stringify({ subject: result.subject, body: result.body }),
          },
          {
            role: "user",
            content:
              `Your previous draft contained the following violations of the hard rules:\n- ${check.hits.join("\n- ")}\n\nRewrite the entire email from scratch. Keep the same recipient type, structure, tone, and facts, but eliminate every flagged phrase or pattern. Use natural human variation in sentence length. Reply only via the draft_email tool.`,
          },
        ];
        const retry = await invokeAi(retryMessages);
        if (!("error" in retry)) {
          const recheck = validateDraft(retry.body);
          result = retry;
          if (!recheck.ok) {
            warnings.push(`Style check noticed: ${recheck.hits.slice(0, 3).join("; ")}. Skim the draft before sending.`);
            console.log("[draft-application-email] second-pass still has hits:", recheck.hits);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        subject: result.subject.slice(0, 200),
        body: result.body.slice(0, 4000),
        warnings: warnings.length ? warnings : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("draft-application-email error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
