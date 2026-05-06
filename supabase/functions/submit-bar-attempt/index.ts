// submit-bar-attempt
//
// Grades all 8 question types. For Ethics + Client Counseling, after
// deterministic grading runs, the function calls the Lovable AI Gateway to
// produce a reasoning rubric (0-100). is_correct = deterministic AND rubric
// >= reasoning_threshold (default 60). Final points blend the two.
//
// MANUAL TEST CASES:
// 1. MCQ correct → 200, is_correct true.
// 2. Document Review with all flags right → is_correct true, breakdown returned.
// 3. Brief Builder with one wrong step → is_correct false, step_results returned.
// 4. Ethics with both stages right but rubric < threshold → is_correct false.
// 5. Client Counseling with 4/5 right (≥80%) and rubric pass → is_correct true.
// 6. AI gateway 429 → still returns 200 with rubric_score=null and a soft note.
// 7. Already attempted → 409.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// SCHEMAS — mirror src/lib/bar/types.ts
// =============================================================================

type QType =
  | "mcq"
  | "issue_spotter"
  | "speed_round"
  | "jurisdiction"
  | "document_review"
  | "brief_builder"
  | "ethics"
  | "client_counseling";

const McqPayloadSchema = z.object({
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(6),
  correct_option_id: z.string().min(1),
});
const McqAnswerSchema = z.object({ selected_option_id: z.string().min(1) });

const IssueSpotterPayloadSchema = z.object({
  issue_options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(3).max(10),
  correct_issue_ids: z.array(z.string().min(1)).min(1),
});
const IssueSpotterAnswerSchema = z.object({ selected_issue_ids: z.array(z.string().min(1)) });

const SpeedRoundPayloadSchema = z.object({
  questions: z.array(z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    answer: z.string().min(1),
    aliases: z.array(z.string().min(1)).max(10).optional(),
  })).min(5).max(15),
  time_limit_seconds: z.number().int().min(30).max(300),
});
const SpeedRoundAnswerSchema = z.object({
  answers: z.array(z.object({ question_id: z.string().min(1), submitted: z.string() })),
});

const JurisdictionPayloadSchema = z.object({
  options: z.array(z.object({ id: z.string().min(1), jurisdiction: z.string().min(1), reasoning: z.string().min(1) })).min(2).max(5),
  correct_option_id: z.string().min(1),
});
const JurisdictionAnswerSchema = z.object({ selected_option_id: z.string().min(1) });

// Document Review
const DocumentReviewPayloadSchema = z.object({
  document_html: z.string().min(1),
  spans: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2).max(20),
  categories: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(1).max(8),
  correct_flags: z.array(z.object({ span_id: z.string().min(1), category_id: z.string().min(1) })).min(1),
});
const DocumentReviewAnswerSchema = z.object({
  flagged: z.array(z.object({ span_id: z.string().min(1), category_id: z.string().min(1) })),
});

// Brief Builder
const BriefMcqOptionSchema = z.object({
  id: z.string().min(1),
  letter: z.string().min(1).max(2),
  title: z.string().min(1),
  desc: z.string().optional().default(""),
  meta: z.string().optional().default(""),
});
const BriefBlockSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
const BriefStepSchema = z.object({
  kind: z.enum(["mcq", "order"]),
  label: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(BriefMcqOptionSchema).optional(),
  correct_option_id: z.string().optional(),
  blocks: z.array(BriefBlockSchema).optional(),
  correct_order: z.array(z.string().min(1)).optional(),
});
const BriefBuilderPayloadSchema = z.object({
  fact_pattern: z.string().min(1),
  citation: z.string().optional().default(""),
  steps: z.array(BriefStepSchema).min(2).max(6),
});
const BriefBuilderAnswerSchema = z.object({
  step_answers: z.array(z.object({
    step_index: z.number().int().min(0),
    selected_option_id: z.string().optional(),
    ordered_block_ids: z.array(z.string().min(1)).optional(),
  })),
});

// Ethics
const EthicsOptionSchema = z.object({
  id: z.string().min(1),
  letter: z.string().min(1).max(2),
  text: z.string().min(1),
});
const EthicsPayloadSchema = z.object({
  scenario: z.string().min(1),
  decision_options: z.array(EthicsOptionSchema).min(2).max(6),
  correct_decision_id: z.string().min(1),
  consequence_text: z.string().min(1),
  followup_options: z.array(EthicsOptionSchema).min(2).max(6),
  correct_followup_id: z.string().min(1),
  model_reasoning: z.string().min(1),
});
const EthicsAnswerSchema = z.object({
  selected_decision_id: z.string().min(1),
  selected_followup_id: z.string().min(1),
});

// Client Counseling
const CounselingPayloadSchema = z.object({
  matter: z.string().min(1),
  transcript: z.array(z.object({
    turn: z.number().int().min(1),
    role: z.enum(["client", "lawyer"]),
    text: z.string().min(1),
  })).min(1).max(20),
  decision_turns: z.array(z.object({
    turn: z.number().int().min(1),
    prompt: z.string().min(1),
    options: z.array(EthicsOptionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
    model_followup: z.string().optional().default(""),
  })).min(1).max(10),
});
const CounselingAnswerSchema = z.object({
  turn_picks: z.array(z.object({
    turn: z.number().int().min(1),
    selected_option_id: z.string().min(1),
    followup_text: z.string().optional().default(""),
  })),
});

class GradingError extends Error {}

// =============================================================================
// DETERMINISTIC GRADERS
// =============================================================================

function gradeMcq(p: z.infer<typeof McqPayloadSchema>, a: z.infer<typeof McqAnswerSchema>, points: number) {
  const ok = a.selected_option_id === p.correct_option_id;
  return { is_correct: ok, points_awarded: ok ? points : 0 };
}
function gradeIssueSpotter(p: z.infer<typeof IssueSpotterPayloadSchema>, a: z.infer<typeof IssueSpotterAnswerSchema>, points: number) {
  const sub = new Set(a.selected_issue_ids);
  const correct = new Set(p.correct_issue_ids);
  const exact = sub.size === correct.size && [...sub].every((id) => correct.has(id));
  return { is_correct: exact, points_awarded: exact ? points : 0 };
}
const SPEED_WORD_TO_NUM: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16",
  seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70",
  eighty: "80", ninety: "90",
  first: "1", second: "2", third: "3", fifth: "5", eighth: "8", ninth: "9",
  twelfth: "12",
};
const SPEED_ROMAN_TO_NUM: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8",
  ix: "9", x: "10", xi: "11", xii: "12",
};
const SPEED_FILLER_PREFIXES = [
  "article", "art.", "art",
  "section", "sec.", "sec", "s.",
  "schedule", "sch.", "sch",
  "clause", "cl.", "cl",
  "part", "chapter", "chap.", "chap",
];
const SPEED_STOP_WORDS = new Set(["the", "of", "a", "an"]);

const SPEED_CANONICAL_FILLERS = ["article", "section", "schedule", "clause", "chapter"];

function normalizeSpeedAnswer(raw: string): string {
  let s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/[\u2013\u2014]/g, "-").replace(/\u00a0/g, " ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  let stripped = false;
  for (const f of SPEED_FILLER_PREFIXES) {
    if (s === f) { s = ""; stripped = true; break; }
    if (s.startsWith(f + " ") || s.startsWith(f + ".")) {
      s = s.slice(f.length).trimStart().replace(/^\.\s*/, "");
      stripped = true;
      break;
    }
  }
  if (!stripped) {
    const spaceIdx = s.indexOf(" ");
    const firstTok = spaceIdx === -1 ? s : s.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? "" : s.slice(spaceIdx + 1);
    if (firstTok.length >= 4) {
      for (const canonical of SPEED_CANONICAL_FILLERS) {
        const dist = speedEditDistance(firstTok, canonical);
        if (dist > 0 && dist <= speedAllowedEdits(Math.max(firstTok.length, canonical.length))) {
          s = rest.trimStart();
          break;
        }
      }
    }
  }

  s = s.replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1");
  s = s.replace(/[.,;:!?'"()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
  if (SPEED_WORD_TO_NUM[s]) return SPEED_WORD_TO_NUM[s];
  if (SPEED_ROMAN_TO_NUM[s]) return SPEED_ROMAN_TO_NUM[s];
  const mapped = s.split(" ")
    .map((tok) => SPEED_WORD_TO_NUM[tok] ?? SPEED_ROMAN_TO_NUM[tok] ?? tok)
    .filter((tok) => tok.length > 0 && !SPEED_STOP_WORDS.has(tok));
  return mapped.length > 0 ? mapped.join(" ") : s;
}

function speedEditDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}
function speedAllowedEdits(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 10) return 2;
  return 3;
}
function speedFuzzyEquals(submitted: string, expected: string): boolean {
  if (submitted === expected) return true;
  if (!submitted || !expected) return false;
  const subTokens = submitted.split(" ");
  const expTokens = expected.split(" ");
  if (subTokens.length !== expTokens.length) {
    return speedEditDistance(submitted, expected) <= speedAllowedEdits(Math.max(submitted.length, expected.length));
  }
  for (let i = 0; i < subTokens.length; i++) {
    const s = subTokens[i], e = expTokens[i];
    if (s === e) continue;
    if (speedEditDistance(s, e) > speedAllowedEdits(Math.max(s.length, e.length))) return false;
  }
  return true;
}

function speedMetaphone(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  let s = w
    .replace(/^x/, "s")
    .replace(/^kn|^gn|^pn|^ae|^wr/, (m) => m[1])
    .replace(/^wh/, "w");
  let out = "";
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const c = s[i];
    const prev = s[i - 1] ?? "";
    const next = s[i + 1] ?? "";
    const next2 = s[i + 2] ?? "";
    if (c === prev && c !== "c") continue;
    switch (c) {
      case "a": case "e": case "i": case "o": case "u":
        if (i === 0) out += c.toUpperCase();
        break;
      case "b":
        if (!(i === len - 1 && prev === "m")) out += "B";
        break;
      case "c":
        if (next === "i" && next2 === "a") out += "X";
        else if (next === "h") { out += "X"; i++; }
        else if (next === "i" || next === "e" || next === "y") out += "S";
        else out += "K";
        break;
      case "d":
        if (next === "g" && (next2 === "e" || next2 === "i" || next2 === "y")) { out += "J"; i++; }
        else out += "T";
        break;
      case "g":
        if (next === "h") {
          if (i + 2 >= len || /[^aeiou]/.test(next2)) { /* silent */ }
          else { out += "F"; i++; }
        } else if (next === "n") { /* silent */ }
        else if (next === "e" || next === "i" || next === "y") out += "J";
        else out += "K";
        break;
      case "h":
        if (i > 0 && /[aeiou]/.test(prev) && !/[aeiou]/.test(next)) { /* silent */ }
        else out += "H";
        break;
      case "k":
        if (prev !== "c") out += "K";
        break;
      case "p":
        if (next === "h") { out += "F"; i++; }
        else out += "P";
        break;
      case "q": out += "K"; break;
      case "s":
        if (next === "h") { out += "X"; i++; }
        else if (next === "i" && (next2 === "o" || next2 === "a")) out += "X";
        else out += "S";
        break;
      case "t":
        if (next === "h") { out += "0"; i++; }
        else if (next === "i" && (next2 === "o" || next2 === "a")) out += "X";
        else out += "T";
        break;
      case "v": out += "F"; break;
      case "w": case "y":
        if (/[aeiou]/.test(next)) out += c.toUpperCase();
        break;
      case "x": out += "KS"; break;
      case "z": out += "S"; break;
      case "f": case "j": case "l": case "m": case "n": case "r":
        out += c.toUpperCase();
        break;
    }
  }
  return out;
}

function speedPhoneticEquals(submitted: string, expected: string): boolean {
  if (!submitted || !expected) return false;
  const subTokens = submitted.split(" ");
  const expTokens = expected.split(" ");
  if (subTokens.length !== expTokens.length) return false;
  for (let i = 0; i < subTokens.length; i++) {
    const s = subTokens[i], e = expTokens[i];
    if (s === e) continue;
    if (s.length < 5 || e.length < 5 || /^\d+$/.test(s) || /^\d+$/.test(e)) return false;
    const ms = speedMetaphone(s), me = speedMetaphone(e);
    if (!ms || !me || ms !== me) return false;
  }
  return true;
}

function speedMatchesAnyCandidate(submittedRaw: string, answer: string, aliases?: string[]): boolean {
  const sub = normalizeSpeedAnswer(submittedRaw);
  if (!sub) return false;
  const candidates = [answer, ...(aliases ?? [])];
  for (const candidate of candidates) {
    const norm = normalizeSpeedAnswer(candidate);
    if (!norm) continue;
    if (sub === norm) return true;
    if (speedFuzzyEquals(sub, norm)) return true;
    if (speedPhoneticEquals(sub, norm)) return true;
  }
  return false;
}

function gradeSpeedRound(p: z.infer<typeof SpeedRoundPayloadSchema>, a: z.infer<typeof SpeedRoundAnswerSchema>, points: number) {
  const total = p.questions.length;
  if (total === 0) return { is_correct: false, points_awarded: 0, per_question: [] as Array<{ id: string; prompt: string; submitted: string; correct: string; got_right: boolean }> };
  const map = new Map(a.answers.map((x) => [x.question_id, x.submitted]));
  let count = 0;
  const per_question: Array<{ id: string; prompt: string; submitted: string; correct: string; got_right: boolean }> = [];
  for (const q of p.questions) {
    const submittedRaw = map.get(q.id) ?? "";
    const got_right = speedMatchesAnyCandidate(submittedRaw, q.answer, q.aliases);
    if (got_right) count++;
    per_question.push({ id: q.id, prompt: q.prompt, submitted: submittedRaw, correct: q.answer, got_right });
  }
  const ratio = count / total;
  return { is_correct: ratio >= 0.7, points_awarded: Math.floor(ratio * points), per_question };
}
function gradeJurisdiction(p: z.infer<typeof JurisdictionPayloadSchema>, a: z.infer<typeof JurisdictionAnswerSchema>, points: number) {
  const ok = a.selected_option_id === p.correct_option_id;
  return { is_correct: ok, points_awarded: ok ? points : 0 };
}

interface DocReviewBreakdown {
  correct_hits: number;
  missed: number;
  false_flags: number;
  total_correct: number;
}
function gradeDocumentReview(
  p: z.infer<typeof DocumentReviewPayloadSchema>,
  a: z.infer<typeof DocumentReviewAnswerSchema>,
  points: number,
): { is_correct: boolean; points_awarded: number; breakdown: DocReviewBreakdown } {
  const correctMap = new Map<string, string>();
  for (const f of p.correct_flags) correctMap.set(f.span_id, f.category_id);
  let correctHits = 0;
  let falseFlags = 0;
  const seen = new Set<string>();
  for (const f of a.flagged) {
    if (seen.has(f.span_id)) continue;
    seen.add(f.span_id);
    const expected = correctMap.get(f.span_id);
    if (expected && expected === f.category_id) correctHits++;
    else if (!expected) falseFlags++;
  }
  const totalCorrect = p.correct_flags.length;
  const missed = totalCorrect - correctHits;
  const raw = correctHits - falseFlags;
  const ratio = totalCorrect === 0 ? 0 : Math.max(0, raw) / totalCorrect;
  const pointsAwarded = Math.max(0, Math.floor(ratio * points));
  const isCorrect = correctHits === totalCorrect && falseFlags === 0;
  return { is_correct: isCorrect, points_awarded: pointsAwarded, breakdown: { correct_hits: correctHits, missed, false_flags: falseFlags, total_correct: totalCorrect } };
}

interface BriefStepResult { step_index: number; is_correct: boolean; points_ratio: number }
function orderingScore(submitted: string[], expected: string[]): number {
  const n = expected.length;
  if (n <= 1) return submitted.length === n ? 1 : 0;
  const idx = new Map<string, number>();
  expected.forEach((id, i) => idx.set(id, i));
  const filtered = submitted.filter((id) => idx.has(id));
  if (filtered.length === 0) return 0;
  let inv = 0;
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      if (idx.get(filtered[i])! > idx.get(filtered[j])!) inv++;
    }
  }
  const maxInv = (n * (n - 1)) / 2;
  return Math.max(0, 1 - inv / maxInv);
}
function gradeBriefBuilder(
  p: z.infer<typeof BriefBuilderPayloadSchema>,
  a: z.infer<typeof BriefBuilderAnswerSchema>,
  points: number,
  config: { partial_order_credit?: boolean },
): { is_correct: boolean; points_awarded: number; step_results: BriefStepResult[] } {
  const stepCount = p.steps.length;
  const perStep = points / stepCount;
  const map = new Map(a.step_answers.map((x) => [x.step_index, x]));
  const partial = !!config.partial_order_credit;
  const results: BriefStepResult[] = [];
  let total = 0;
  let allOk = true;
  p.steps.forEach((step, i) => {
    const ans = map.get(i);
    let ratio = 0;
    let stepOk = false;
    if (step.kind === "mcq") {
      if (ans?.selected_option_id && ans.selected_option_id === step.correct_option_id) {
        ratio = 1; stepOk = true;
      }
    } else if (step.kind === "order") {
      const sub = ans?.ordered_block_ids ?? [];
      const exp = step.correct_order ?? [];
      const exact = sub.length === exp.length && sub.every((id, j) => id === exp[j]);
      if (exact) { ratio = 1; stepOk = true; }
      else if (partial) ratio = orderingScore(sub, exp);
    }
    if (!stepOk) allOk = false;
    total += ratio * perStep;
    results.push({ step_index: i, is_correct: stepOk, points_ratio: ratio });
  });
  return { is_correct: allOk, points_awarded: Math.max(0, Math.floor(total)), step_results: results };
}

function gradeEthics(p: z.infer<typeof EthicsPayloadSchema>, a: z.infer<typeof EthicsAnswerSchema>, points: number) {
  const s1 = a.selected_decision_id === p.correct_decision_id;
  const s2 = a.selected_followup_id === p.correct_followup_id;
  const both = s1 && s2;
  const pts = both ? points : s1 ? Math.floor(points * 0.5) : 0;
  return { is_correct: both, points_awarded: pts, stage1_correct: s1, stage2_correct: s2 };
}

interface CounselingTurnResult { turn: number; is_correct: boolean }
function gradeCounseling(
  p: z.infer<typeof CounselingPayloadSchema>,
  a: z.infer<typeof CounselingAnswerSchema>,
  points: number,
): { is_correct: boolean; points_awarded: number; per_turn: CounselingTurnResult[] } {
  const correctByTurn = new Map<number, string>();
  for (const t of p.decision_turns) correctByTurn.set(t.turn, t.correct_option_id);
  const pickByTurn = new Map<number, string>();
  for (const x of a.turn_picks) pickByTurn.set(x.turn, x.selected_option_id);
  const per_turn: CounselingTurnResult[] = [];
  let count = 0;
  for (const t of p.decision_turns) {
    const ok = pickByTurn.get(t.turn) === correctByTurn.get(t.turn);
    if (ok) count++;
    per_turn.push({ turn: t.turn, is_correct: ok });
  }
  const total = p.decision_turns.length;
  const ratio = total === 0 ? 0 : count / total;
  return { is_correct: ratio >= 0.8, points_awarded: Math.floor(ratio * points), per_turn };
}

// =============================================================================
// AI RUBRIC (Ethics + Client Counseling)
// =============================================================================

interface RubricResult {
  rubric_score: number | null;
  strengths: string;
  weaknesses: string;
  per_turn_feedback?: { turn: number; note: string; ok: boolean }[];
  notice?: string;
}

async function callAiRubric(
  qtype: "ethics" | "client_counseling",
  challenge: any,
  answer: any,
  deterministic: any,
): Promise<RubricResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric unavailable." };
  }

  const systemPrompt = qtype === "ethics"
    ? "You are a senior Indian-law ethics examiner. Score the student's reasoning quality on a 0-100 rubric where 0=incoherent, 60=passing, 100=expert. Use the Indian Bar Council's professional-conduct rules as your anchor. Be terse."
    : "You are a senior client-counseling examiner. Score the student's interview judgment 0-100 (60=passing, 100=expert). Anchor to the Indian advocate-client framework. Be terse.";

  const userPrompt = JSON.stringify({
    challenge: {
      title: challenge.title,
      area: challenge.area_of_law,
      prompt: challenge.prompt,
      payload: challenge.payload,
      explanation: challenge.explanation,
    },
    submitted_answer: answer,
    deterministic_result: deterministic,
  });

  const tool = qtype === "ethics"
    ? {
        type: "function",
        function: {
          name: "score_ethics_attempt",
          description: "Score an ethics attempt with a numeric rubric and qualitative feedback.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              rubric_score: { type: "integer", minimum: 0, maximum: 100 },
              strengths: { type: "string" },
              weaknesses: { type: "string" },
            },
            required: ["rubric_score", "strengths", "weaknesses"],
          },
        },
      }
    : {
        type: "function",
        function: {
          name: "score_counseling_attempt",
          description: "Score a multi-turn counseling attempt with a numeric rubric and per-turn feedback.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              rubric_score: { type: "integer", minimum: 0, maximum: 100 },
              strengths: { type: "string" },
              weaknesses: { type: "string" },
              per_turn_feedback: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    turn: { type: "integer", minimum: 1 },
                    note: { type: "string" },
                    ok: { type: "boolean" },
                  },
                  required: ["turn", "note", "ok"],
                },
              },
            },
            required: ["rubric_score", "strengths", "weaknesses", "per_turn_feedback"],
          },
        },
      };

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric rate-limited; deterministic score used." };
      if (resp.status === 402) return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric out of credits; deterministic score used." };
      console.error("AI rubric failed", resp.status);
      return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric unavailable." };
    }
    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric returned no tool call." };
    }
    const parsed = JSON.parse(call.function.arguments);
    return {
      rubric_score: typeof parsed.rubric_score === "number" ? parsed.rubric_score : null,
      strengths: parsed.strengths ?? "",
      weaknesses: parsed.weaknesses ?? "",
      per_turn_feedback: parsed.per_turn_feedback,
    };
  } catch (e) {
    console.error("AI rubric error", e);
    return { rubric_score: null, strengths: "", weaknesses: "", notice: "AI rubric error; deterministic score used." };
  }
}

// =============================================================================
// HANDLER
// =============================================================================

const BodySchema = z.object({
  challenge_id: z.string().uuid(),
  submitted_answer: z.unknown(),
  time_taken_seconds: z.number().int().min(0).max(86400).optional(),
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return jsonResponse(400, { error: "invalid_body", details: parsed.error.flatten() });
    const { challenge_id, submitted_answer, time_taken_seconds } = parsed.data;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "unauthenticated" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse(401, { error: "unauthenticated" });
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: challenge, error: chErr } = await admin
      .from("bar_challenges")
      .select("id, status, question_type, payload, points_base, explanation, grading_config, title, area_of_law, prompt")
      .eq("id", challenge_id)
      .maybeSingle();
    if (chErr) return jsonResponse(500, { error: "db_error", retryable: true });
    if (!challenge) return jsonResponse(404, { error: "challenge_not_found" });
    if (challenge.status !== "approved") return jsonResponse(403, { error: "challenge_not_approved" });

    const { data: prior } = await admin
      .from("bar_attempts")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", challenge_id)
      .maybeSingle();
    if (prior) return jsonResponse(409, { error: "already_attempted" });

    const type = challenge.question_type as QType;
    const config = (challenge.grading_config ?? {}) as { reasoning_threshold?: number; partial_order_credit?: boolean };
    const reasoningThreshold = typeof config.reasoning_threshold === "number" ? config.reasoning_threshold : 60;

    let is_correct = false;
    let points_awarded = 0;
    let per_question: Array<{ id: string; prompt: string; submitted: string; correct: string; got_right: boolean }> | undefined;
    let breakdown: DocReviewBreakdown | undefined;
    let step_results: BriefStepResult[] | undefined;
    let correct_order: { step_index: number; ordered_block_ids: string[] }[] | undefined;
    let correct_flags: { span_id: string; category_id: string }[] | undefined;
    let stage1_correct: boolean | undefined;
    let stage2_correct: boolean | undefined;
    let counseling_per_turn: CounselingTurnResult[] | undefined;
    let rubric_score: number | null | undefined;
    let rubric_feedback: { strengths: string; weaknesses: string; notice?: string } | undefined;
    let per_turn_feedback: { turn: number; note: string; ok: boolean }[] | undefined;
    let correct_answer_summary = "";

    try {
      switch (type) {
        case "mcq": {
          const p = McqPayloadSchema.safeParse(challenge.payload);
          const a = McqAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid mcq payload");
          if (!a.success) throw new GradingError("invalid mcq answer");
          const r = gradeMcq(p.data, a.data, challenge.points_base);
          is_correct = r.is_correct; points_awarded = r.points_awarded;
          const opt = p.data.options.find((o) => o.id === p.data.correct_option_id);
          correct_answer_summary = `The correct answer was: ${opt?.text ?? p.data.correct_option_id}`;
          break;
        }
        case "issue_spotter": {
          const p = IssueSpotterPayloadSchema.safeParse(challenge.payload);
          const a = IssueSpotterAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid issue_spotter payload");
          if (!a.success) throw new GradingError("invalid issue_spotter answer");
          const r = gradeIssueSpotter(p.data, a.data, challenge.points_base);
          is_correct = r.is_correct; points_awarded = r.points_awarded;
          const correctTexts = p.data.issue_options.filter((o) => p.data.correct_issue_ids.includes(o.id)).map((o) => o.text);
          correct_answer_summary = `Correct issues: ${correctTexts.join(", ")}`;
          break;
        }
        case "speed_round": {
          const p = SpeedRoundPayloadSchema.safeParse(challenge.payload);
          const a = SpeedRoundAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid speed_round payload");
          if (!a.success) throw new GradingError("invalid speed_round answer");
          const r = gradeSpeedRound(p.data, a.data, challenge.points_base);
          is_correct = r.is_correct; points_awarded = r.points_awarded; per_question = r.per_question;
          const correctCount = per_question!.filter((q) => q.got_right).length;
          correct_answer_summary = `You got ${correctCount} of ${p.data.questions.length} correct.`;
          break;
        }
        case "jurisdiction": {
          const p = JurisdictionPayloadSchema.safeParse(challenge.payload);
          const a = JurisdictionAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid jurisdiction payload");
          if (!a.success) throw new GradingError("invalid jurisdiction answer");
          const r = gradeJurisdiction(p.data, a.data, challenge.points_base);
          is_correct = r.is_correct; points_awarded = r.points_awarded;
          const opt = p.data.options.find((o) => o.id === p.data.correct_option_id);
          correct_answer_summary = opt
            ? `The correct jurisdiction was: ${opt.jurisdiction} — ${opt.reasoning}`
            : "Correct option could not be resolved.";
          break;
        }
        case "document_review": {
          const p = DocumentReviewPayloadSchema.safeParse(challenge.payload);
          const a = DocumentReviewAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid document_review payload");
          if (!a.success) throw new GradingError("invalid document_review answer");
          const r = gradeDocumentReview(p.data, a.data, challenge.points_base);
          is_correct = r.is_correct; points_awarded = r.points_awarded; breakdown = r.breakdown;
          correct_flags = p.data.correct_flags;
          correct_answer_summary = `${r.breakdown.correct_hits} of ${r.breakdown.total_correct} clauses flagged correctly. ${r.breakdown.false_flags} false flag${r.breakdown.false_flags === 1 ? "" : "s"}.`;
          break;
        }
        case "brief_builder": {
          const p = BriefBuilderPayloadSchema.safeParse(challenge.payload);
          const a = BriefBuilderAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid brief_builder payload");
          if (!a.success) throw new GradingError("invalid brief_builder answer");
          const r = gradeBriefBuilder(p.data, a.data, challenge.points_base, config);
          is_correct = r.is_correct; points_awarded = r.points_awarded; step_results = r.step_results;
          correct_order = p.data.steps
            .map((s, i) => s.kind === "order" && s.correct_order ? { step_index: i, ordered_block_ids: s.correct_order } : null)
            .filter((x): x is { step_index: number; ordered_block_ids: string[] } => !!x);
          const okSteps = step_results.filter((s) => s.is_correct).length;
          correct_answer_summary = `${okSteps} of ${p.data.steps.length} brief steps correct.`;
          break;
        }
        case "ethics": {
          const p = EthicsPayloadSchema.safeParse(challenge.payload);
          const a = EthicsAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid ethics payload");
          if (!a.success) throw new GradingError("invalid ethics answer");
          const r = gradeEthics(p.data, a.data, challenge.points_base);
          stage1_correct = r.stage1_correct; stage2_correct = r.stage2_correct;
          const detRatio = r.points_awarded / Math.max(1, challenge.points_base);

          // AI rubric
          const rubric = await callAiRubric("ethics", challenge, a.data, r);
          rubric_score = rubric.rubric_score;
          rubric_feedback = { strengths: rubric.strengths, weaknesses: rubric.weaknesses, notice: rubric.notice };

          const rubricRatio = rubric.rubric_score == null ? detRatio : rubric.rubric_score / 100;
          const rubricPass = rubric.rubric_score == null ? true : rubric.rubric_score >= reasoningThreshold;
          is_correct = r.is_correct && rubricPass;
          points_awarded = Math.max(0, Math.floor(challenge.points_base * (0.5 * detRatio + 0.5 * rubricRatio)));

          const cd = p.data.decision_options.find((o) => o.id === p.data.correct_decision_id);
          const cf = p.data.followup_options.find((o) => o.id === p.data.correct_followup_id);
          correct_answer_summary = `Stage 1 → ${cd?.letter}. ${cd?.text}. Stage 2 → ${cf?.letter}. ${cf?.text}.`;
          break;
        }
        case "client_counseling": {
          const p = CounselingPayloadSchema.safeParse(challenge.payload);
          const a = CounselingAnswerSchema.safeParse(submitted_answer);
          if (!p.success) throw new GradingError("invalid client_counseling payload");
          if (!a.success) throw new GradingError("invalid client_counseling answer");
          const r = gradeCounseling(p.data, a.data, challenge.points_base);
          counseling_per_turn = r.per_turn;
          const detRatio = r.points_awarded / Math.max(1, challenge.points_base);

          const rubric = await callAiRubric("client_counseling", challenge, a.data, r);
          rubric_score = rubric.rubric_score;
          rubric_feedback = { strengths: rubric.strengths, weaknesses: rubric.weaknesses, notice: rubric.notice };
          per_turn_feedback = rubric.per_turn_feedback;

          const rubricRatio = rubric.rubric_score == null ? detRatio : rubric.rubric_score / 100;
          const rubricPass = rubric.rubric_score == null ? true : rubric.rubric_score >= reasoningThreshold;
          is_correct = r.is_correct && rubricPass;
          points_awarded = Math.max(0, Math.floor(challenge.points_base * (0.5 * detRatio + 0.5 * rubricRatio)));

          const okTurns = r.per_turn.filter((t) => t.is_correct).length;
          correct_answer_summary = `${okTurns} of ${p.data.decision_turns.length} counseling turns judged correct.`;
          break;
        }
        default:
          return jsonResponse(400, { error: "unsupported_question_type" });
      }
    } catch (e) {
      if (e instanceof GradingError) return jsonResponse(400, { error: "grading_error", message: e.message });
      throw e;
    }

    const { data: priorStats } = await admin
      .from("bar_user_stats")
      .select("designation")
      .eq("user_id", userId)
      .maybeSingle();
    const previous_designation = (priorStats?.designation ?? "trainee") as string;

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      challenge_id,
      submitted_answer: submitted_answer as unknown,
      is_correct,
      points_awarded,
    };
    if (typeof time_taken_seconds === "number") insertPayload.time_taken_seconds = time_taken_seconds;

    const { data: insertedAttempt, error: insertErr } = await admin
      .from("bar_attempts")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();
    if (insertErr) {
      const msg = insertErr.message ?? "";
      if (msg.includes("daily_cap_exceeded")) return jsonResponse(429, { error: "daily_cap_exceeded" });
      if (msg.includes("challenge_not_approved")) return jsonResponse(403, { error: "challenge_not_approved" });
      if (msg.includes("duplicate") || (insertErr as { code?: string }).code === "23505") {
        return jsonResponse(409, { error: "already_attempted" });
      }
      console.error("insert error", insertErr);
      return jsonResponse(500, { error: "db_error", retryable: true });
    }

    const { data: newStats } = await admin
      .from("bar_user_stats")
      .select("total_points, accuracy_pct, current_streak, longest_streak, designation")
      .eq("user_id", userId)
      .maybeSingle();

    const designation = (newStats?.designation ?? previous_designation) as string;

    return jsonResponse(200, {
      attempt_id: insertedAttempt?.id ?? null,
      is_correct,
      points_awarded,
      explanation: challenge.explanation ?? null,
      correct_answer_summary,
      per_question,
      breakdown,
      step_results,
      correct_order,
      correct_flags,
      stage1_correct,
      stage2_correct,
      counseling_per_turn,
      rubric_score,
      rubric_feedback,
      per_turn_feedback,
      new_stats: {
        total_points: newStats?.total_points ?? 0,
        accuracy_pct: Number(newStats?.accuracy_pct ?? 0),
        current_streak: newStats?.current_streak ?? 0,
        longest_streak: newStats?.longest_streak ?? 0,
        designation,
        designation_changed: designation !== previous_designation,
        previous_designation,
      },
    });
  } catch (e) {
    console.error("submit-bar-attempt fatal", e);
    return jsonResponse(500, { error: "internal_error", retryable: true });
  }
});
