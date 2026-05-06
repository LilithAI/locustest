import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface MobileFilterSheetProps {
  activeCount: number;
  onClearAll: () => void;
  children: ReactNode;
}

export default function MobileFilterSheet({ activeCount, onClearAll, children }: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-lg border-2 border-foreground/70 bg-card text-sm font-bold transition-all hover:border-foreground hover:shadow-[3px_3px_0_0_hsl(var(--accent))]",
            activeCount > 0 && "border-foreground shadow-[3px_3px_0_0_hsl(var(--accent))]"
          )}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-extrabold rounded-full bg-accent text-accent-foreground border border-foreground">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="border-t-2 border-foreground rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b-2 border-foreground/20 flex flex-row items-center justify-between">
          <SheetTitle className="font-heading text-lg font-extrabold">Filters</SheetTitle>
          {activeCount > 0 && (
            <button
              onClick={() => {
                onClearAll();
              }}
              className="text-xs font-bold underline underline-offset-2 hover:text-accent"
            >
              Clear all
            </button>
          )}
        </SheetHeader>
        <div className="p-5 flex flex-col gap-3">{children}</div>
        <div className="sticky bottom-0 bg-card border-t-2 border-foreground/20 p-4">
          <button
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-lg bg-accent text-accent-foreground font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
          >
            Show results
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
