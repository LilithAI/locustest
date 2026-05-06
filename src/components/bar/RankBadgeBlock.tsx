import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Scale, Flame, ArrowRight } from "lucide-react";
import { formatDesignation } from "@/lib/bar/display";
import type { BarDesignation } from "@/lib/bar/types";

interface RankBadgeBlockProps {
  designation: BarDesignation;
  totalPoints: number;
  accuracyPct: number;
  currentStreak: number;
  rankPosition: number | null; // null = hidden (opted out & not self)
  isOwner: boolean;
  optedOut: boolean;
  username: string;
}

export function RankBadgeBlock({
  designation,
  totalPoints,
  accuracyPct,
  currentStreak,
  rankPosition,
  isOwner,
  optedOut,
  username,
}: RankBadgeBlockProps) {
  return (
    <Card className="border-2 border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Scale size={16} className="text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          The Bar
        </span>
      </div>
      <div className="text-lg font-bold font-heading text-foreground leading-tight">
        {formatDesignation(designation)}
      </div>
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-bold text-foreground tabular-nums">
          {totalPoints.toLocaleString()}
        </span>
        <span className="text-muted-foreground">pts</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground tabular-nums">
          {Number(accuracyPct).toFixed(0)}% accuracy
        </span>
      </div>

      {rankPosition !== null && (
        <Link
          to={`/the-bar/leaderboard?tab=all-time#u-${username}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Ranked #{rankPosition.toLocaleString()} overall
          {isOwner && optedOut && (
            <span className="text-muted-foreground font-normal">(hidden from public)</span>
          )}
        </Link>
      )}

      {currentStreak >= 3 && (
        <div className="flex items-center gap-1 text-xs text-foreground">
          <Flame size={12} className="text-accent" />
          <span className="font-medium">{currentStreak}-day streak</span>
        </div>
      )}

      <Link
        to={`/the-bar/leaderboard?tab=all-time#u-${username}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
      >
        View on leaderboard <ArrowRight size={12} />
      </Link>
    </Card>
  );
}
