import { X, ArrowRightLeft, ShieldCheck, Sparkles, TrendingUp, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import {
  loadIntelligenceIndex,
  getIntelligenceForName,
  TIER_LABELS,
  HEADCOUNT_LABELS,
  type FirmIntelligenceSummary,
} from "@/lib/firmIntelligence";

interface Firm {
  name: string;
  address?: string;
  city?: string;
  area?: string;
  tier?: string;
  rating?: number | string;
  phone?: string;
  email?: string;
  verified?: string;
}

interface CompareBarProps {
  selected: Firm[];
  onRemove: (name: string) => void;
  onClear: () => void;
}

export default function CompareBar({ selected, onRemove, onClear }: CompareBarProps) {
  const [open, setOpen] = useState(false);
  const [intelMap, setIntelMap] = useState<Record<string, FirmIntelligenceSummary | null>>({});
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (selected.length > lastCountRef.current) {
      void track("firm_compare_added", { count: selected.length });
    }
    lastCountRef.current = selected.length;
  }, [selected.length]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadIntelligenceIndex().then((idx) => {
      if (!alive) return;
      const m: Record<string, FirmIntelligenceSummary | null> = {};
      for (const f of selected) m[f.name] = getIntelligenceForName(idx, f.name);
      setIntelMap(m);
    });
    return () => { alive = false; };
  }, [open, selected]);

  if (selected.length === 0) return null;

  const intelOf = (name: string) => intelMap[name] ?? null;
  const dash = "—";

  type Row = { label: string; render: (f: Firm) => React.ReactNode };
  const rows: Row[] = [
    { label: "Tier", render: (f) => {
      const i = intelOf(f.name);
      return i?.tier ? (TIER_LABELS[i.tier] ?? i.tier) : (f.tier || dash);
    }},
    { label: "Verified", render: (f) => {
      const i = intelOf(f.name);
      const v = i?.chips.verified || f.verified === "verified";
      return v ? <span className="inline-flex items-center gap-1 text-accent font-bold"><ShieldCheck size={12}/> Verified</span> : dash;
    }},
    { label: "Headcount band", render: (f) => {
      const i = intelOf(f.name);
      return i?.headcount_band ? (HEADCOUNT_LABELS[i.headcount_band] ?? i.headcount_band) : dash;
    }},
    { label: "Total lawyers", render: (f) => intelOf(f.name)?.total_lawyers ?? dash },
    { label: "Partners", render: (f) => intelOf(f.name)?.partner_count ?? dash },
    { label: "HQ city", render: (f) => intelOf(f.name)?.hq_city ?? f.city ?? dash },
    { label: "Hiring now", render: (f) => intelOf(f.name)?.chips.hiring_now ? <span className="inline-flex items-center gap-1 text-foreground font-bold"><Sparkles size={12}/> Yes</span> : dash },
    { label: "Growth signal", render: (f) => {
      const g = intelOf(f.name)?.growth_signal_90d;
      if (!g || g === "unknown") return dash;
      if (g === "growing") return <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold"><TrendingUp size={12}/> Growing</span>;
      return g;
    }},
    { label: "Intelligence completeness", render: (f) => {
      const c = intelOf(f.name)?.intelligence_completeness_score;
      return c != null ? `${Math.round(c * 100)}%` : dash;
    }},
    { label: "Rating", render: (f) => f.rating ?? dash },
    { label: "Phone", render: (f) => f.phone ? <a href={`tel:${f.phone}`} className="text-accent hover:underline">{f.phone}</a> : dash },
    { label: "Email", render: (f) => f.email ? <a href={`mailto:${f.email}`} className="text-accent hover:underline truncate block max-w-[180px]">{f.email}</a> : dash },
    { label: "Profile", render: (f) => {
      const slug = intelOf(f.name)?.firm_slug;
      return slug ? <Link to={`/directory/firms/${slug}`} className="inline-flex items-center gap-1 text-accent hover:underline">Open <ExternalLink size={11}/></Link> : dash;
    }},
  ];

  return (
    <>
      <div data-compare-bar="true" className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl animate-fade-in">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Compare:</span>
            {selected.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-medium px-3 py-1.5 rounded-full max-w-[180px]"
              >
                <span className="truncate">{f.name}</span>
                <button onClick={() => onRemove(f.name)} className="hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={() => {
                void track("firm_compare_opened", { count: selected.length });
                setOpen(true);
              }}
              disabled={selected.length < 2}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft size={14} />
              Compare ({selected.length})
            </button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Side-by-Side Comparison</DialogTitle>
            <DialogDescription>
              Comparing {selected.length} firms · Intelligence rows pull from our enriched profiles
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b-2 border-foreground">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Field</th>
                  {selected.map((f) => (
                    <th key={f.name} className="text-left py-3 px-3 font-heading font-bold text-foreground max-w-[220px]">
                      <span className="line-clamp-2">{f.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-border/30">
                    <td className="py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider whitespace-nowrap">{r.label}</td>
                    {selected.map((f) => (
                      <td key={f.name} className="py-3 px-3 text-foreground align-top">
                        {r.render(f)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Signature practices overlap row */}
                <tr className="border-b border-border/30">
                  <td className="py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider whitespace-nowrap">Signature focus</td>
                  {selected.map((f) => (
                    <td key={f.name} className="py-3 px-3 align-top">
                      <span className="text-xs italic text-muted-foreground">Open profile for full breakdown</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
