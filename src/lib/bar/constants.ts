import type { BarDesignation, QuestionType, Difficulty, AreaOfLaw } from "./types";

export const DAILY_CAP = 20;

export const BASE_POINTS_BY_TYPE: Record<QuestionType, number> = {
  mcq: 5,
  issue_spotter: 15,
  jurisdiction: 10,
  speed_round: 3, // per sub-question
  document_review: 10,
  brief_builder: 10,
  ethics: 10,
  client_counseling: 10,
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

export interface RankThreshold {
  designation: BarDesignation;
  minPoints: number;
  minAccuracy: number; // 0-100
}

// Ordered ascending. computeDesignation walks descending to find the first match.
export const RANK_THRESHOLDS: RankThreshold[] = [
  { designation: "trainee", minPoints: 0, minAccuracy: 0 },
  { designation: "junior_associate", minPoints: 100, minAccuracy: 60 },
  { designation: "associate", minPoints: 500, minAccuracy: 70 },
  { designation: "senior_associate", minPoints: 1500, minAccuracy: 75 },
  { designation: "partner", minPoints: 5000, minAccuracy: 80 },
  { designation: "senior_partner", minPoints: 15000, minAccuracy: 85 },
  { designation: "silk", minPoints: 50000, minAccuracy: 90 },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  issue_spotter: "Issue Spotter",
  speed_round: "Speed Round",
  jurisdiction: "Jurisdiction",
  document_review: "Document Review",
  brief_builder: "Brief Builder",
  ethics: "Ethics",
  client_counseling: "Client Counseling",
};

// All 8 types are now authorable + playable end-to-end.
export const ENABLED_QUESTION_TYPES: QuestionType[] = [
  "mcq",
  "issue_spotter",
  "speed_round",
  "jurisdiction",
  "document_review",
  "brief_builder",
  "ethics",
  "client_counseling",
];

// Backwards-compat alias — prefer ENABLED_QUESTION_TYPES going forward.
export const V1_QUESTION_TYPES = ENABLED_QUESTION_TYPES;

export const AREA_OF_LAW_LABELS: Record<AreaOfLaw, string> = {
  constitutional: "Constitutional",
  criminal: "Criminal",
  contract: "Contract",
  torts: "Torts",
  corporate: "Corporate",
  ip: "Intellectual Property",
  labour: "Labour",
  tax: "Tax",
  evidence: "Evidence",
  procedure: "Procedure",
  family: "Family",
  property: "Property",
  administrative: "Administrative",
  international: "International",
  jurisprudence: "Jurisprudence",
  environmental: "Environmental",
  other: "Other",
};

export const DESIGNATION_LABELS: Record<BarDesignation, string> = {
  trainee: "Trainee",
  junior_associate: "Junior Associate",
  associate: "Associate",
  senior_associate: "Senior Associate",
  partner: "Partner",
  senior_partner: "Senior Partner",
  silk: "Silk",
};

export const DESIGNATION_ORDER: BarDesignation[] = [
  "trainee",
  "junior_associate",
  "associate",
  "senior_associate",
  "partner",
  "senior_partner",
  "silk",
];

export function getNextDesignation(current: BarDesignation): BarDesignation | null {
  const idx = DESIGNATION_ORDER.indexOf(current);
  if (idx < 0 || idx === DESIGNATION_ORDER.length - 1) return null;
  return DESIGNATION_ORDER[idx + 1];
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

// Default grading config per type — applied when challenge.grading_config is empty.
export const DEFAULT_GRADING_CONFIG: Record<
  QuestionType,
  { reasoning_threshold?: number; partial_order_credit?: boolean }
> = {
  mcq: {},
  issue_spotter: {},
  jurisdiction: {},
  speed_round: {},
  document_review: {},
  brief_builder: { partial_order_credit: false },
  ethics: { reasoning_threshold: 60 },
  client_counseling: { reasoning_threshold: 60 },
};
