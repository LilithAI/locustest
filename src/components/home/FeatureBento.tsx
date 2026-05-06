import { Link } from "react-router-dom";
import {
  Building2,
  Swords,
  BookOpen,
  FileText,
  Wrench,
  ListChecks,
  UserCircle2,
  ArrowUpRight,
  Plus,
  Scale,
  FileSearch,
} from "lucide-react";
import { TimelineContent, textVariants } from "@/components/ui/timeline-animation";

/* ---------- shared tile shell ---------- */
type TileShellProps = {
  to: string;
  className?: string;
  bg?: "dark" | "yellow" | "white" | "black";
  texture?: "stripes" | "dots" | "none";
  index: number;
  children: React.ReactNode;
};

const bgMap: Record<NonNullable<TileShellProps["bg"]>, string> = {
  dark: "bg-card text-foreground",
  yellow: "bg-accent text-accent-foreground",
  white: "bg-white text-black",
  black: "bg-black text-white",
};

function TileShell({ to, className = "", bg = "dark", texture = "none", index, children }: TileShellProps) {
  return (
    <TimelineContent index={index} className={className}>
      <Link
        to={to}
        className={`group relative flex h-full min-h-[220px] w-full flex-col overflow-hidden rounded-xl border-2 border-foreground p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_hsl(var(--accent))] ${bgMap[bg]}`}
      >
        {texture === "stripes" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 12px)",
            }}
          />
        )}
        {texture === "dots" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage: "radial-gradient(currentColor 1px, transparent 1.4px)",
              backgroundSize: "14px 14px",
            }}
          />
        )}
        <div className="relative z-10 flex h-full flex-col">{children}</div>
      </Link>
    </TimelineContent>
  );
}

/* ---------- header row ---------- */
function TileHeader({
  Icon,
  badge,
  iconClass = "bg-accent/15 border-accent/30 text-accent",
  badgeClass = "bg-accent text-accent-foreground",
  arrowClass = "text-foreground/50 group-hover:text-accent",
}: {
  Icon: React.ElementType;
  badge?: string;
  iconClass?: string;
  badgeClass?: string;
  arrowClass?: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className={`rounded-lg border p-2.5 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span
            className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
          >
            {badge}
          </span>
        )}
        <ArrowUpRight className={`h-4 w-4 transition-colors ${arrowClass}`} />
      </div>
    </div>
  );
}

/* ---------- tile bodies ---------- */

function DirectoryTile({ index }: { index: number }) {
  return (
    <TileShell to="/directory" bg="yellow" index={index} className="md:col-span-2 md:row-span-2">
      <TileHeader
        Icon={Building2}
        badge="Flagship"
        iconClass="bg-black/10 border-black/30 text-black"
        badgeClass="bg-black text-accent"
        arrowClass="text-black/60 group-hover:text-black"
      />

      {/* Faux India silhouette — flex middle, scales with tile */}
      <div className="relative my-4 flex min-h-[140px] flex-1 items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 200 220"
          className="h-full max-h-[220px] w-auto opacity-90"
          aria-hidden
        >
          <path
            d="M70 10 L110 18 L140 12 L160 30 L175 55 L168 80 L182 95 L170 120 L150 140 L140 170 L120 200 L100 215 L88 200 L78 175 L62 160 L40 145 L25 120 L18 95 L28 70 L20 45 L40 30 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray="3 4"
          />
          {[
            [60, 50],
            [110, 60],
            [80, 95],
            [130, 110],
            [95, 140],
            [115, 175],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.5" fill="currentColor" />
          ))}
        </svg>
      </div>

      <div className="mt-4 shrink-0">
        <div className="font-heading text-[clamp(40px,7vw,72px)] font-black leading-none tracking-tight">
          3,890
        </div>
        <div className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80 sm:text-sm">
          firms · 28 cities · updated daily
        </div>
        <h3 className="font-heading mt-3 text-2xl font-extrabold">Directory</h3>
        <p className="mt-1 text-sm opacity-80">
          Search, filter, and compare firms across India.
        </p>
      </div>
    </TileShell>
  );
}

function TheBarTile({ index }: { index: number }) {
  const rows = [
    { rank: 1, name: "arjun.m", pts: "3,142" },
    { rank: 2, name: "priya.s", pts: "2,901" },
    { rank: 3, name: "riya.k", pts: "2,847" },
  ];
  return (
    <TileShell to="/the-bar" bg="black" index={index} className="md:col-span-2 md:row-span-2">
      <TileHeader
        Icon={Swords}
        badge="Locus+"
        iconClass="bg-accent/20 border-accent/40 text-accent"
        badgeClass="bg-accent text-black"
        arrowClass="text-white/50 group-hover:text-accent"
      />

      <div className="relative my-4 min-h-[150px] flex-1 overflow-hidden">
        {/* Floating + badges — contained */}
        <Plus className="absolute right-2 top-1 h-4 w-4 text-accent opacity-70" strokeWidth={3} />
        <Plus className="absolute right-10 top-1/3 h-3 w-3 text-accent opacity-50" strokeWidth={3} />

        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.rank}
              className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 transition-colors group-hover:border-accent/40"
            >
              <div className="flex items-center gap-3">
                <span className="font-heading w-6 text-sm font-black text-accent">
                  #{r.rank}
                </span>
                <span className="font-mono text-sm text-white/90">{r.name}</span>
              </div>
              <span className="font-heading text-sm font-extrabold text-white">{r.pts}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 shrink-0">
        <h3 className="font-heading text-2xl font-extrabold text-white">The Bar</h3>
        <p className="mt-1 text-sm text-white/70">
          Daily skill challenges. Climb the leaderboard. Prove yourself on merit.
        </p>
      </div>
    </TileShell>
  );
}

function PlaybookTile({ index }: { index: number }) {
  return (
    <TileShell to="/playbook" bg="dark" index={index} className="md:col-span-2">
      <TileHeader Icon={BookOpen} />
      <div className="relative my-4 min-h-[72px] flex-1 overflow-hidden">
        {/* Stacked case-file papers — fully inside bounds */}
        <div className="absolute inset-x-0 top-3 h-12 -rotate-2 rounded border-2 border-foreground bg-background/60" />
        <div className="absolute inset-x-2 top-1.5 h-12 rotate-1 rounded border-2 border-foreground bg-card" />
        <div className="absolute inset-x-4 top-0 h-12 rounded border-2 border-foreground bg-accent/15 px-2.5 py-1.5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
            LX-001 · Cold Email
          </div>
          <div className="mt-1 h-1 w-3/4 rounded bg-foreground/30" />
        </div>
      </div>
      <div className="mt-4 shrink-0">
        <h3 className="font-heading text-xl font-extrabold">Playbook</h3>
        <p className="mt-1 text-sm text-foreground/70">
          Field-tested guides for cold emails, interviews, and your first internship.
        </p>
      </div>
    </TileShell>
  );
}

function ResourcesTile({ index }: { index: number }) {
  return (
    <TileShell to="/resources" bg="white" index={index} className="md:col-span-1">
      <TileHeader
        Icon={FileText}
        iconClass="bg-black/5 border-black/20 text-black"
        arrowClass="text-black/50 group-hover:text-black"
      />
      <div className="relative my-3 min-h-[80px] flex-1 overflow-hidden">
        <div className="font-heading text-[clamp(36px,6vw,52px)] font-black leading-none tracking-tight text-black">
          8
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-black/60">
          templates
        </div>
        {/* Faux PDF peeking — inside tile bounds */}
        <div className="absolute bottom-1 right-1 h-14 w-11 rotate-6 rounded border-2 border-black bg-white p-1.5 shadow-[3px_3px_0_0_#000]">
          <div className="h-1 w-3/4 rounded bg-black/70" />
          <div className="mt-1 h-1 w-full rounded bg-black/30" />
          <div className="mt-1 h-1 w-2/3 rounded bg-black/30" />
          <div className="mt-2 h-1 w-1/2 rounded bg-accent" />
        </div>
      </div>
      <div className="mt-3 shrink-0">
        <h3 className="font-heading text-lg font-extrabold text-black">Resources</h3>
      </div>
    </TileShell>
  );
}

function ToolsTile({ index }: { index: number }) {
  return (
    <TileShell to="/tools" bg="dark" texture="stripes" index={index} className="md:col-span-1">
      <TileHeader Icon={Wrench} />
      <div className="my-3 min-h-[80px] flex-1 overflow-hidden">
        <div className="font-heading text-[clamp(36px,6vw,52px)] font-black leading-none tracking-tight text-foreground">
          10
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">
          legal tools
        </div>
      </div>
      <div className="mt-3 shrink-0">
        <h3 className="font-heading text-lg font-extrabold">Tools</h3>
        <p className="mt-1 text-xs text-foreground/60">NDA · DPA · Contracts</p>
      </div>
    </TileShell>
  );
}

function TrackerTile({ index }: { index: number }) {
  return (
    <TileShell to="/applications" bg="dark" index={index} className="md:col-span-2">
      <TileHeader Icon={ListChecks} />
      <div className="my-4 min-h-[60px] flex-1 space-y-3 overflow-hidden">
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-[68%] rounded-full bg-accent transition-all duration-700 group-hover:w-[82%]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
            Applied 12
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            Interview 3
          </span>
          <span className="rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
            Offer 1
          </span>
        </div>
      </div>
      <div className="mt-4 shrink-0">
        <h3 className="font-heading text-xl font-extrabold">Tracker</h3>
        <p className="mt-1 text-sm text-foreground/70">
          Log every application. Get nudged on stale follow-ups.
        </p>
      </div>
    </TileShell>
  );
}

function ProfileTile({ index }: { index: number }) {
  return (
    <TileShell to="/profile/edit" bg="dark" texture="dots" index={index} className="md:col-span-2">
      <TileHeader Icon={UserCircle2} />
      <div className="my-4 min-h-[64px] flex-1 overflow-hidden">
        <div className="flex items-center gap-2.5 rounded-lg border-2 border-foreground/15 bg-background/60 p-2.5">
          <div className="font-heading flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-accent text-sm font-black text-accent-foreground">
            RK
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading truncate text-sm font-extrabold">riya.k</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                Top 5%
              </span>
              <span className="rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/70">
                12 internships
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 shrink-0">
        <h3 className="font-heading text-xl font-extrabold">Public Profile</h3>
        <p className="mt-1 text-sm text-foreground/70">
          A merit-first profile firms actually want to read.
        </p>
      </div>
    </TileShell>
  );
}

/* ---------- CV Analyser — Locus+ flagship ---------- */
function CvAnalyserTile({ index }: { index: number }) {
  return (
    <TileShell to="/tools/cv-analyser" bg="dark" index={index} className="md:col-span-2">
      <TileHeader
        Icon={FileSearch}
        badge="Locus+"
        iconClass="bg-accent/15 border-accent/40 text-accent"
        badgeClass="bg-accent text-black"
      />

      {/* Three score rings — the 3-vector visual */}
      <div className="relative my-4 flex min-h-[100px] flex-1 items-center justify-around overflow-hidden">
        {[
          { label: "Corp", score: 84, dash: 84 },
          { label: "Lit", score: 71, dash: 71 },
          { label: "In-house", score: 78, dash: 78 },
        ].map((v, i) => {
          const C = 2 * Math.PI * 22; // r=22
          return (
            <div key={v.label} className="flex flex-col items-center gap-1.5">
              <div className="relative h-14 w-14">
                <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/15" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="square"
                    strokeDasharray={C}
                    strokeDashoffset={C - (v.dash / 100) * C}
                    className={i === 0 ? "text-accent transition-all duration-700 group-hover:[stroke-dashoffset:0]" : "text-foreground/60"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-heading text-xs font-black tabular-nums">
                  {v.score}
                </div>
              </div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground/60">
                {v.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 shrink-0">
        <h3 className="font-heading text-xl font-extrabold">CV Analyser</h3>
        <p className="mt-1 text-sm text-foreground/70">
          Partner-voice scoring across 3 vectors. BCI Rule 25, NLU tiers, Elite Six benchmarks.
        </p>
      </div>
    </TileShell>
  );
}
function ExhibitATile({ index }: { index: number }) {
  return (
    <TileShell to="/directory" bg="yellow" index={index} className="md:col-span-2 md:row-span-2">
      <TileHeader
        Icon={Scale}
        badge="Exhibit A"
        iconClass="bg-black/10 border-black/30 text-black"
        badgeClass="bg-black text-accent"
        arrowClass="text-black/60 group-hover:text-black"
      />
      <div className="mt-4 shrink-0">
        <div className="font-heading text-[clamp(48px,9vw,88px)] font-black leading-[0.9] tracking-tight tabular-nums text-black">
          5,00,000
        </div>
        <div className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black/70">
          Law students · India · 2025
        </div>
      </div>
      <div className="my-4 h-[2px] w-full bg-black/80" />
      <ul className="shrink-0 space-y-2.5 font-mono text-sm text-black">
        <li className="flex items-baseline gap-4">
          <span className="font-heading w-20 text-2xl font-black tabular-nums">26</span>
          <span className="opacity-80">NLUs in India</span>
        </li>
        <li className="flex items-baseline gap-4">
          <span className="font-heading w-20 text-2xl font-black tabular-nums">3,890</span>
          <span className="opacity-80">firms in our directory</span>
        </li>
        <li className="flex items-baseline gap-4">
          <span className="font-heading w-20 text-2xl font-black tabular-nums">1</span>
          <span className="opacity-80">platform for everyone else</span>
        </li>
      </ul>
    </TileShell>
  );
}

/* ---------- section ---------- */
export default function FeatureBento() {
  return (
    <section id="features" className="bg-background px-4 py-24">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <TimelineContent index={0} variants={textVariants}>
            <p className="font-heading mb-3 text-sm uppercase tracking-widest text-accent">
              What's inside
            </p>
          </TimelineContent>
          <TimelineContent index={1} variants={textVariants}>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              One platform. Every tool that matters.
            </h2>
          </TimelineContent>
          <TimelineContent index={2} variants={textVariants}>
            <p className="mx-auto mt-4 max-w-2xl text-foreground/70">
              Locus pulls together the directory, the practice, the templates, and the tracker — so
              you stop juggling tabs and start shipping work.
            </p>
          </TimelineContent>
        </div>

        <div className="grid grid-cols-1 gap-4 md:auto-rows-auto md:grid-cols-4">
          <DirectoryTile index={0} />
          <TheBarTile index={1} />
          <ExhibitATile index={2} />
          <PlaybookTile index={3} />
          <CvAnalyserTile index={4} />
          <ResourcesTile index={5} />
          <ToolsTile index={6} />
          <TrackerTile index={7} />
          <ProfileTile index={8} />
        </div>
      </div>
    </section>
  );
}
