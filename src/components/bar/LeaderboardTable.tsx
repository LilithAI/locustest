import { LeaderboardRow, type LeaderboardEntry } from "./LeaderboardRow";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  startRank: number; // for pagination offset
  currentUserId: string | null;
  pointsLabel?: string;
}

export function LeaderboardTable({
  entries,
  startRank,
  currentUserId,
  pointsLabel = "Points",
}: LeaderboardTableProps) {
  return (
    <div className="border-2 border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b-2 border-border">
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3 w-16">
              Rank
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3">
              Student
            </th>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3 hidden md:table-cell">
              Designation
            </th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3">
              {pointsLabel}
            </th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3 hidden sm:table-cell">
              Accuracy
            </th>
            <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3 px-3 hidden sm:table-cell">
              Streak
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              rank={startRank + i}
              isYou={!!currentUserId && entry.user_id === currentUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
