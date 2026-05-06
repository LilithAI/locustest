import { useState } from "react";
import { Search, UserCircle2, Briefcase, Trophy, Compass, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TourProvider, useTour } from "@/components/tour/TourProvider";
import WelcomeModal from "@/components/tour/WelcomeModal";
import type { TourStep } from "@/components/tour/types";
import { usePageMeta } from "@/hooks/usePageMeta";

const DEMO_STEPS: TourStep[] = [
  {
    target: '[data-tour="search"]',
    title: "Search anything",
    body: "Press Cmd+K to jump anywhere — firms, guides, opportunities, tools.",
    placement: "bottom",
  },
  {
    target: '[data-tour="profile"]',
    title: "Build your profile",
    body: "A complete profile gets 3× more responses from firms. Start with the basics, layer in CV and academics.",
    placement: "right",
  },
  {
    target: '[data-tour="pipeline"]',
    title: "Track applications",
    body: "Log every firm you apply to. Locus nudges you when it's time to follow up.",
    placement: "top",
  },
  {
    target: '[data-tour="bar"]',
    title: "The Bar",
    body: "Daily legal challenges. Climb the leaderboard and prove your skill.",
    placement: "left",
  },
  {
    target: '[data-tour="opportunities"]',
    title: "Opportunities",
    body: "Vacancies, CFPs, moots, competitions — every opening worth your time, in one feed.",
    placement: "top",
  },
];

const STORAGE_KEY = "tour_lab_completed";

function FakeDashboard() {
  const { start, running, stepIndex, steps } = useTour();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [showWelcomeFirst, setShowWelcomeFirst] = useState(true);
  const [completed, setCompleted] = useState(
    typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );

  const handleStart = () => {
    if (showWelcomeFirst) {
      setWelcomeOpen(true);
    } else {
      start(DEMO_STEPS);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCompleted(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Control bar — offset below the fixed global navbar */}
      <div className="sticky top-16 z-30 mt-16 mx-4 md:mx-6 border-2 border-foreground/80 bg-card/95 backdrop-blur rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div>
            <div className="font-heading text-sm font-extrabold uppercase tracking-wider text-foreground">
              Tour Lab
            </div>
            <div className="text-[11px] text-muted-foreground">
              Internal QA · /tour-lab
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={showWelcomeFirst}
              onCheckedChange={setShowWelcomeFirst}
              id="welcome-toggle"
            />
            <label htmlFor="welcome-toggle" className="cursor-pointer">
              Welcome modal first
            </label>
          </div>
          {running && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              Step {stepIndex + 1} / {steps.length}
            </span>
          )}
          {completed && !running && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Completed
            </span>
          )}
          <Button variant="neutral" size="sm" onClick={handleReset}>
            <RotateCcw size={14} />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={handleStart}>
            <Play size={14} />
            Start tour
          </Button>
        </div>
      </div>

      {/* Fake dashboard */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top bar with fake search */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Loc<span className="text-accent">us</span>
          </div>
          <button
            data-tour="search"
            className="flex items-center gap-2 px-3 py-2 border-2 border-foreground/80 bg-card rounded-lg text-sm text-muted-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
          >
            <Search size={14} />
            <span>Search Locus…</span>
            <kbd className="ml-2 font-mono text-[10px] px-1.5 py-0.5 border border-muted-foreground/40 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-5">
          {/* Profile strength */}
          <div
            data-tour="profile"
            className="border-2 border-foreground/80 bg-card rounded-2xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
          >
            <div className="flex items-center gap-2 mb-3">
              <UserCircle2 size={18} className="text-accent" />
              <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider">
                Profile strength
              </h3>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">62/100</div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div className="h-full bg-accent" style={{ width: "62%" }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Add your CV and academics to reach 80+.
            </p>
          </div>

          {/* The Bar tile */}
          <div
            data-tour="bar"
            className="border-2 border-foreground/80 bg-card rounded-2xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] md:col-span-2"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-accent" />
              <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider">
                The Bar · Today
              </h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground font-semibold mb-1">
                  Constitutional law · 5 questions
                </div>
                <div className="text-xs text-muted-foreground">
                  Rank #134 · 2,847 lawyers attempted today
                </div>
              </div>
              <Button variant="default" size="sm">
                Attempt
              </Button>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div
          data-tour="pipeline"
          className="border-2 border-foreground/80 bg-card rounded-2xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] mb-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-accent" />
            <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider">
              Application pipeline
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Applied", value: 12, tone: "muted" },
              { label: "In review", value: 4, tone: "accent" },
              { label: "Interview", value: 2, tone: "accent" },
              { label: "Offered", value: 1, tone: "accent" },
            ].map((s) => (
              <div
                key={s.label}
                className="border-2 border-foreground/40 rounded-lg p-3 bg-muted/20"
              >
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities */}
        <div
          data-tour="opportunities"
          className="border-2 border-foreground/80 bg-card rounded-2xl p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-accent" />
              <h3 className="font-heading text-sm font-extrabold uppercase tracking-wider">
                New opportunities
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
              7 new
            </span>
          </div>
          <div className="space-y-2">
            {[
              { t: "Junior Associate · M&A", o: "Khaitan & Co", k: "Vacancy" },
              { t: "Call for Papers · IP Law Review", o: "NLSIU Bangalore", k: "CFP" },
              { t: "National Moot · Constitutional Law", o: "GNLU Gandhinagar", k: "Moot" },
            ].map((o) => (
              <div
                key={o.t}
                className="flex items-center justify-between border-2 border-foreground/30 rounded-lg p-3 bg-muted/10"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground">{o.t}</div>
                  <div className="text-xs text-muted-foreground">{o.o}</div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-foreground/40 rounded">
                  {o.k}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          This is a sandboxed preview. Click <strong>Start tour</strong> to walk through it.
        </p>
      </div>

      <WelcomeModal
        open={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        onStartTour={() => {
          setWelcomeOpen(false);
          // Defer slightly so modal close animation doesn't fight overlay mount
          setTimeout(() => start(DEMO_STEPS), 150);
        }}
      />
    </div>
  );
}

export default function TourLab() {
  usePageMeta({
    title: "Tour Lab · Locus",
    description: "Internal sandbox for the Locus product tour.",
    path: "/tour-lab",
  });

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <TourProvider onFinish={handleFinish} onSkip={handleFinish}>
      <FakeDashboard />
    </TourProvider>
  );
}
