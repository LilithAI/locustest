import type { TourStep } from "./types";

// Real /app product tour. Each target must exist on the page — if a target
// selector resolves to nothing, the engine skips that step gracefully.
export const APP_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="profile-strength"]',
    title: "Your profile strength",
    body: "Recruiters skim profiles in seconds. The stronger this score, the more replies you get. Aim for 80+.",
    placement: "bottom",
  },
  {
    target: '[data-tour="pipeline"]',
    title: "Track every application",
    body: "Log each firm you apply to. Locus nudges you when it's time to follow up — no more lost threads.",
    placement: "top",
  },
  {
    target: '[data-tour="practice"]',
    title: "Sharpen at The Bar",
    body: "Daily legal challenges. Build a streak, climb the leaderboard, and prove you actually know the law.",
    placement: "right",
  },
  {
    target: '[data-tour="opportunities-nav"], [data-tour="opportunities-nav-mobile"]',
    title: "Browse opportunities",
    body: "Vacancies, calls for papers, moots, competitions — every opening worth your time, in one feed.",
    placement: "auto",
  },
];
