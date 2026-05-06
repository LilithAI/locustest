import { useMemo, useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { guides, type Audience, type GuideMeta } from "@/content/playbook";
import { GuideCard } from "@/components/playbook/GuideCard";
import { StageSection } from "@/components/playbook/StageSection";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { BookOpen, Layers, Clock } from "lucide-react";

type Filter = "All" | Audience;
const filters: Filter[] = ["All", "Students", "Firms", "Institutions"];

// Stage order + subtitles. Any stage not listed here falls to the end as "Other".
const STAGE_ORDER: { key: string; subtitle: string }[] = [
  { key: "Before You Apply", subtitle: "Land the internship" },
  { key: "Once You're In", subtitle: "Make it count" },
  { key: "After It Ends", subtitle: "Convert it" },
  { key: "Firm Resources", subtitle: "For hiring teams" },
  { key: "Institution Resources", subtitle: "For placement cells" },
];

function parseReadMinutes(s: string): number {
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export default function Playbook() {
  usePageMeta({
    title: "The Playbook",
    description:
      "Step-by-step guides for law students, firms, and institutions — from landing internships to running legal ops. Read on Locus.",
    path: "/playbook",
  });

  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const { userId, rows, getStatus } = usePlaybookProgress();

  // Stats — derived from registry, only published
  const publishedGuides = useMemo(() => guides.filter((g) => !g.comingSoon), []);
  const publishedCount = publishedGuides.length;
  const stageCount = useMemo(
    () => new Set(publishedGuides.map((g) => g.stage)).size,
    [publishedGuides]
  );
  const avgReadMin = useMemo(() => {
    if (publishedGuides.length === 0) return 0;
    const total = publishedGuides.reduce((acc, g) => acc + parseReadMinutes(g.readTime), 0);
    return Math.round(total / publishedGuides.length);
  }, [publishedGuides]);

  // Continue-reading slot: most-recently-started, not-completed guide.
  // Falls back to "Start here" hero (LX-001) if none.
  const continueGuide: GuideMeta | null = useMemo(() => {
    if (!userId || rows.length === 0) return null;
    const inProgress = rows
      .filter((r) => !r.completed_at)
      .sort((a, b) => +new Date(b.last_read_at) - +new Date(a.last_read_at));
    for (const r of inProgress) {
      const g = publishedGuides.find((x) => x.slug === r.guide_slug);
      if (g) return g;
    }
    return null;
  }, [userId, rows, publishedGuides]);

  const startHereGuide: GuideMeta | null = useMemo(() => {
    if (continueGuide) return null;
    return publishedGuides.find((g) => g.slug === "cold-email-law-firm") ?? publishedGuides[0] ?? null;
  }, [continueGuide, publishedGuides]);

  const heroGuide = continueGuide ?? startHereGuide;
  const heroLabel: "START HERE" | "CONTINUE READING" =
    continueGuide ? "CONTINUE READING" : "START HERE";

  // Filtered (audience) — applied to grouped grid + coming-next rail
  const filteredPublished = useMemo(
    () => publishedGuides.filter((g) => activeFilter === "All" || g.audience === activeFilter),
    [publishedGuides, activeFilter]
  );

  const groupedByStage = useMemo(() => {
    const map = new Map<string, GuideMeta[]>();
    for (const g of filteredPublished) {
      // Don't repeat the hero in the grouped grid below
      if (heroGuide && g.slug === heroGuide.slug) continue;
      const arr = map.get(g.stage) ?? [];
      arr.push(g);
      map.set(g.stage, arr);
    }
    return map;
  }, [filteredPublished, heroGuide]);

  const comingNext = useMemo(
    () =>
      guides
        .filter((g) => g.comingSoon)
        .filter((g) => activeFilter === "All" || g.audience === activeFilter),
    [activeFilter]
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="mb-8 max-w-3xl">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">
            CASE FILE SYSTEM
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            The Locus <span className="text-accent">Playbook</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            A growing course on the legal internship game in India — read on the site,
            no downloads required. {publishedCount} guides live, more coming each week.
          </p>
        </header>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
          <StatCard icon={<BookOpen size={16} />} value={String(publishedCount)} label="Guides live" />
          <StatCard icon={<Layers size={16} />} value={String(stageCount)} label="Stages covered" />
          <StatCard icon={<Clock size={16} />} value={`~${avgReadMin}`} label="Min avg read" />
        </div>

        {/* Hero guide (Continue or Start here) */}
        {heroGuide && (
          <div className="mb-10">
            <GuideCard
              guide={heroGuide}
              status={getStatus(heroGuide.slug)}
              showStatus={!!userId}
              variant="hero"
              heroLabel={heroLabel}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                activeFilter === f
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grouped grid by stage */}
        {STAGE_ORDER.map(({ key, subtitle }) => {
          const list = groupedByStage.get(key) ?? [];
          if (list.length === 0) return null;
          return (
            <StageSection key={key} title={key} subtitle={subtitle} count={list.length}>
              {list.map((g) => (
                <GuideCard
                  key={g.slug}
                  guide={g}
                  status={getStatus(g.slug)}
                  showStatus={!!userId}
                />
              ))}
            </StageSection>
          );
        })}

        {/* Empty state for filter */}
        {Array.from(groupedByStage.values()).every((arr) => arr.length === 0) &&
          (!heroGuide ||
            (activeFilter !== "All" && heroGuide.audience !== activeFilter)) && (
            <div className="text-center py-16 text-muted-foreground">
              No published guides for this filter yet.
            </div>
          )}

        {/* Coming next rail */}
        {comingNext.length > 0 && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Coming Next
              </p>
              <span className="text-[11px] text-muted-foreground">
                Vote for what we should ship first
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {comingNext.map((g) => (
                <GuideCard
                  key={g.slug}
                  guide={g}
                  status="unread"
                  showStatus={false}
                  variant="compact"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-5 shadow-[3px_3px_0_0_hsl(var(--border))]">
      <div className="flex items-center gap-2 text-accent mb-2">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
        {value}
      </div>
      <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
