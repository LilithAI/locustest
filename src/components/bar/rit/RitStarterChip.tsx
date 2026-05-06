import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function RitStarterChip({ label, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground",
        "shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))]",
        "transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]",
      )}
    >
      <Sparkles size={12} className="text-accent" />
      {label}
    </button>
  );
}
