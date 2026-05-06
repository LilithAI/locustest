// Round 2 beta feedback — for testers who already submitted Round 1.
// No question repeats anything from src/content/beta-checklist.ts.
// Focuses on (a) regression checks for bugs they reported and we fixed,
// (b) features shipped after their first run, and (c) habits + recommend signal.

export type R2QuestionType = "single" | "multi" | "text" | "scale";

export type R2Question = {
  id: string;
  prompt: string;
  type: R2QuestionType;
  options?: string[];
  // For "scale" type:
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  required?: boolean;
};

export type R2Section = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  questions: R2Question[];
};

export const R2_SECTIONS: R2Section[] = [
  {
    id: "regressions",
    number: 1,
    title: "Did we actually fix it?",
    subtitle:
      "We patched a few things you flagged in Round 1. Quick regression check — only what's been touched since.",
    questions: [
      {
        id: "1.1",
        prompt: "Sign-up: the 'weak password' error that wouldn't go away.",
        type: "single",
        options: ["Fixed for me", "Still happening", "Didn't retry"],
      },
      {
        id: "1.2",
        prompt: "CV upload: files under 5 MB getting rejected.",
        type: "single",
        options: ["Fixed for me", "Still broken", "Didn't retry"],
      },
      {
        id: "1.3",
        prompt: "Random session logouts in the last 7 days?",
        type: "single",
        options: ["None", "Once", "Multiple", "Didn't notice last round either"],
      },
      {
        id: "1.4",
        prompt:
          "Bar challenges: any crashes, wrong-result screens, or leaderboard mismatches still showing up?",
        type: "text",
      },
    ],
  },
  {
    id: "vacancies",
    number: 2,
    title: "New: Vacancy Board",
    subtitle: "Curated internship & PQE openings at /vacancies. Shipped after Round 1.",
    questions: [
      {
        id: "2.1",
        prompt: "Did you find a vacancy that felt genuinely relevant to you?",
        type: "single",
        options: ["Yes", "Sort of", "No", "Didn't open the page"],
      },
      {
        id: "2.2",
        prompt: "What kind of openings would actually pull you back daily?",
        type: "text",
      },
      {
        id: "2.3",
        prompt: "If you applied via the prefilled email link — did the draft help or get in the way?",
        type: "text",
      },
    ],
  },
  {
    id: "search",
    number: 3,
    title: "New: Universal Search (Cmd+K)",
    subtitle:
      "Site-wide command palette over firms, guides, tools, resources, and pages.",
    questions: [
      {
        id: "3.1",
        prompt: "Did you discover Cmd+K (or the floating search button) on your own?",
        type: "single",
        options: ["Yes, used it", "Saw it but didn't try", "Hearing about it now"],
      },
      {
        id: "3.2",
        prompt: "What was the first thing you searched for?",
        type: "text",
      },
      {
        id: "3.3",
        prompt: "Did the results match what you expected?",
        type: "scale",
        min: 1,
        max: 5,
        minLabel: "Way off",
        maxLabel: "Spot on",
      },
    ],
  },
  {
    id: "mobile-dock",
    number: 4,
    title: "Mobile Dock",
    subtitle: "The auto-hiding bottom navigation on phones.",
    questions: [
      {
        id: "4.1",
        prompt: "The dock hides when you scroll. How does that feel?",
        type: "single",
        options: ["Helpful", "Slightly annoying", "Very annoying", "Didn't notice"],
      },
      {
        id: "4.2",
        prompt: "Which dock destination do you tap most often?",
        type: "single",
        options: ["Home / Dashboard", "Directory", "The Bar", "Vacancies", "Profile", "Other"],
      },
      {
        id: "4.3",
        prompt: "What's missing from the dock that you wish was one tap away?",
        type: "text",
      },
    ],
  },
  {
    id: "the-bar-deep",
    number: 5,
    title: "The Bar — going deeper",
    subtitle: "You've now had a few days with it. The honest read.",
    questions: [
      {
        id: "5.1",
        prompt: "Has chasing accuracy / streak felt rewarding enough to keep coming back?",
        type: "scale",
        min: 1,
        max: 5,
        minLabel: "Not really",
        maxLabel: "Hooked",
      },
      {
        id: "5.2",
        prompt: "Which challenge type do you avoid, and why?",
        type: "text",
      },
      {
        id: "5.3",
        prompt: "Rit (the in-challenge AI) — used it again? Quality vs first time?",
        type: "single",
        options: ["Better", "About the same", "Worse", "Haven't used it again"],
      },
    ],
  },
  {
    id: "habits",
    number: 6,
    title: "Habits — the real signal",
    subtitle: "Stripping away opinions: what did you actually do?",
    questions: [
      {
        id: "6.1",
        prompt: "Roughly how many times did you open Locus in the past 7 days?",
        type: "single",
        options: ["0", "1–2", "3–5", "6+"],
      },
      {
        id: "6.2",
        prompt: "When you open Locus, where do you usually land first?",
        type: "single",
        options: [
          "Dashboard / Home",
          "The Bar",
          "Directory",
          "Vacancies",
          "Profile",
          "Tools",
          "Playbook",
          "Wherever the URL takes me",
        ],
      },
      {
        id: "6.3",
        prompt: "What is the one thing that brings you back?",
        type: "text",
      },
    ],
  },
  {
    id: "recommend",
    number: 7,
    title: "Recommend & willingness",
    subtitle: "No commitment — just the honest read.",
    questions: [
      {
        id: "7.1",
        prompt: "How likely are you to recommend Locus to a junior at your college?",
        type: "scale",
        min: 0,
        max: 10,
        minLabel: "Not at all",
        maxLabel: "Definitely",
        required: true,
      },
      {
        id: "7.2",
        prompt:
          "Hypothetically — if Locus had a paid tier one day, what would you actually pay for? (No commitment, no charge.)",
        type: "text",
      },
      {
        id: "7.3",
        prompt: "One feature you wish existed on Locus but doesn't yet.",
        type: "text",
      },
    ],
  },
  {
    id: "final",
    number: 8,
    title: "Final word",
    subtitle: "Anything we missed.",
    questions: [
      {
        id: "8.1",
        prompt:
          "Anything you flagged in Round 1 that we still haven't addressed?",
        type: "text",
      },
      {
        id: "8.2",
        prompt: "Free space — vent, praise, ideas. Whatever's on your mind.",
        type: "text",
      },
    ],
  },
];

export const R2_TOTAL_QUESTIONS = R2_SECTIONS.reduce(
  (n, s) => n + s.questions.length,
  0,
);
