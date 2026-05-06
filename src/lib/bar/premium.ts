// Locus+ premium track: which question types use the premium "paper" aesthetic.
import type { QuestionType } from "./types";

export const PREMIUM_TYPES: QuestionType[] = [
  "document_review",
  "brief_builder",
  "ethics",
  "client_counseling",
];

export function isPremiumType(t: QuestionType | string | null | undefined): boolean {
  return !!t && (PREMIUM_TYPES as string[]).includes(t);
}
