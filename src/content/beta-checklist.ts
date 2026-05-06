// Single source of truth for the closed-beta tester checklist.
// Mirrors the structure of the PDF at /mnt/documents/locus-beta-checklist.pdf
// so future edits live in one place.

export type BetaTask = {
  id: string;
  title: string;
  detail: string;
};

export type BetaStage = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  estMinutes: number;
  tasks: BetaTask[];
};

// Rotating intro lines — one is randomly assigned at slot-claim time so
// each tester sees a different headline on their cinematic intro screen.
export const INTRO_LINES: string[] = [
  "Locus is in your hands for the next 30 minutes.",
  "You're seeing this before the world does.",
  "Your notes shape the launch. No filter.",
  "Built for law students. Tested by you first.",
  "The bench is open. Take a seat.",
  "Break it. We'd rather know now.",
  "First in. Last to leave the credits.",
  "Founding means founding. Forever.",
];

export const BETA_STAGES: BetaStage[] = [
  {
    id: "first-impression",
    number: 1,
    title: "First Impression",
    subtitle: "Land cold. No login. Just look around.",
    estMinutes: 4,
    tasks: [
      {
        id: "1.1",
        title: "Open locus.legal in a fresh tab",
        detail:
          "Did the homepage load fast and feel coherent? Note anything that breaks, jumps, or looks off on first load.",
      },
      {
        id: "1.2",
        title: "Browse the Directory as a guest",
        detail:
          "Open /directory. Try the India map, search bar, and filters. Open one firm. Does anything feel slow, wrong, or confusing?",
      },
      {
        id: "1.3",
        title: "Read one Playbook guide",
        detail:
          "Go to /playbook and open any guide. Scroll the full thing. Check the sidebar TOC and progress bar behaviour.",
      },
    ],
  },
  {
    id: "signup-profile",
    number: 2,
    title: "Sign up & Build Profile",
    subtitle: "Make an account. Fill out who you are.",
    estMinutes: 6,
    tasks: [
      {
        id: "2.1",
        title: "Sign up with Google or Email",
        detail:
          "Use /auth. Test whichever method you'd actually use. Did you land on the right next page after signup?",
      },
      {
        id: "2.2",
        title: "Pick your username",
        detail:
          "On /choose-username, try a taken name, then claim a real one. Was the validation clear?",
      },
      {
        id: "2.3",
        title: "Complete your profile",
        detail:
          "Go to /profile/edit. Fill college, degree, year, CGPA, subjects of interest. Add one internship, one moot, one publication. Watch the Profile Strength meter move.",
      },
      {
        id: "2.4",
        title: "Upload your CV",
        detail:
          "Drop a PDF in the CV section. Did upload + preview work cleanly?",
      },
    ],
  },
  {
    id: "public-profile",
    number: 3,
    title: "Public Profile",
    subtitle: "See yourself the way a recruiter would.",
    estMinutes: 3,
    tasks: [
      {
        id: "3.1",
        title: "Open your public profile",
        detail:
          "Visit /u/your-username in a private window (logged out). Does it show your data correctly? Anything missing or messy?",
      },
      {
        id: "3.2",
        title: "Toggle Open to Opportunities",
        detail:
          "On /profile/edit, switch the toggle on, save, and reload your public profile. Does the badge appear?",
      },
    ],
  },
  {
    id: "the-bar",
    number: 4,
    title: "The Bar — Skill Challenges",
    subtitle: "The core daily-use loop. Spend the most time here.",
    estMinutes: 8,
    tasks: [
      {
        id: "4.1",
        title: "Try at least 3 different challenge types",
        detail:
          "From /the-bar, browse and attempt any 3 of: MCQ, Issue Spotter, Speed Round, Jurisdiction, Document Review, Brief Builder, Client Counseling, Ethics. Note any renderer that broke.",
      },
      {
        id: "4.2",
        title: "Talk to Rit (the in-challenge AI)",
        detail:
          "On any challenge with the Rit panel, ask 2–3 questions. Was the response useful? Did it feel fast?",
      },
      {
        id: "4.3",
        title: "Check your stats and rank",
        detail:
          "Open /the-bar (your dashboard) and /the-bar/leaderboard. Do your points, accuracy, streak, and rank look right?",
      },
      {
        id: "4.4",
        title: "Review your attempt history",
        detail:
          "Go to /the-bar/history. Open one past attempt — does the review dialog show what you submitted vs the answer?",
      },
    ],
  },
  {
    id: "internship-hunting",
    number: 5,
    title: "Internship Hunting",
    subtitle: "From discovery to tracking.",
    estMinutes: 5,
    tasks: [
      {
        id: "5.1",
        title: "Compare 3 firms in the Directory",
        detail:
          "On /directory, add 3 firms to the Compare Bar at the bottom. Does the comparison view help you actually decide?",
      },
      {
        id: "5.2",
        title: "Log an application",
        detail:
          "Open /applications. Log one application (firm, role, method, status). Try changing its status. Do the stats strip and insights update?",
      },
      {
        id: "5.3",
        title: "Read the nudge banner",
        detail:
          "Look at the banner above your applications. Does the suggestion feel relevant or random?",
      },
    ],
  },
  {
    id: "level-up",
    number: 6,
    title: "Learning & Level Up",
    subtitle: "Tools, drafters, and CV feedback.",
    estMinutes: 4,
    tasks: [
      {
        id: "6.1",
        title: "Mark a Playbook guide complete",
        detail:
          "On any /playbook/:slug page, hit Mark Complete. Go back to /playbook — does progress show?",
      },
      {
        id: "6.2",
        title: "Run the CV Analyser",
        detail:
          "Visit /tools/cv-analyser. Use your uploaded CV (or a fresh one). Was the score + feedback meaningful?",
      },
      {
        id: "6.3",
        title: "Open one document drafter",
        detail:
          "From /tools, open any active drafter (NDA / DPA / Internship / etc). Does it load? Skip generation if you don't want to.",
      },
      {
        id: "6.4",
        title: "Download one resource",
        detail:
          "Visit /resources. Preview one template, then download it. Did both work?",
      },
    ],
  },
  {
    id: "wrap",
    number: 7,
    title: "Wrap-up",
    subtitle: "Mobile, sign out, edge cases.",
    estMinutes: 3,
    tasks: [
      {
        id: "7.1",
        title: "Use Locus on your phone",
        detail:
          "Open the site on mobile. Try the bottom dock. Visit Directory, The Bar, Profile. Anything cramped or broken?",
      },
      {
        id: "7.2",
        title: "Sign out, then sign back in",
        detail:
          "From the profile menu, sign out. Sign back in. Did your session, profile, and stats restore correctly?",
      },
      {
        id: "7.3",
        title: "Try the password reset flow (Email signups only)",
        detail:
          "On /auth, click Forgot Password. Did you receive the email and can you set a new password? Skip if you signed up with Google/Apple.",
      },
      {
        id: "7.4",
        title: "Hit a wrong URL",
        detail:
          "Type something like /this-does-not-exist. Does the 404 page appear and let you get back home?",
      },
    ],
  },
];

export const TOTAL_TASKS = BETA_STAGES.reduce(
  (sum, stage) => sum + stage.tasks.length,
  0,
);

export const ACCESS_CODE = "LOCUS-CB-2026";
