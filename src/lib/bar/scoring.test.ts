import { describe, it, expect } from "vitest";
import {
  computeBasePoints,
  computeDesignation,
  computeNewStreak,
  gradeMcq,
  gradeIssueSpotter,
  gradeSpeedRound,
  gradeJurisdiction,
  gradeAttempt,
  normalizeSpeedAnswer,
  fuzzyEquals,
  metaphone,
  phoneticEquals,
  matchesAnyCandidate,
} from "./scoring";
import { GradingError } from "./types";

describe("normalizeSpeedAnswer", () => {
  it("strips ordinal suffixes", () => {
    expect(normalizeSpeedAnswer("8th")).toBe(normalizeSpeedAnswer("8"));
    expect(normalizeSpeedAnswer("21st")).toBe(normalizeSpeedAnswer("21"));
  });
  it("maps word numerals to digits", () => {
    expect(normalizeSpeedAnswer("eight")).toBe("8");
    expect(normalizeSpeedAnswer("eighth")).toBe("8");
    expect(normalizeSpeedAnswer("Twelve")).toBe("12");
  });
  it("strips filler prefixes", () => {
    expect(normalizeSpeedAnswer("Article 14")).toBe("14");
    expect(normalizeSpeedAnswer("Schedule VIII")).toBe("8");
    expect(normalizeSpeedAnswer("Section 302")).toBe("302");
  });
  it("treats roman numerals same as digits", () => {
    expect(normalizeSpeedAnswer("VIII")).toBe("8");
    expect(normalizeSpeedAnswer("iv")).toBe("4");
  });
  it("handles empty / whitespace", () => {
    expect(normalizeSpeedAnswer("")).toBe("");
    expect(normalizeSpeedAnswer("   ")).toBe("");
  });
  it("strips trailing punctuation", () => {
    expect(normalizeSpeedAnswer("Article 14.")).toBe("14");
    expect(normalizeSpeedAnswer("habeas corpus!")).toBe("habeas corpus");
  });
  it("drops stop words in multi-word answers", () => {
    expect(normalizeSpeedAnswer("the right to equality"))
      .toBe(normalizeSpeedAnswer("right to equality"));
    expect(normalizeSpeedAnswer("writ of mandamus"))
      .toBe(normalizeSpeedAnswer("writ mandamus"));
  });
  it("normalises em/en dashes and nbsp", () => {
    expect(normalizeSpeedAnswer("Article\u00a014")).toBe("14");
  });
});

describe("fuzzyEquals", () => {
  it("accepts single-character typos in medium tokens", () => {
    expect(fuzzyEquals("habeus", "habeas")).toBe(true);
    expect(fuzzyEquals("schdule", "schedule")).toBe(true);
  });
  it("accepts typos across multi-word answers", () => {
    expect(fuzzyEquals("habeus corpos", "habeas corpus")).toBe(true);
    expect(fuzzyEquals("writ of mandamuss", "writ of mandamus")).toBe(true);
  });
  it("rejects 3-letter look-alikes (no edits allowed at len <= 3)", () => {
    expect(fuzzyEquals("or", "of")).toBe(false);
    expect(fuzzyEquals("yes", "yet")).toBe(false);
  });
  it("rejects genuinely different words", () => {
    expect(fuzzyEquals("eighth", "seventh")).toBe(false);
    expect(fuzzyEquals("plaintiff", "defendant")).toBe(false);
  });
  it("requires exact token-count or distance fallback", () => {
    expect(fuzzyEquals("a b c", "a b")).toBe(false);
  });
});

describe("gradeSpeedRound with typos", () => {
  it("forgives typos in answer body and accepts filler/ordinal variants", () => {
    const p = {
      questions: [
        { id: "q1", prompt: "Writ for unlawful detention", answer: "habeas corpus" },
        { id: "q2", prompt: "Article for equality", answer: "Article 14" },
      ],
      time_limit_seconds: 60,
    } as const;
    const r = gradeSpeedRound(p as never, {
      answers: [
        { question_id: "q1", submitted: "habeus corpos" },
        { question_id: "q2", submitted: "Article 14." },
      ],
    } as never, 100);
    expect(r.is_correct).toBe(true);
  });
});

describe("gradeSpeedRound normalisation", () => {
  const payload = {
    questions: [
      { id: "q1", prompt: "Schedule listing official languages", answer: "8" },
      { id: "q2", prompt: "Right to equality article", answer: "Article 14" },
    ],
  } as const;
  it("accepts ordinal suffix as correct", () => {
    const r = gradeSpeedRound(payload as never, {
      answers: [
        { question_id: "q1", submitted: "8th" },
        { question_id: "q2", submitted: "14" },
      ],
    } as never, 100);
    expect(r.is_correct).toBe(true);
    expect(r.points_awarded).toBe(100);
  });
  it("accepts spelled-out numeral", () => {
    const r = gradeSpeedRound(payload as never, {
      answers: [
        { question_id: "q1", submitted: "eighth" },
        { question_id: "q2", submitted: "Article 14" },
      ],
    } as never, 100);
    expect(r.is_correct).toBe(true);
  });
});

describe("computeBasePoints", () => {
  it("mcq easy = 5", () => expect(computeBasePoints("mcq", "easy")).toBe(5));
  it("mcq medium = 7", () => expect(computeBasePoints("mcq", "medium")).toBe(7));
  it("mcq hard = 10", () => expect(computeBasePoints("mcq", "hard")).toBe(10));
  it("issue_spotter hard = 30", () =>
    expect(computeBasePoints("issue_spotter", "hard")).toBe(30));
  it("jurisdiction medium = 15", () =>
    expect(computeBasePoints("jurisdiction", "medium")).toBe(15));
  it("speed_round 5q easy = 15", () =>
    expect(computeBasePoints("speed_round", "easy", 5)).toBe(15));
  it("speed_round 10q hard clamps to 60", () =>
    expect(computeBasePoints("speed_round", "hard", 10)).toBe(60));
  it("speed_round caps at 100", () =>
    expect(computeBasePoints("speed_round", "hard", 50)).toBe(100));
});

describe("computeDesignation", () => {
  it("0/0 → trainee", () => expect(computeDesignation(0, 0)).toBe("trainee"));
  it("99/60 → trainee (points short)", () =>
    expect(computeDesignation(99, 60)).toBe("trainee"));
  it("100/60 → junior_associate (exact)", () =>
    expect(computeDesignation(100, 60)).toBe("junior_associate"));
  it("100/59 → trainee (accuracy floor)", () =>
    expect(computeDesignation(100, 59)).toBe("trainee"));
  it("5000/70 stuck at associate (accuracy)", () =>
    expect(computeDesignation(5000, 70)).toBe("associate"));
  it("5000/80 → partner", () =>
    expect(computeDesignation(5000, 80)).toBe("partner"));
  it("15000/85 → senior_partner", () =>
    expect(computeDesignation(15000, 85)).toBe("senior_partner"));
  it("50000/90 → silk (pure fn ignores top-50)", () =>
    expect(computeDesignation(50000, 90)).toBe("silk"));
  it("50000/89 → senior_partner", () =>
    expect(computeDesignation(50000, 89)).toBe("senior_partner"));
});

describe("computeNewStreak", () => {
  it("correct extends and updates longest", () =>
    expect(computeNewStreak(3, 3, true)).toEqual({ current: 4, longest: 4 }));
  it("correct extends but longest unchanged", () =>
    expect(computeNewStreak(2, 7, true)).toEqual({ current: 3, longest: 7 }));
  it("incorrect resets current, longest unchanged", () =>
    expect(computeNewStreak(5, 5, false)).toEqual({ current: 0, longest: 5 }));
});

describe("gradeMcq", () => {
  const p = { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correct_option_id: "a" };
  it("correct → full points", () =>
    expect(gradeMcq(p, { selected_option_id: "a" }, 5)).toEqual({ is_correct: true, points_awarded: 5 }));
  it("incorrect → zero", () =>
    expect(gradeMcq(p, { selected_option_id: "b" }, 5)).toEqual({ is_correct: false, points_awarded: 0 }));
});

describe("gradeIssueSpotter", () => {
  const p = {
    issue_options: [
      { id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" },
    ],
    correct_issue_ids: ["a", "b"],
  };
  it("exact match", () =>
    expect(gradeIssueSpotter(p, { selected_issue_ids: ["a", "b"] }, 15).is_correct).toBe(true));
  it("partial match → wrong (no partial credit v1)", () =>
    expect(gradeIssueSpotter(p, { selected_issue_ids: ["a"] }, 15)).toEqual({ is_correct: false, points_awarded: 0 }));
  it("extra selection → wrong", () =>
    expect(gradeIssueSpotter(p, { selected_issue_ids: ["a", "b", "c"] }, 15).is_correct).toBe(false));
});

describe("gradeSpeedRound", () => {
  const mk = (n: number) => ({
    questions: Array.from({ length: n }, (_, i) => ({ id: `q${i}`, prompt: "p", answer: "yes" })),
    time_limit_seconds: 60,
  });
  it("100% correct → is_correct + full points", () => {
    const p = mk(5);
    const a = { answers: p.questions.map((q) => ({ question_id: q.id, submitted: "YES " })) };
    expect(gradeSpeedRound(p, a, 15)).toEqual({ is_correct: true, points_awarded: 15 });
  });
  it("70% correct → is_correct true", () => {
    const p = mk(10);
    const a = { answers: p.questions.map((q, i) => ({ question_id: q.id, submitted: i < 7 ? "yes" : "no" })) };
    const res = gradeSpeedRound(p, a, 30);
    expect(res.is_correct).toBe(true);
    expect(res.points_awarded).toBe(21); // floor(0.7 * 30)
  });
  it("69% (6/10) → is_correct false", () => {
    const p = mk(10);
    const a = { answers: p.questions.map((q, i) => ({ question_id: q.id, submitted: i < 6 ? "yes" : "no" })) };
    expect(gradeSpeedRound(p, a, 30).is_correct).toBe(false);
  });
});

describe("gradeJurisdiction", () => {
  const p = {
    options: [
      { id: "a", jurisdiction: "Delhi HC", reasoning: "x" },
      { id: "b", jurisdiction: "Bombay HC", reasoning: "y" },
    ],
    correct_option_id: "b",
  };
  it("correct", () =>
    expect(gradeJurisdiction(p, { selected_option_id: "b" }, 10).is_correct).toBe(true));
  it("incorrect", () =>
    expect(gradeJurisdiction(p, { selected_option_id: "a" }, 10).is_correct).toBe(false));
});

describe("gradeAttempt dispatcher", () => {
  it("invalid mcq payload throws GradingError", () => {
    expect(() => gradeAttempt("mcq", { foo: "bar" }, { selected_option_id: "a" }, 5)).toThrow(GradingError);
  });
  it("reserved type rejected", () => {
    expect(() => gradeAttempt("ethics", {}, {}, 10)).toThrow(GradingError);
  });
  it("valid mcq dispatches", () => {
    const p = { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correct_option_id: "a" };
    expect(gradeAttempt("mcq", p, { selected_option_id: "a" }, 5).is_correct).toBe(true);
  });
});
