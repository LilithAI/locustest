import { Check, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarkCompleteButton({
  completed,
  onToggle,
  disabled,
}: {
  completed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      variant={completed ? "default" : "outline"}
      size="sm"
      className={`w-full ${
        completed
          ? "bg-accent text-accent-foreground hover:bg-accent/90"
          : ""
      }`}
    >
      {completed ? (
        <>
          <Check size={14} /> Completed
        </>
      ) : (
        <>
          <CircleDashed size={14} /> Mark complete
        </>
      )}
    </Button>
  );
}
