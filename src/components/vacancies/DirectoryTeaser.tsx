import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "cell" | "strip";
}

type Mode = "firms" | "startups";

interface Chip {
  label: string;
  params: Record<string, string>;
}

const FIRM_CHIPS: Chip[] = [
  { label: "Tier 1", params: { tier: "Tier 1" } },
  { label: "Mumbai", params: { city: "Mumbai" } },
  { label: "IP", params: { area: "IP" } },
  { label: "Chambers", params: { type: "Chamber" } },
];

const STARTUP_CHIPS: Chip[] = [
  { label: "Fintech", params: { mode: "startups", sSector: "Fintech" } },
  { label: "Series A", params: { mode: "startups", sStage: "Series A" } },
  { label: "Has legal team", params: { mode: "startups", sLegal: "yes" } },
];

function buildHref(mode: Mode, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (mode === "startups") params.set("mode", "startups");
  Object.entries(extra).forEach(([k, v]) => v && params.set(k, v));
  const qs = params.toString();
  return `/directory${qs ? `?${qs}` : ""}`;
}

export default function DirectoryTeaser({ variant = "cell" }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("firms");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(buildHref(mode, { q: q.trim() }));
  };

  const chips = mode === "firms" ? FIRM_CHIPS : STARTUP_CHIPS;

  const ModeToggle = (
    <div className="inline-flex items-center gap-1 p-1 bg-background border-2 border-foreground/30 rounded-lg">
      {(["firms", "startups"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-colors",
            mode === m
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "firms" ? <Building2 size={12} /> : <Rocket size={12} />}
          {m === "firms" ? "Firms" : "Startups & SMEs"}
        </button>
      ))}
    </div>
  );

  const SearchForm = (
    <form onSubmit={submit} className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 80))}
          placeholder={mode === "firms" ? "Search firms by name…" : "Search startups by name…"}
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border-2 border-foreground/30 focus:border-foreground/80 outline-none text-sm font-medium placeholder:text-muted-foreground transition-colors"
        />
      </div>
      <button
        type="submit"
        aria-label="Search directory"
        className="shrink-0 h-10 px-3 rounded-lg bg-accent text-accent-foreground font-bold border-2 border-foreground/80 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center"
      >
        <ArrowRight size={16} />
      </button>
    </form>
  );

  const ChipRow = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Browse</span>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => navigate(buildHref(mode, c.params))}
          className="text-xs font-bold px-2.5 py-1 rounded-full border-2 border-foreground/40 bg-background hover:border-foreground/80 hover:bg-accent/10 transition-colors"
        >
          {c.label}
        </button>
      ))}
    </div>
  );

  if (variant === "strip") {
    return (
      <div className="relative bg-card border-2 border-foreground/80 rounded-2xl p-5 md:p-6 shadow-[4px_4px_0_0_hsl(var(--accent))] hover:shadow-[6px_6px_0_0_hsl(var(--accent))] hover:-translate-y-0.5 transition-all">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/15 border-2 border-foreground/70 flex items-center justify-center">
                <Building2 size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-0.5">Directory</p>
                <h3 className="font-heading text-base md:text-lg font-extrabold tracking-tight leading-tight">
                  Beyond this list. <span className="text-accent">500+ firms · 200+ startups · all India.</span>
                </h3>
              </div>
            </div>
            {ModeToggle}
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:flex-1 md:max-w-md">{SearchForm}</div>
            <div className="md:flex-1">{ChipRow}</div>
          </div>
        </div>
      </div>
    );
  }

  // cell variant
  return (
    <div className="relative bg-card border-2 border-foreground/80 rounded-2xl p-5 md:p-6 shadow-[4px_4px_0_0_hsl(var(--accent))] hover:shadow-[6px_6px_0_0_hsl(var(--accent))] hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-accent/15 border-2 border-foreground/70 flex items-center justify-center">
          <Building2 size={14} className="text-accent" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Directory</span>
      </div>

      <h3 className="font-heading text-xl md:text-2xl font-extrabold tracking-tight leading-tight mb-1">
        Beyond this list.
      </h3>
      <p className="font-heading text-base md:text-lg font-extrabold tracking-tight leading-snug text-accent mb-4">
        500+ firms · 200+ startups · all India.
      </p>

      <div className="mb-3">{ModeToggle}</div>

      <div className="mb-4">{SearchForm}</div>

      <div className="mb-auto">{ChipRow}</div>

      <button
        type="button"
        onClick={() => navigate(buildHref(mode))}
        className="mt-4 pt-3 border-t border-border/50 text-sm font-semibold text-foreground/80 hover:text-accent inline-flex items-center justify-between gap-2 group"
      >
        <span>Open the full directory</span>
        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
