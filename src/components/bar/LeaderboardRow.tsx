import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { formatDesignation } from "@/lib/bar/display";
import type { BarDesignation } from "@/lib/bar/types";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  designation: BarDesignation;
  points: number;
  accuracy_pct: number;
  current_streak: number;
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isYou: boolean;
}

function rankAccent(rank: number): string {
  if (rank === 1) return "bg-accent text-accent-foreground border-accent";
  if (rank === 2) return "bg-foreground text-background border-foreground";
  if (rank === 3) return "bg-muted text-foreground border-border";
  return "bg-card text-muted-foreground border-border";
}

function initials(name: string | null, username: string) {
  const source = (name && name.trim()) || username;
  const parts = source.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export function LeaderboardRow({ entry, rank, isYou }: LeaderboardRowProps) {
  const badgeClass = rankAccent(rank);
  const navigate = useNavigate();
  const profilePath = `/u/${entry.username}`;

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    // Don't hijack clicks on the inner Link (it handles its own nav, incl. modifier keys)
    if ((e.target as HTMLElement).closest("a")) return;
    // Respect modifier keys for new-tab/window
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
      window.open(profilePath, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(profilePath);
  };

  return (
    <tr
      data-row-id={entry.user_id}
      onClick={handleRowClick}
      className={cn(
        "border-b border-border last:border-b-0 transition-colors hover:bg-muted/40 cursor-pointer",
        isYou && "bg-accent/5 ring-1 ring-accent/40",
      )}
    >
      <td className="py-3 px-3 w-16">
        <span
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-md border-2 font-bold text-sm",
            badgeClass,
          )}
        >
          {rank}
        </span>
      </td>
      <td className="py-3 px-3">
        <Link
          to={`/u/${entry.username}`}
          className="flex items-center gap-3 group min-w-0"
        >
          <Avatar className="h-9 w-9 border border-border shrink-0">
            {entry.avatar_url ? (
              <AvatarImage src={entry.avatar_url} alt={entry.display_name || entry.username} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
              {initials(entry.display_name, entry.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                {entry.display_name || entry.username}
              </span>
              {isYou && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">@{entry.username}</div>
          </div>
        </Link>
      </td>
      <td className="py-3 px-3 hidden md:table-cell">
        <Badge variant="outline" className="font-medium">
          {formatDesignation(entry.designation)}
        </Badge>
      </td>
      <td className="py-3 px-3 text-right font-bold tabular-nums text-foreground">
        {entry.points.toLocaleString()}
      </td>
      <td className="py-3 px-3 text-right text-sm text-muted-foreground tabular-nums hidden sm:table-cell">
        {Number(entry.accuracy_pct).toFixed(1)}%
      </td>
      <td className="py-3 px-3 text-right text-sm hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 text-foreground tabular-nums">
          {entry.current_streak >= 7 && <Flame size={14} className="text-accent" />}
          {entry.current_streak}
        </span>
      </td>
    </tr>
  );
}
