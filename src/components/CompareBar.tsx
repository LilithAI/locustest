import { X, ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

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
  const lastCountRef = useRef(0);

  // Fire firm_compare_added each time count grows
  useEffect(() => {
    if (selected.length > lastCountRef.current) {
      void track("firm_compare_added", { count: selected.length });
    }
    lastCountRef.current = selected.length;
  }, [selected.length]);

  if (selected.length === 0) return null;

  const rows: { label: string; key: keyof Firm }[] = [
    { label: "Tier", key: "tier" },
    { label: "Verified", key: "verified" },
    { label: "Rating", key: "rating" },
    { label: "City", key: "city" },
    { label: "Area", key: "area" },
    { label: "Phone", key: "phone" },
    { label: "Email", key: "email" },
  ];

  return (
    <>
      {/* Sticky bottom bar — data attribute lets MobileBottomDock detect & yield */}
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

      {/* Comparison Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Side-by-Side Comparison</DialogTitle>
            <DialogDescription>Comparing {selected.length} firms</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Field</th>
                  {selected.map((f) => (
                    <th key={f.name} className="text-left py-3 px-3 font-heading font-bold text-foreground max-w-[200px]">
                      <span className="line-clamp-2">{f.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border/30">
                    <td className="py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{r.label}</td>
                    {selected.map((f) => (
                      <td key={f.name} className="py-3 px-3 text-foreground">
                        {r.key === "email" && f.email ? (
                          <a href={`mailto:${f.email}`} className="text-accent hover:underline truncate block max-w-[180px]">{f.email}</a>
                        ) : r.key === "phone" && f.phone ? (
                          <a href={`tel:${f.phone}`} className="text-accent hover:underline">{f.phone}</a>
                        ) : r.key === "verified" ? (
                          f.verified === "verified" ? (
                            <span className="inline-flex items-center gap-1 text-accent font-bold">✓ Verified</span>
                          ) : f.verified === "likely" ? (
                            <span className="text-muted-foreground">Listed</span>
                          ) : (
                            "—"
                          )
                        ) : (
                          String(f[r.key] || "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
