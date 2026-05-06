import { useMemo } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Inputs {
  avatarUrl: string | null;
  bio: string;
  college: string;
  degree: string;
  graduationYear: string;
  cgpa: string;
  subjectsCount: number;
  internshipsCount: number;
  mootsCount: number;
  publicationsCount: number;
  cvUrl: string | null;
  applicationsCount: number;
  variant?: "full" | "compact";
}

export interface ChecklistItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  cta?: string;
}

export function buildChecklist(i: Omit<Inputs, "variant">): ChecklistItem[] {
  return [
    { key: "avatar", label: "Profile photo", weight: 10, done: !!i.avatarUrl, cta: "Upload a photo" },
    { key: "bio", label: "Short bio (40+ chars)", weight: 10, done: i.bio.trim().length >= 40, cta: "Write a short bio" },
    {
      key: "academics",
      label: "College, degree & graduation year",
      weight: 15,
      done: !!i.college && !!i.degree && !!i.graduationYear,
      cta: "Complete academics",
    },
    { key: "cgpa", label: "CGPA", weight: 5, done: i.cgpa.trim().length > 0, cta: "Add your CGPA" },
    { key: "subjects", label: "Subjects of interest", weight: 10, done: i.subjectsCount > 0, cta: "Pick subjects of interest" },
    { key: "internships", label: "At least one internship", weight: 15, done: i.internshipsCount > 0, cta: "Add an internship" },
    {
      key: "extracurricular",
      label: "A moot or publication",
      weight: 10,
      done: i.mootsCount > 0 || i.publicationsCount > 0,
      cta: "Add a moot or publication",
    },
    { key: "cv", label: "CV uploaded", weight: 15, done: !!i.cvUrl, cta: "Upload your CV" },
    {
      key: "applications",
      label: "3+ applications logged",
      weight: 10,
      done: i.applicationsCount >= 3,
      cta: "Log applications you've sent",
    },
  ];
}

export function computeStrength(i: Omit<Inputs, "variant">) {
  const items = buildChecklist(i);
  const score = items.reduce((acc, it) => acc + (it.done ? it.weight : 0), 0);
  return { items, score };
}

function tier(score: number): { label: string; tone: string } {
  if (score >= 90) return { label: "Standout", tone: "text-accent" };
  if (score >= 70) return { label: "Strong", tone: "text-foreground" };
  if (score >= 40) return { label: "Building", tone: "text-foreground" };
  return { label: "Just starting", tone: "text-muted-foreground" };
}

export default function ProfileStrengthMeter(props: Inputs) {
  const { variant = "full", ...inputs } = props;
  const { items, score, nextStep } = useMemo(() => {
    const items = buildChecklist(inputs);
    const score = items.reduce((acc, it) => acc + (it.done ? it.weight : 0), 0);
    const incomplete = items.filter((it) => !it.done).sort((a, b) => b.weight - a.weight);
    return { items, score, nextStep: incomplete[0] ?? null };
  }, [inputs]);

  const t = tier(score);
  const completedCount = items.filter((it) => it.done).length;

  if (variant === "compact") {
    return (
      <div className="border-2 border-border bg-card p-3 shadow-[3px_3px_0_0_hsl(var(--border))]">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Profile strength
            </span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${t.tone}`}>
              · {t.label}
            </span>
          </div>
          <div className="font-heading text-lg font-extrabold text-foreground leading-none">
            {score}
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="mt-2">
          <Progress value={score} className="h-1.5" />
        </div>
        {nextStep && (
          <div className="mt-2 flex items-center gap-2 truncate">
            <ArrowRight size={12} className="text-accent shrink-0" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Next:
            </span>
            <span className="text-xs text-foreground truncate">{nextStep.cta || nextStep.label}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
              Profile strength
            </h2>
            <span className={`font-mono text-xs font-bold uppercase tracking-wider ${t.tone}`}>
              · {t.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completedCount} of {items.length} steps complete
          </p>
        </div>
        <div className="text-right">
          <div className="font-heading text-3xl font-extrabold text-foreground leading-none">
            {score}
            <span className="text-base text-muted-foreground">/100</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={score} className="h-2" />
      </div>

      {nextStep && (
        <div className="mt-4 flex items-center gap-2 border border-border/60 bg-muted/30 px-3 py-2">
          <ArrowRight size={14} className="text-accent shrink-0" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Next:
          </span>
          <span className="text-sm text-foreground truncate">{nextStep.cta || nextStep.label}</span>
        </div>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">
          Show all {items.length} steps
        </summary>
        <ul className="mt-3 space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-2 text-sm">
              {it.done ? (
                <CheckCircle2 size={14} className="text-accent shrink-0" />
              ) : (
                <Circle size={14} className="text-muted-foreground shrink-0" />
              )}
              <span className={it.done ? "text-foreground/80 line-through" : "text-foreground"}>
                {it.label}
              </span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">+{it.weight}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
