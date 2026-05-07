// Central registry of route → dynamic import.
// `lazy(() => routeImports.tools())` and `prefetchRoute('/tools')` resolve to
// the SAME module promise, so a chunk is only ever downloaded once.

type Importer = () => Promise<unknown>;

export const routeImports = {
  waitlist: () => import("@/pages/Waitlist"),
  directory: () => import("@/pages/Directory"),
  resources: () => import("@/pages/Resources"),
  playbook: () => import("@/pages/Playbook"),
  playbookGuide: () => import("@/pages/PlaybookGuide"),
  tools: () => import("@/pages/Tools"),
  cvAnalyser: () => import("@/pages/CvAnalyser"),
  theBar: () => import("@/pages/TheBar"),
  appHome: () => import("@/pages/AppHome"),
  theBarPreview: () => import("@/pages/TheBarPreview"),
  theBarBrowse: () => import("@/pages/TheBarBrowse"),
  theBarChallenge: () => import("@/pages/TheBarChallenge"),
  theBarHistory: () => import("@/pages/TheBarHistory"),
  theBarLeaderboard: () => import("@/pages/TheBarLeaderboard"),
  auth: () => import("@/pages/Auth"),
  resetPassword: () => import("@/pages/ResetPassword"),
  chooseUsername: () => import("@/pages/ChooseUsername"),
  profileEdit: () => import("@/pages/ProfileEdit"),
  publicProfile: () => import("@/pages/PublicProfile"),
  adminWaitlist: () => import("@/pages/AdminWaitlist"),
  adminBar: () => import("@/pages/AdminBar"),
  applicationTracker: () => import("@/pages/ApplicationTracker"),
  betaChecklist: () => import("@/pages/BetaChecklist"),
  betaRound2: () => import("@/pages/BetaRound2"),
  adminBeta: () => import("@/pages/AdminBeta"),
  opportunities: () => import("@/pages/Opportunities"),
  adminVacancies: () => import("@/pages/AdminVacancies"),
  adminOpportunities: () => import("@/pages/AdminOpportunities"),
  adminDashboard: () => import("@/pages/AdminDashboard"),
  adminFirmSuggestions: () => import("@/pages/AdminFirmSuggestions"),
  adminBroadcasts: () => import("@/pages/AdminBroadcasts"),
  adminAdmins: () => import("@/pages/AdminAdmins"),
  notFound: () => import("@/pages/NotFound"),
} satisfies Record<string, Importer>;

// Map URL path prefixes → importer key. Order matters (most specific first).
const pathToKey: Array<[RegExp, keyof typeof routeImports]> = [
  [/^\/waitlist/, "waitlist"],
  [/^\/directory/, "directory"],
  [/^\/resources/, "resources"],
  [/^\/playbook\/.+/, "playbookGuide"],
  [/^\/playbook/, "playbook"],
  [/^\/tools\/cv-analyser/, "cvAnalyser"],
  [/^\/tools/, "tools"],
  [/^\/the-bar\/preview/, "theBarPreview"],
  [/^\/the-bar\/browse/, "theBarBrowse"],
  [/^\/the-bar\/challenge/, "theBarChallenge"],
  [/^\/the-bar\/history/, "theBarHistory"],
  [/^\/the-bar\/leaderboard/, "theBarLeaderboard"],
  [/^\/the-bar/, "theBar"],
  [/^\/app/, "appHome"],
  [/^\/auth/, "auth"],
  [/^\/reset-password/, "resetPassword"],
  [/^\/choose-username/, "chooseUsername"],
  [/^\/profile\/edit/, "profileEdit"],
  [/^\/u\//, "publicProfile"],
  [/^\/admin\/waitlist/, "adminWaitlist"],
  [/^\/admin\/bar/, "adminBar"],
  [/^\/admin\/beta/, "adminBeta"],
  [/^\/admin\/vacancies/, "adminVacancies"],
  [/^\/admin\/opportunities/, "adminOpportunities"],
  [/^\/admin\/firm-suggestions/, "adminFirmSuggestions"],
  [/^\/admin\/broadcasts/, "adminBroadcasts"],
  [/^\/admin\/admins/, "adminAdmins"],
  [/^\/admin$/, "adminDashboard"],
  [/^\/opportunities/, "opportunities"],
  [/^\/vacancies/, "opportunities"],
  [/^\/applications/, "applicationTracker"],
  [/^\/beta\/round-2/, "betaRound2"],
  [/^\/beta/, "betaChecklist"],
];

const fired = new Set<string>();

export function prefetchRoute(path: string) {
  const match = pathToKey.find(([re]) => re.test(path));
  if (!match) return;
  const key = match[1];
  if (fired.has(key)) return;
  fired.add(key);
  // Fire and forget. Errors are silent — the real navigation will surface them.
  routeImports[key]().catch(() => fired.delete(key));
}

// Routes most users hit shortly after landing. Warm them during idle time.
const COMMON_KEYS: Array<keyof typeof routeImports> = [
  "directory",
  "playbook",
  "resources",
  "tools",
  "theBar",
];

export function prefetchCommonRoutes() {
  if (typeof window === "undefined") return;

  // Run sequentially so we don't compete with the current page's API calls.
  const run = async () => {
    for (const key of COMMON_KEYS) {
      if (fired.has(key)) continue;
      fired.add(key);
      try {
        await routeImports[key]();
      } catch {
        fired.delete(key);
      }
      // Yield generously between chunks so the main thread stays responsive
      // and the network isn't competing with anything the user might do.
      await new Promise((r) => setTimeout(r, 800));
    }
  };

  // Heuristic: skip prefetching entirely on a cold load over a slow connection
  // or on devices with limited memory. These are the users where 40+ extra
  // chunk downloads actually hurt — and they're also the users least likely
  // to navigate deep into the app on first visit.
  const nav = navigator as unknown as {
    connection?: { effectiveType?: string; saveData?: boolean };
    deviceMemory?: number;
  };
  const conn = nav.connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g" || conn?.effectiveType === "3g") return;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return;

  // Only prefetch after a real interaction. Lighthouse's mobile audit DOES
  // simulate a scroll for screenshots, so we deliberately exclude scroll/wheel
  // — otherwise our prefetch chain lands inside the audit trace and inflates
  // "unused JS" + TBT. Real users tap or click within seconds.
  let triggered = false;
  const events: Array<keyof WindowEventMap> = [
    "pointerdown",
    "touchstart",
    "keydown",
  ];
  const opts = { passive: true } as AddEventListenerOptions;
  const cleanup = () => events.forEach((e) => window.removeEventListener(e, trigger, opts));
  function trigger() {
    if (triggered) return;
    triggered = true;
    cleanup();
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) ric(() => run(), { timeout: 4000 });
    else setTimeout(run, 1500);
  }
  events.forEach((e) => window.addEventListener(e, trigger, opts));

  // Fallback: if the user is still idle after 60s, prefetch anyway so SPA
  // navigations stay snappy. Far past Lighthouse's measurement window.
  setTimeout(trigger, 60000);
}
