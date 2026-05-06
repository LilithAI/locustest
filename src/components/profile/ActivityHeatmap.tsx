import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityRow {
  activity_date: string; // YYYY-MM-DD
  bar_count: number;
  application_count: number;
  total_count: number;
}

interface Props {
  userId: string;
}

const DAYS = 7;
const WEEKS = 53;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun
  x.setDate(x.getDate() - day);
  return x;
}

function fmtDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTooltipDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function intensityClass(count: number): string {
  if (count <= 0) return "bg-muted/40";
  if (count === 1) return "bg-accent/25";
  if (count <= 3) return "bg-accent/50";
  if (count <= 6) return "bg-accent/75";
  return "bg-accent";
}

export default function ActivityHeatmap({ userId }: Props) {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("get_profile_activity", { p_user_id: userId });
      if (!mounted) return;
      if (error) {
        console.error("[ActivityHeatmap] rpc error:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as ActivityRow[]);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [userId]);

  const { grid, monthLabels, totalContribs } = useMemo(() => {
    const map = new Map<string, ActivityRow>();
    (rows ?? []).forEach((r) => map.set(r.activity_date, r));

    // End at today, walk back to fill 53 weeks × 7 days, ending at the current week's Saturday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWeekStart = startOfWeek(today);

    const weeks: { date: Date; row: ActivityRow | null }[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const weekStart = new Date(lastWeekStart);
      weekStart.setDate(weekStart.getDate() - w * 7);
      const col: { date: Date; row: ActivityRow | null }[] = [];
      for (let d = 0; d < DAYS; d++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(weekStart.getDate() + d);
        if (cellDate > today) {
          col.push({ date: cellDate, row: null });
        } else {
          const key = fmtDateKey(cellDate);
          col.push({ date: cellDate, row: map.get(key) ?? null });
        }
      }
      weeks.push(col);
    }

    // Month labels: render label above the first column where the month changes (and on first col)
    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((col, i) => {
      const firstDay = col[0].date;
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ weekIndex: i, label: firstDay.toLocaleDateString(undefined, { month: "short" }) });
        lastMonth = m;
      }
    });

    const total = (rows ?? []).reduce((acc, r) => acc + r.total_count, 0);

    return { grid: weeks, monthLabels: labels, totalContribs: total };
  }, [rows]);

  // Auto-scroll to today (right edge) once the grid is rendered, so most recent
  // activity is visible by default on narrow viewports.
  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;
    // Defer to next frame so layout is finalised.
    const id = requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [loading, grid]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={50}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-foreground">
            {totalContribs} {totalContribs === 1 ? "contribution" : "contributions"} in the last year
          </p>
          <p className="text-xs text-muted-foreground">Bar attempts + applications</p>
        </div>

        <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent_100%),linear-gradient(to_left,black_85%,transparent_100%)] [mask-composite:intersect]">
          <div className="inline-flex flex-col gap-1 min-w-full">
            {/* Month labels row */}
            <div className="relative h-3 ml-7" style={{ width: `${WEEKS * 14}px` }}>
              {monthLabels.map((m) => (
                <span
                  key={`${m.weekIndex}-${m.label}`}
                  className="absolute text-[10px] text-muted-foreground"
                  style={{ left: `${m.weekIndex * 14}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex gap-1">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-[2px] pr-1 text-[9px] text-muted-foreground">
                <span className="h-3" />
                <span className="h-3 leading-3">Mon</span>
                <span className="h-3" />
                <span className="h-3 leading-3">Wed</span>
                <span className="h-3" />
                <span className="h-3 leading-3">Fri</span>
                <span className="h-3" />
              </div>

              {/* Grid */}
              <div className="flex gap-[2px]">
                {grid.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[2px]">
                    {col.map((cell, ri) => {
                      const isFuture = cell.date > new Date();
                      const count = cell.row?.total_count ?? 0;
                      if (isFuture) {
                        return <div key={ri} className="w-3 h-3" />;
                      }
                      return (
                        <Tooltip key={ri}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(count)} transition-colors`}
                              aria-label={`${count} contributions on ${fmtTooltipDate(cell.date)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-semibold">
                              {count === 0 ? "No contributions" : `${count} ${count === 1 ? "contribution" : "contributions"}`}
                            </div>
                            <div className="text-muted-foreground">{fmtTooltipDate(cell.date)}</div>
                            {cell.row && cell.row.total_count > 0 && (
                              <div className="text-muted-foreground mt-0.5">
                                {cell.row.bar_count > 0 && <>· {cell.row.bar_count} bar attempt{cell.row.bar_count === 1 ? "" : "s"}<br /></>}
                                {cell.row.application_count > 0 && <>· {cell.row.application_count} application{cell.row.application_count === 1 ? "" : "s"}</>}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-2">
              <span>Less</span>
              <div className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(0)}`} />
              <div className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(1)}`} />
              <div className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(3)}`} />
              <div className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(6)}`} />
              <div className={`w-3 h-3 rounded-[2px] border border-border/30 ${intensityClass(10)}`} />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
