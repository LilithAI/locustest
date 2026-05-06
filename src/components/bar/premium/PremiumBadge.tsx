// Locus+ pill — amber neobrutalist badge (.badge.accent in prototype).
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className, size = "md" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 uppercase tracking-[0.1em]",
        "border-2 rounded-[4px]",
        size === "sm" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-[3px] text-[10.5px]",
        // Amber palette — works on dark surfaces.
        "border-[hsl(45_100%_63%/0.4)] text-[hsl(45_100%_63%)] bg-[hsl(45_100%_63%/0.12)]",
        "font-medium",
        className,
      )}
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}
      aria-label="Locus Plus premium format"
    >
      <span
        className={cn(
          "inline-block bg-[hsl(45_100%_63%)]",
          size === "sm" ? "h-1 w-1 rounded-[1px]" : "h-1.5 w-1.5 rounded-[1px]",
        )}
      />
      Locus+
    </span>
  );
}
