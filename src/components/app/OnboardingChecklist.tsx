import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { ChecklistItem } from "@/components/profile/ProfileStrengthMeter";

const CTA_TARGETS: Record<string, string> = {
  avatar: "/profile/edit",
  bio: "/profile/edit",
  academics: "/profile/edit",
  cgpa: "/profile/edit",
  subjects: "/profile/edit",
  internships: "/profile/edit",
  extracurricular: "/profile/edit",
  cv: "/profile/edit",
  applications: "/applications",
};

interface Props {
  items: ChecklistItem[];
  score: number;
}

export default function OnboardingChecklist({ items, score }: Props) {
  const incomplete = items
    .filter((it) => !it.done)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))]">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
          Get started
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish these {incomplete.length} steps to unlock your dashboard. Standout profiles land 3× more responses.
        </p>
      </div>

      <ol className="space-y-2">
        {incomplete.map((it, idx) => (
          <li key={it.key}>
            <Link
              to={CTA_TARGETS[it.key] ?? "/profile/edit"}
              className="group flex items-center gap-3 border-2 border-border bg-muted/20 px-3 py-3 transition-all hover:border-accent hover:bg-accent/5 hover:shadow-[3px_3px_0_0_hsl(var(--accent))]"
            >
              <span className="font-mono text-xs font-bold text-muted-foreground w-5 shrink-0">
                {idx + 1}.
              </span>
              <Circle size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">
                  {it.cta || it.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">{it.label}</div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                +{it.weight}
              </span>
              <ArrowRight
                size={14}
                className="text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </Link>
          </li>
        ))}
      </ol>

      {items.filter((i) => i.done).length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 size={12} className="text-accent" />
          <span>{items.filter((i) => i.done).length} step{items.filter((i) => i.done).length === 1 ? "" : "s"} already complete · {score}/100</span>
        </div>
      )}
    </div>
  );
}
