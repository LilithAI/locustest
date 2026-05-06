// Lightweight, client-side ranking for the "Recommended for you" rail on /opportunities.
// Designed to be cheap (single pass over a few hundred items) and explainable —
// every item carries a list of human-readable "why" chips.

import type { VacancyLike } from "@/lib/opportunities";
import type { VacancyTier } from "@/lib/vacancies";
import { TIER_LABELS } from "@/lib/vacancies";

export interface UserOpportunityPrefs {
  target_tiers: string[]; // VacancyTier values
  target_locations: string[]; // free-text city/region strings, lowercased on read
  target_practice_areas: string[]; // free-text area strings
}

export interface RankedVacancy {
  vacancy: VacancyLike;
  score: number;
  reasons: string[];
}

export const LOCATION_OPTIONS = [
  "Delhi NCR",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Remote",
  "Other",
] as const;

const FRESH_HOURS = 48;

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function locationMatches(vacancyLocation: string | null | undefined, targets: string[]): boolean {
  if (!vacancyLocation || targets.length === 0) return false;
  const v = norm(vacancyLocation);
  return targets.some((t) => {
    const tn = norm(t);
    if (!tn) return false;
    if (tn === "remote") return /remote|wfh|work from home|hybrid/.test(v);
    if (tn === "delhi ncr") return /delhi|gurgaon|gurugram|noida|ncr|faridabad/.test(v);
    if (tn === "other") return false; // "Other" is a placeholder, not a match
    return v.includes(tn);
  });
}

function practiceMatches(vacancyArea: string | null | undefined, targets: string[]): boolean {
  if (!vacancyArea || targets.length === 0) return false;
  const v = norm(vacancyArea);
  return targets.some((t) => {
    const tn = norm(t);
    return tn && (v.includes(tn) || tn.includes(v));
  });
}

function isFresh(postedAt: string): boolean {
  const ms = Date.now() - new Date(postedAt).getTime();
  return ms >= 0 && ms < FRESH_HOURS * 60 * 60 * 1000;
}

export function rankVacancies(
  vacancies: VacancyLike[],
  prefs: UserOpportunityPrefs,
  appliedIds: Set<string>,
): RankedVacancy[] {
  const out: RankedVacancy[] = vacancies.map((v) => {
    let score = 0;
    const reasons: string[] = [];

    // Tier match (+30)
    if (v.tier && prefs.target_tiers.includes(v.tier)) {
      score += 30;
      reasons.push(`${TIER_LABELS[v.tier as VacancyTier]} match`);
    }

    // Location match (+20)
    if (locationMatches(v.location, prefs.target_locations)) {
      score += 20;
      reasons.push("Your city");
    }

    // Practice area (+25)
    if (practiceMatches(v.practice_area, prefs.target_practice_areas)) {
      score += 25;
      reasons.push(`${v.practice_area} match`);
    }

    // Freshness (+15)
    if (isFresh(v.posted_at)) {
      score += 15;
      reasons.push("Just posted");
    }

    // Already applied → strongly demote
    if (appliedIds.has(v.id)) {
      score -= 50;
    }

    return { vacancy: v, score, reasons };
  });

  // Only items that scored on at least one signal AND haven't been applied to.
  return out
    .filter((r) => r.score > 0 && !appliedIds.has(r.vacancy.id))
    .sort((a, b) => b.score - a.score);
}

export function hasAnyPrefs(prefs: UserOpportunityPrefs): boolean {
  return (
    prefs.target_tiers.length > 0 ||
    prefs.target_locations.length > 0 ||
    prefs.target_practice_areas.length > 0
  );
}
