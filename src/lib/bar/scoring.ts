import {
  BriefBuilderAnswerSchema,
  BriefBuilderPayloadSchema,
  ClientCounselingAnswerSchema,
  ClientCounselingPayloadSchema,
  DocumentReviewAnswerSchema,
  DocumentReviewPayloadSchema,
  EthicsAnswerSchema,
  EthicsPayloadSchema,
  GradingError,
  IssueSpotterAnswerSchema,
  IssueSpotterPayloadSchema,
  JurisdictionAnswerSchema,
  JurisdictionPayloadSchema,
  McqAnswerSchema,
  McqPayloadSchema,
  SpeedRoundAnswerSchema,
  SpeedRoundPayloadSchema,
  type BarDesignation,
  type BriefBuilderAnswer,
  type BriefBuilderPayload,
  type ClientCounselingAnswer,
  type ClientCounselingPayload,
  type Difficulty,
  type DocumentReviewAnswer,
  type DocumentReviewPayload,
  type EthicsAnswer,
  type EthicsPayload,
  type GradingConfig,
  type IssueSpotterAnswer,
  type IssueSpotterPayload,
  type JurisdictionAnswer,
  type JurisdictionPayload,
  type McqAnswer,
  type McqPayload,
  type QuestionType,
  type SpeedRoundAnswer,
  type SpeedRoundPayload,
} from "./types";
import {
  BASE_POINTS_BY_TYPE,
  DIFFICULTY_MULTIPLIER,
  RANK_THRESHOLDS,
} from "./constants";

export interface GradeResult {
  is_correct: boolean;
  points_awarded: number;
}

export function computeBasePoints(
  type: QuestionType,
  difficulty: Difficulty,
  questionCount?: number,
): number {
  const base = BASE_POINTS_BY_TYPE[type];
  const mult = DIFFICULTY_MULTIPLIER[difficulty];
  const raw =
    type === "speed_round"
      ? base * (questionCount ?? 0) * mult
      : base * mult;
  const result = Math.floor(raw);
  // Clamp to schema CHECK constraint (1-100). Caller is responsible for sane inputs.
  return Math.max(1, Math.min(100, result));
}

export function computeDesignation(
  totalPoints: number,
  accuracyPct: number,
): BarDesignation {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = RANK_THRESHOLDS[i];
    if (totalPoints >= t.minPoints && accuracyPct >= t.minAccuracy) {
      return t.designation;
    }
  }
  return "trainee";
}

export function computeNewStreak(
  currentStreak: number,
  longestStreak: number,
  wasCorrect: boolean,
): { current: number; longest: number } {
  if (!wasCorrect) return { current: 0, longest: longestStreak };
  const next = currentStreak + 1;
  return { current: next, longest: Math.max(longestStreak, next) };
}

export function gradeMcq(
  payload: McqPayload,
  answer: McqAnswer,
  pointsBase: number,
): GradeResult {
  const correct = answer.selected_option_id === payload.correct_option_id;
  return { is_correct: correct, points_awarded: correct ? pointsBase : 0 };
}

export function gradeIssueSpotter(
  payload: IssueSpotterPayload,
  answer: IssueSpotterAnswer,
  pointsBase: number,
): GradeResult {
  const submitted = new Set(answer.selected_issue_ids);
  const correct = new Set(payload.correct_issue_ids);
  const exact =
    submitted.size === correct.size &&
    [...submitted].every((id) => correct.has(id));
  return { is_correct: exact, points_awarded: exact ? pointsBase : 0 };
}

// Word-numerals → digit (covers ordinals like "eighth" via the same map after stripping "th").
const WORD_TO_NUM: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16",
  seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70",
  eighty: "80", ninety: "90",
  first: "1", second: "2", third: "3", fifth: "5", eighth: "8", ninth: "9",
  twelfth: "12",
};

const ROMAN_TO_NUM: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8",
  ix: "9", x: "10", xi: "11", xii: "12",
};

const FILLER_PREFIXES = [
  "article", "art.", "art",
  "section", "sec.", "sec", "s.",
  "schedule", "sch.", "sch",
  "clause", "cl.", "cl",
  "part", "chapter", "chap.", "chap",
];

// Words to drop when comparing multi-word answers ("the right to equality" === "right to equality")
const STOP_WORDS = new Set(["the", "of", "a", "an"]);

/**
 * Normalises a free-text speed-round answer so that obvious equivalents
 * compare equal: "8" / "8th" / "eighth" / "Article 8" / "Schedule VIII".
 * Also strips filler words even when typo'd (e.g. "ariticle 14" → "14").
 */
export function normalizeSpeedAnswer(raw: string): string {
  let s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";

  // Normalise unicode dashes / non-breaking space / smart quotes
  s = s.replace(/[\u2013\u2014]/g, "-").replace(/\u00a0/g, " ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  // Strip leading filler words — exact match first, then fuzzy on first token.
  let stripped = false;
  for (const f of FILLER_PREFIXES) {
    if (s === f) { s = ""; stripped = true; break; }
    if (s.startsWith(f + " ") || s.startsWith(f + ".")) {
      s = s.slice(f.length).trimStart().replace(/^\.\s*/, "");
      stripped = true;
      break;
    }
  }
  if (!stripped) {
    // Try fuzzy match on the first token against canonical filler words
    const spaceIdx = s.indexOf(" ");
    const firstTok = spaceIdx === -1 ? s : s.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? "" : s.slice(spaceIdx + 1);
    if (firstTok.length >= 4) {
      for (const canonical of CANONICAL_FILLERS) {
        const dist = editDistance(firstTok, canonical);
        if (dist > 0 && dist <= allowedEdits(Math.max(firstTok.length, canonical.length))) {
          s = rest.trimStart();
          break;
        }
      }
    }
  }

  // Drop ordinal suffixes on bare numbers: "8th" → "8", "21st" → "21"
  s = s.replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1");

  // Collapse punctuation/whitespace (also strips trailing "." in "Article 14.")
  s = s.replace(/[.,;:!?'"()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();

  // Single-token shortcuts
  if (WORD_TO_NUM[s]) return WORD_TO_NUM[s];
  if (ROMAN_TO_NUM[s]) return ROMAN_TO_NUM[s];

  // Multi-token: map roman/word numerals to digits, drop stop words.
  const mapped = s.split(" ")
    .map((tok) => WORD_TO_NUM[tok] ?? ROMAN_TO_NUM[tok] ?? tok)
    .filter((tok) => tok.length > 0 && !STOP_WORDS.has(tok));

  return mapped.length > 0 ? mapped.join(" ") : s;
}

const CANONICAL_FILLERS = ["article", "section", "schedule", "clause", "chapter"];

/**
 * Damerau-Levenshtein distance (handles substitutions, insertions, deletions, transpositions).
 */
function editDistance(a: string, b: string): number {
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

/** Length-aware tolerance for typos. Short tokens demand exact matches. */
function allowedEdits(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 10) return 2;
  return 3;
}

/** Token-level fuzzy equality. Tokens compared in order; both strings already normalised. */
export function fuzzyEquals(submitted: string, expected: string): boolean {
  if (submitted === expected) return true;
  if (!submitted || !expected) return false;
  const subTokens = submitted.split(" ");
  const expTokens = expected.split(" ");
  if (subTokens.length !== expTokens.length) {
    // Whole-string fallback for length mismatch (e.g. extra space)
    return editDistance(submitted, expected) <= allowedEdits(Math.max(submitted.length, expected.length));
  }
  for (let i = 0; i < subTokens.length; i++) {
    const s = subTokens[i], e = expTokens[i];
    if (s === e) continue;
    if (editDistance(s, e) > allowedEdits(Math.max(s.length, e.length))) return false;
  }
  return true;
}

/**
 * Simplified Metaphone phonetic encoder. Returns "" for non-alphabetic input.
 * Not Double-Metaphone — covers common English/Latin legal vocabulary well enough
 * to catch sound-alike typos like habeas/habias, mandamus/mandamous, certiorari/sertiorari.
 */
export function metaphone(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  // Initial transformations
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

    // Skip duplicates (except "c")
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

/** Phonetic equality across tokens. Only applied to tokens of length >= 5 to avoid false positives. */
export function phoneticEquals(submitted: string, expected: string): boolean {
  if (!submitted || !expected) return false;
  const subTokens = submitted.split(" ");
  const expTokens = expected.split(" ");
  if (subTokens.length !== expTokens.length) return false;
  for (let i = 0; i < subTokens.length; i++) {
    const s = subTokens[i], e = expTokens[i];
    if (s === e) continue;
    // Don't apply phonetic to short tokens (or/of, yes/yet) or pure numbers
    if (s.length < 5 || e.length < 5 || /^\d+$/.test(s) || /^\d+$/.test(e)) return false;
    const ms = metaphone(s), me = metaphone(e);
    if (!ms || !me || ms !== me) return false;
  }
  return true;
}

/** Returns true iff `submitted` matches `expected` under exact OR fuzzy OR phonetic equality. */
function matchesUnderAllRules(submittedNorm: string, expectedNorm: string): boolean {
  if (!submittedNorm || !expectedNorm) return false;
  if (submittedNorm === expectedNorm) return true;
  if (fuzzyEquals(submittedNorm, expectedNorm)) return true;
  if (phoneticEquals(submittedNorm, expectedNorm)) return true;
  return false;
}

/** Returns true if submitted matches the canonical answer or any alias. */
export function matchesAnyCandidate(
  submitted: string,
  answer: string,
  aliases?: string[],
): boolean {
  const sub = normalizeSpeedAnswer(submitted);
  if (!sub) return false;
  const candidates = [answer, ...(aliases ?? [])];
  for (const candidate of candidates) {
    const norm = normalizeSpeedAnswer(candidate);
    if (matchesUnderAllRules(sub, norm)) return true;
  }
  return false;
}

export function gradeSpeedRound(
  payload: SpeedRoundPayload,
  answer: SpeedRoundAnswer,
  pointsBase: number,
): GradeResult {
  const total = payload.questions.length;
  if (total === 0) return { is_correct: false, points_awarded: 0 };
  const answerMap = new Map(
    answer.answers.map((a) => [a.question_id, a.submitted]),
  );
  let correctCount = 0;
  for (const q of payload.questions) {
    const submitted = answerMap.get(q.id) ?? "";
    if (matchesAnyCandidate(submitted, q.answer, q.aliases)) correctCount++;
  }
  const ratio = correctCount / total;
  const points = Math.floor(ratio * pointsBase);
  return { is_correct: ratio >= 0.7, points_awarded: points };
}

export function gradeJurisdiction(
  payload: JurisdictionPayload,
  answer: JurisdictionAnswer,
  pointsBase: number,
): GradeResult {
  const correct = answer.selected_option_id === payload.correct_option_id;
  return { is_correct: correct, points_awarded: correct ? pointsBase : 0 };
}

// ============= Document Review =============
export interface DocReviewBreakdown {
  correct_hits: number;
  missed: number;
  false_flags: number;
  total_correct: number;
}

export function gradeDocumentReview(
  payload: DocumentReviewPayload,
  answer: DocumentReviewAnswer,
  pointsBase: number,
): GradeResult & { breakdown: DocReviewBreakdown } {
  const correctMap = new Map<string, string>();
  for (const f of payload.correct_flags) correctMap.set(f.span_id, f.category_id);

  let correctHits = 0;
  let falseFlags = 0;
  const seenSpans = new Set<string>();
  for (const f of answer.flagged) {
    if (seenSpans.has(f.span_id)) continue; // ignore duplicate flag of same span
    seenSpans.add(f.span_id);
    const expected = correctMap.get(f.span_id);
    if (expected && expected === f.category_id) correctHits++;
    else if (!expected) falseFlags++;
    // wrong category on a true-flag span = 0 (neither hit nor false flag)
  }
  const totalCorrect = payload.correct_flags.length;
  const missed = totalCorrect - correctHits;

  const rawScore = correctHits - falseFlags;
  const clamped = Math.max(0, rawScore);
  const ratio = totalCorrect === 0 ? 0 : clamped / totalCorrect;
  const points = Math.max(0, Math.floor(ratio * pointsBase));
  const isCorrect = correctHits === totalCorrect && falseFlags === 0;

  return {
    is_correct: isCorrect,
    points_awarded: points,
    breakdown: { correct_hits: correctHits, missed, false_flags: falseFlags, total_correct: totalCorrect },
  };
}

// ============= Brief Builder =============
export interface BriefStepResult {
  step_index: number;
  is_correct: boolean;
  points_ratio: number; // 0..1 of this step's share
}

// Kendall-tau distance based partial order credit:
// 1 - inversions / max_inversions
function orderingScore(submitted: string[], expected: string[]): number {
  const n = expected.length;
  if (n <= 1) return submitted.length === n ? 1 : 0;
  const indexOf = new Map<string, number>();
  expected.forEach((id, i) => indexOf.set(id, i));
  // Filter submitted to same set; if missing/extra ids, partial fallback
  const filtered = submitted.filter((id) => indexOf.has(id));
  if (filtered.length === 0) return 0;
  let inversions = 0;
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const a = indexOf.get(filtered[i])!;
      const b = indexOf.get(filtered[j])!;
      if (a > b) inversions++;
    }
  }
  const maxInv = (n * (n - 1)) / 2;
  return Math.max(0, 1 - inversions / maxInv);
}

export function gradeBriefBuilder(
  payload: BriefBuilderPayload,
  answer: BriefBuilderAnswer,
  pointsBase: number,
  config: GradingConfig = {},
): GradeResult & { step_results: BriefStepResult[] } {
  const stepCount = payload.steps.length;
  const perStep = pointsBase / stepCount;
  const answerByIdx = new Map(answer.step_answers.map((a) => [a.step_index, a]));
  const partial = !!config.partial_order_credit;

  const results: BriefStepResult[] = [];
  let totalPoints = 0;
  let allCorrect = true;

  payload.steps.forEach((step, i) => {
    const a = answerByIdx.get(i);
    let stepRatio = 0;
    let stepCorrect = false;
    if (step.kind === "mcq") {
      if (a?.selected_option_id && a.selected_option_id === step.correct_option_id) {
        stepRatio = 1;
        stepCorrect = true;
      }
    } else if (step.kind === "order") {
      const submitted = a?.ordered_block_ids ?? [];
      const expected = step.correct_order ?? [];
      const exact =
        submitted.length === expected.length &&
        submitted.every((id, idx) => id === expected[idx]);
      if (exact) {
        stepRatio = 1;
        stepCorrect = true;
      } else if (partial) {
        stepRatio = orderingScore(submitted, expected);
      }
    }
    if (!stepCorrect) allCorrect = false;
    totalPoints += stepRatio * perStep;
    results.push({ step_index: i, is_correct: stepCorrect, points_ratio: stepRatio });
  });

  return {
    is_correct: allCorrect,
    points_awarded: Math.max(0, Math.floor(totalPoints)),
    step_results: results,
  };
}

// ============= Ethics =============
export function gradeEthics(
  payload: EthicsPayload,
  answer: EthicsAnswer,
  pointsBase: number,
): GradeResult & { stage1_correct: boolean; stage2_correct: boolean } {
  const stage1 = answer.selected_decision_id === payload.correct_decision_id;
  const stage2 = answer.selected_followup_id === payload.correct_followup_id;
  const both = stage1 && stage2;
  const points = both
    ? pointsBase
    : stage1
    ? Math.floor(pointsBase * 0.5)
    : 0;
  return { is_correct: both, points_awarded: points, stage1_correct: stage1, stage2_correct: stage2 };
}

// ============= Client Counseling =============
export interface CounselingTurnResult {
  turn: number;
  is_correct: boolean;
}

export function gradeClientCounseling(
  payload: ClientCounselingPayload,
  answer: ClientCounselingAnswer,
  pointsBase: number,
): GradeResult & { per_turn: CounselingTurnResult[] } {
  const correctByTurn = new Map<number, string>();
  for (const t of payload.decision_turns) correctByTurn.set(t.turn, t.correct_option_id);

  const pickByTurn = new Map<number, string>();
  for (const p of answer.turn_picks) pickByTurn.set(p.turn, p.selected_option_id);

  const per_turn: CounselingTurnResult[] = [];
  let correctCount = 0;
  for (const t of payload.decision_turns) {
    const pick = pickByTurn.get(t.turn);
    const ok = pick === correctByTurn.get(t.turn);
    if (ok) correctCount++;
    per_turn.push({ turn: t.turn, is_correct: ok });
  }
  const total = payload.decision_turns.length;
  const ratio = total === 0 ? 0 : correctCount / total;
  return {
    is_correct: ratio >= 0.8,
    points_awarded: Math.floor(ratio * pointsBase),
    per_turn,
  };
}

export function gradeAttempt(
  type: QuestionType,
  payload: unknown,
  answer: unknown,
  pointsBase: number,
  config: GradingConfig = {},
): GradeResult {
  switch (type) {
    case "mcq": {
      const p = McqPayloadSchema.safeParse(payload);
      const a = McqAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid mcq payload");
      if (!a.success) throw new GradingError("invalid mcq answer");
      return gradeMcq(p.data, a.data, pointsBase);
    }
    case "issue_spotter": {
      const p = IssueSpotterPayloadSchema.safeParse(payload);
      const a = IssueSpotterAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid issue_spotter payload");
      if (!a.success) throw new GradingError("invalid issue_spotter answer");
      return gradeIssueSpotter(p.data, a.data, pointsBase);
    }
    case "speed_round": {
      const p = SpeedRoundPayloadSchema.safeParse(payload);
      const a = SpeedRoundAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid speed_round payload");
      if (!a.success) throw new GradingError("invalid speed_round answer");
      return gradeSpeedRound(p.data, a.data, pointsBase);
    }
    case "jurisdiction": {
      const p = JurisdictionPayloadSchema.safeParse(payload);
      const a = JurisdictionAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid jurisdiction payload");
      if (!a.success) throw new GradingError("invalid jurisdiction answer");
      return gradeJurisdiction(p.data, a.data, pointsBase);
    }
    case "document_review": {
      const p = DocumentReviewPayloadSchema.safeParse(payload);
      const a = DocumentReviewAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid document_review payload");
      if (!a.success) throw new GradingError("invalid document_review answer");
      const r = gradeDocumentReview(p.data, a.data, pointsBase);
      return { is_correct: r.is_correct, points_awarded: r.points_awarded };
    }
    case "brief_builder": {
      const p = BriefBuilderPayloadSchema.safeParse(payload);
      const a = BriefBuilderAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid brief_builder payload");
      if (!a.success) throw new GradingError("invalid brief_builder answer");
      const r = gradeBriefBuilder(p.data, a.data, pointsBase, config);
      return { is_correct: r.is_correct, points_awarded: r.points_awarded };
    }
    case "ethics": {
      const p = EthicsPayloadSchema.safeParse(payload);
      const a = EthicsAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid ethics payload");
      if (!a.success) throw new GradingError("invalid ethics answer");
      const r = gradeEthics(p.data, a.data, pointsBase);
      return { is_correct: r.is_correct, points_awarded: r.points_awarded };
    }
    case "client_counseling": {
      const p = ClientCounselingPayloadSchema.safeParse(payload);
      const a = ClientCounselingAnswerSchema.safeParse(answer);
      if (!p.success) throw new GradingError("invalid client_counseling payload");
      if (!a.success) throw new GradingError("invalid client_counseling answer");
      const r = gradeClientCounseling(p.data, a.data, pointsBase);
      return { is_correct: r.is_correct, points_awarded: r.points_awarded };
    }
    default:
      throw new GradingError(`question type ${type} not implemented`);
  }
}
