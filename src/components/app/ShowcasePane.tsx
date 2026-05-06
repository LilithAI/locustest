import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Check, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  username: string;
  internshipsCount: number;
  mootsCount: number;
  publicationsCount: number;
  hasCv: boolean;
}

interface ActivityRow {
  activity_date: string;
  total_count: number;
}

const DAYS = 30;

function intensityClass(count: number): string {
  if (count <= 0) return "bg-muted/40";
  if (count === 1) return "bg-accent/30";
  if (count <= 3) return "bg-accent/60";
  return "bg-accent";
}

export default function ShowcasePane({
  userId,
  username,
  internshipsCount,
  mootsCount,
  publicationsCount,
  hasCv,
}: Props) {
  const [activity, setActivity] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_profile_activity", { p_user_id: userId });
      if (!mounted) return;
      if (error) {
        console.error("[ShowcasePane]", error);
        setActivity(new Map());
        return;
      }
      const m = new Map<string, number>();
      ((data ?? []) as ActivityRow[]).forEach((r) => m.set(r.activity_date, r.total_count));
      setActivity(m);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const isSparse =
    internshipsCount === 0 && mootsCount === 0 && publicationsCount === 0 && !hasCv;

  // build last 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: Date; count: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: d, count: activity?.get(key) ?? 0 });
  }
  const totalActive = days.filter((d) => d.count > 0).length;

  return (
    <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))] flex flex-col h-full">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Your showcase
      </div>
      <h3 className="mt-1 font-heading text-lg font-extrabold uppercase tracking-wider text-foreground">
        Profile
      </h3>

      {isSparse ? (
        <div className="mt-4 flex-1 flex items-center">
          <p className="text-sm text-muted-foreground">
            Add your first internship to get firms' attention.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 flex-1">
          <div className="grid grid-cols-2 gap-2">
            <Count label="Internships" value={internshipsCount} />
            <Count label="Moots" value={mootsCount} />
            <Count label="Publications" value={publicationsCount} />
            <div className="border border-border bg-muted/20 px-2 py-2 text-center flex flex-col items-center justify-center">
              <div
                className={`font-heading text-lg font-extrabold leading-none ${
                  hasCv ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {hasCv ? <Check size={18} /> : "—"}
              </div>
              <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                CV
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Last 30 days
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {totalActive} active
              </span>
            </div>
            <div className="flex gap-[2px]">
              {days.map((d, i) => (
                <div
                  key={i}
                  title={`${d.count} on ${d.date.toLocaleDateString()}`}
                  className={`h-4 flex-1 rounded-[2px] border border-border/30 ${intensityClass(d.count)}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {hasCv && (
        <Link
          to="/tools/cv-analyser"
          className="mt-4 group flex items-center justify-between gap-2 border-2 border-accent/40 bg-accent/10 px-3 py-2 transition-colors hover:border-accent hover:bg-accent/20"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileSearch size={14} className="shrink-0 text-accent" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              Locus+
            </span>
            <span className="truncate text-[11px] text-foreground/80">
              Score your CV across 3 vectors
            </span>
          </div>
          <ArrowRight size={12} className="shrink-0 text-accent opacity-70 group-hover:opacity-100" />
        </Link>
      )}

      <Link
        to={`/u/${username}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center justify-between border-2 border-border bg-muted/30 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground hover:border-accent hover:text-accent transition-colors"
      >
        View public profile
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-muted/20 px-2 py-2 text-center">
      <div className="font-heading text-lg font-extrabold leading-none text-foreground">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
