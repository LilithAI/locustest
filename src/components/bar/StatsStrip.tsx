import { Card } from "@/components/ui/card";
import { Scale, Trophy, Target, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDesignation, pointsToNextRank } from "@/lib/bar/display";
import type { BarDesignation } from "@/lib/bar/types";

interface StatsStripProps {
  designation: BarDesignation;
  totalPoints: number;
  accuracyPct: number;
  currentStreak: number;
}

export function StatsStrip({
  designation,
  totalPoints,
  accuracyPct,
  currentStreak,
}: StatsStripProps) {
  const next = pointsToNextRank(totalPoints, accuracyPct, designation);

  let progressLabel: string;
  let progressValue = 0;
  if (!next.nextRank) {
    progressLabel = "Max rank reached";
    progressValue = 100;
  } else if (next.accuracyBlocker && next.pointsNeeded === 0) {
    progressLabel = `Lift accuracy to ${next.accuracyNeeded}% to unlock ${formatDesignation(next.nextRank)}`;
  } else if (next.accuracyBlocker) {
    progressLabel = `${next.pointsNeeded} pts + ${next.accuracyNeeded}% accuracy for ${formatDesignation(next.nextRank)}`;
  } else {
    progressLabel = `${next.pointsNeeded} pts to ${formatDesignation(next.nextRank)}`;
  }

  if (next.nextRank && totalPoints > 0) {
    // Rough progress: how much of the gap from previous tier we've covered
    progressValue = Math.min(99, Math.max(2, Math.round((1 - next.pointsNeeded / Math.max(1, totalPoints + next.pointsNeeded)) * 100)));
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-2 border-border p-5 col-span-2 lg:col-span-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Scale size={20} className="text-accent" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Designation
          </div>
        </div>
        <div className="text-2xl font-extrabold font-heading text-foreground mb-2">
          {formatDesignation(designation)}
        </div>
        <Progress value={progressValue} className="h-1.5 mb-2" />
        <div className="text-xs text-muted-foreground">{progressLabel}</div>
      </Card>

      <Card className="border-2 border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
            <Trophy size={20} className="text-foreground" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Points
          </div>
        </div>
        <div className="text-3xl font-extrabold font-heading text-foreground">
          {totalPoints.toLocaleString()}
        </div>
      </Card>

      <Card className="border-2 border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
            <Target size={20} className="text-foreground" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accuracy
          </div>
        </div>
        <div className="text-3xl font-extrabold font-heading text-foreground">
          {Number(accuracyPct).toFixed(1)}<span className="text-lg text-muted-foreground">%</span>
        </div>
      </Card>

      <Card className="border-2 border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
            <Flame size={20} className="text-foreground" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Streak
          </div>
        </div>
        <div className="text-3xl font-extrabold font-heading text-foreground">
          {currentStreak}
        </div>
      </Card>
    </div>
  );
}
