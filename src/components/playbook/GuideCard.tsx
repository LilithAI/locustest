import { Link } from "react-router-dom";
import { Clock, Layers, Check, Lock, ArrowRight } from "lucide-react";
import type { GuideMeta, Audience } from "@/content/playbook";
import { prefetchRoute } from "@/lib/prefetch";

const audienceTagStyles: Record<Audience, string> = {
  Students: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Firms: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Institutions: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

type Variant = "default" | "hero" | "compact";

interface Props {
  guide: GuideMeta;
  status: "unread" | "started" | "completed";
  showStatus: boolean;
  variant?: Variant;
  /** Label shown on the hero variant's badge. */
  heroLabel?: "START HERE" | "CONTINUE READING";
}

export function GuideCard({
  guide,
  status,
  showStatus,
  variant = "default",
  heroLabel = "START HERE",
}: Props) {
  const isComingSoon = guide.comingSoon;

  if (variant === "hero" && !isComingSoon) {
    return <HeroCard guide={guide} status={status} showStatus={showStatus} heroLabel={heroLabel} />;
  }

  if (variant === "compact") {
    return <CompactCard guide={guide} />;
  }

  // Default
  const inner = (
    <article
      className={`group relative h-full flex flex-col rounded-xl border-2 p-5 transition-all overflow-hidden ${
        isComingSoon
          ? "border-border bg-card/40 opacity-60"
          : "border-border bg-card hover:border-accent/60 hover:shadow-[4px_4px_0_0_hsl(var(--accent))] hover:-translate-y-0.5"
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          {guide.caseNumber}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${audienceTagStyles[guide.audience]}`}
        >
          {guide.audience}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 mb-2">
        {guide.title}
      </h3>

      {/* Stage */}
      <p className="text-xs text-muted-foreground mb-3">{guide.stage}</p>

      {/* Hover-only preview bullets (default variant, not coming-soon) */}
      {!isComingSoon && guide.sections.length > 0 && (
        <ul className="hidden sm:block space-y-1 max-h-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:max-h-32 group-hover:opacity-100 group-focus-within:max-h-32 group-focus-within:opacity-100 mb-3">
          {guide.sections.slice(0, 3).map((s) => (
            <li
              key={s}
              className="text-[11px] text-muted-foreground leading-snug pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-accent line-clamp-1"
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="flex-1" />

      {/* Meta footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> {guide.readTime}
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers size={11} /> {guide.sections.length} parts
          </span>
        </div>

        {isComingSoon ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Lock size={10} /> Soon
          </span>
        ) : showStatus && status === "completed" ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : showStatus && status === "started" ? (
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-accent"
            aria-label="In progress"
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
          </span>
        ) : null}
      </div>
    </article>
  );

  if (isComingSoon) {
    return <div className="block h-full">{inner}</div>;
  }

  return (
    <Link
      to={`/playbook/${guide.slug}`}
      onMouseEnter={() => prefetchRoute(`/playbook/${guide.slug}`)}
      onFocus={() => prefetchRoute(`/playbook/${guide.slug}`)}
      onTouchStart={() => prefetchRoute(`/playbook/${guide.slug}`)}
      className="block h-full"
    >
      {inner}
    </Link>
  );
}

/* -------------------- Hero variant -------------------- */
function HeroCard({
  guide,
  status,
  showStatus,
  heroLabel,
}: {
  guide: GuideMeta;
  status: "unread" | "started" | "completed";
  showStatus: boolean;
  heroLabel: "START HERE" | "CONTINUE READING";
}) {
  return (
    <Link
      to={`/playbook/${guide.slug}`}
      onMouseEnter={() => prefetchRoute(`/playbook/${guide.slug}`)}
      onFocus={() => prefetchRoute(`/playbook/${guide.slug}`)}
      onTouchStart={() => prefetchRoute(`/playbook/${guide.slug}`)}
      className="block h-full group"
    >
      <article className="relative h-full rounded-xl border-2 border-accent bg-card p-6 sm:p-8 transition-all hover:shadow-[6px_6px_0_0_hsl(var(--accent))] hover:-translate-y-0.5 overflow-hidden">
        {/* Subtle accent corner glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent/10 blur-3xl" />

        {/* Top labels */}
        <div className="relative flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent text-accent-foreground text-[10px] font-bold tracking-[0.15em]">
            {heroLabel}
          </span>
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
            {guide.caseNumber}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${audienceTagStyles[guide.audience]}`}
          >
            {guide.audience}
          </span>
          {showStatus && status === "started" && heroLabel === "CONTINUE READING" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              In progress
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="relative text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-3">
          {guide.title}
        </h3>

        {/* Stage */}
        <p className="relative text-sm text-muted-foreground mb-5">
          {guide.stage} · {guide.readTime} read · {guide.sections.length} parts
        </p>

        {/* Section preview bullets */}
        {guide.sections.length > 0 && (
          <ul className="relative space-y-2 mb-6">
            {guide.sections.slice(0, 3).map((s) => (
              <li
                key={s}
                className="text-sm text-foreground/80 leading-snug pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent"
              >
                {s}
              </li>
            ))}
            {guide.sections.length > 3 && (
              <li className="text-xs text-muted-foreground pl-4">
                + {guide.sections.length - 3} more
              </li>
            )}
          </ul>
        )}

        {/* CTA */}
        <div className="relative inline-flex items-center gap-2 text-sm font-bold text-accent group-hover:gap-3 transition-all">
          {heroLabel === "CONTINUE READING" ? "Continue reading" : "Read this first"}
          <ArrowRight size={16} />
        </div>
      </article>
    </Link>
  );
}

/* -------------------- Compact variant -------------------- */
function CompactCard({ guide }: { guide: GuideMeta }) {
  return (
    <div className="block h-full">
      <article className="relative h-full flex flex-col rounded-lg border border-dashed border-border bg-card/30 p-4 opacity-70">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
            {guide.caseNumber}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Lock size={10} /> Soon
          </span>
        </div>
        <h4 className="text-sm font-semibold text-foreground/90 leading-snug line-clamp-2 mb-2">
          {guide.title}
        </h4>
        <div className="mt-auto flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${audienceTagStyles[guide.audience]}`}
          >
            {guide.audience}
          </span>
          <span className="text-[10px] text-muted-foreground">{guide.readTime}</span>
        </div>
      </article>
    </div>
  );
}
