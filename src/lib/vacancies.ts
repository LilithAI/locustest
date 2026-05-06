// Shared vacancy types + helpers for both admin and public surfaces.
export type VacancyStatus = "live" | "archived" | "deleted";
export type VacancyOpportunityType = "internship" | "job";
export type VacancyApplicationMode = "email" | "external_url";
export type VacancyTier =
  | "tier_1" | "tier_2" | "tier_3" | "boutique" | "in_house" | "psu" | "big_4" | "other";

export interface Vacancy {
  id: string;
  firm_name: string;
  role: string;
  opportunity_type: VacancyOpportunityType;
  location: string | null;
  application_mode: VacancyApplicationMode;
  application_email: string | null;
  application_url: string | null;
  tier: VacancyTier | null;
  practice_area: string | null;
  eligibility: string | null;
  stipend: string | null;
  description: string | null;
  task_brief: string | null;
  source_credit: string | null;
  posted_at: string;
  expires_at: string;
  status: VacancyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const TIER_LABELS: Record<VacancyTier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
  boutique: "Boutique",
  in_house: "In-house",
  psu: "PSU",
  big_4: "Big 4",
  other: "Other",
};

export const TIER_OPTIONS: VacancyTier[] = [
  "tier_1", "tier_2", "tier_3", "boutique", "in_house", "psu", "big_4", "other",
];

export const PRACTICE_AREA_SUGGESTIONS: string[] = [
  "Corporate", "M&A", "Disputes/Litigation", "IP", "TMT",
  "Banking & Finance", "Tax", "Competition", "Real Estate",
  "Employment", "Policy/Regulatory", "General",
];

export function opportunityTypeLabel(t: VacancyOpportunityType): string {
  return t === "job" ? "Job" : "Internship";
}

export function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function urgencyTone(days: number): "fresh" | "soon" | "expired" {
  if (days <= 0) return "expired";
  if (days <= 2) return "soon";
  return "fresh";
}

export function isFreshVacancy(postedAt: string, hours = 48): boolean {
  const ms = Date.now() - new Date(postedAt).getTime();
  return ms >= 0 && ms < hours * 60 * 60 * 1000;
}

export function formatExpiry(expiresAt: string): string {
  const d = daysLeft(expiresAt);
  if (d <= 0) return "Closed";
  if (d === 1) return "Closes in 1 day";
  return `Closes in ${d} days`;
}

// ----- User application state per vacancy -----
export interface VacancyApplication {
  id: string;
  appliedOn: string; // ISO date
  lastFollowupOn: string | null; // ISO date or null
}

export type VacancyAppState = "idle" | "applied" | "followup_ready" | "followed_up";

const FOLLOWUP_AFTER_DAYS = 3;

export function applicationStateFor(
  app: VacancyApplication | undefined | null,
  now: Date = new Date(),
): { state: VacancyAppState; daysUntilFollowup: number; lastActionOn: string | null } {
  if (!app) return { state: "idle", daysUntilFollowup: 0, lastActionOn: null };
  const lastAction = app.lastFollowupOn ?? app.appliedOn;
  const lastMs = new Date(lastAction).getTime();
  const diffDays = Math.floor((now.getTime() - lastMs) / (1000 * 60 * 60 * 24));
  if (app.lastFollowupOn && diffDays < FOLLOWUP_AFTER_DAYS) {
    return { state: "followed_up", daysUntilFollowup: 0, lastActionOn: app.lastFollowupOn };
  }
  if (diffDays >= FOLLOWUP_AFTER_DAYS) {
    return { state: "followup_ready", daysUntilFollowup: 0, lastActionOn: lastAction };
  }
  return {
    state: "applied",
    daysUntilFollowup: Math.max(1, FOLLOWUP_AFTER_DAYS - diffDays),
    lastActionOn: app.appliedOn,
  };
}
