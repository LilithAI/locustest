import { Link } from "react-router-dom";
import { Flame, ArrowRight, Trophy } from "lucide-react";

interface Props {
  designation: string | null;
  totalPoints: number;
  currentStreak: number;
  totalAttempts: number;
}

const DESIGNATION_LABELS: Record<string, string> = {
  trainee: "Trainee",
  junior_associate: "Junior Associate",
  associate: "Associate",
  senior_associate: "Senior Associate",
  partner: "Partner",
  senior_partner: "Senior Partner",
  silk: "Silk",
};

export default function PracticePane({
  designation,
  totalPoints,
  currentStreak,
  totalAttempts,
}: Props) {
  const hasAttempts = totalAttempts > 0;
  const designationLabel = designation ? DESIGNATION_LABELS[designation] ?? "Trainee" : "Trainee";

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))] flex flex-col h-full">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Keep your edge
      </div>
      <h3 className="mt-1 font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
        Practice
      </h3>

      {hasAttempts ? (
        <div className="mt-4 space-y-3 flex-1">
          <div>
            <div className="flex items-baseline gap-2">
              <Trophy size={14} className="text-accent" />
              <span className="font-heading text-xl font-extrabold text-foreground">
                {designationLabel}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              {totalPoints} pts · {totalAttempts} attempt{totalAttempts === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center gap-2 border border-border bg-muted/20 px-3 py-2">
            {currentStreak >= 3 ? (
              <Flame size={14} className="text-accent" />
            ) : (
              <Flame size={14} className="text-muted-foreground" />
            )}
            <span className="font-heading text-sm font-extrabold text-foreground">
              {currentStreak}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              day streak
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex-1 flex items-center">
          <p className="text-sm text-muted-foreground">
            Take your first challenge — rank up from Trainee.
          </p>
        </div>
      )}

      <Link
        to="/the-bar"
        className="mt-4 inline-flex items-center justify-between border-2 border-accent bg-accent px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform"
      >
        Take a challenge
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
