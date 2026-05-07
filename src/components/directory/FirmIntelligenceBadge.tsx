import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md";
  className?: string;
}

export default function FirmIntelligenceBadge({ size = "sm", className }: Props) {
  const isSm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-full bg-accent text-accent-foreground border border-foreground whitespace-nowrap",
        isSm ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className,
      )}
      title="This firm has a Firm Intelligence dossier"
    >
      <Sparkles size={isSm ? 10 : 12} />
      Intelligence
    </span>
  );
}
