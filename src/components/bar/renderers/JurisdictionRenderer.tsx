import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface JOption { id: string; jurisdiction: string; reasoning: string }
interface JPayload { options: JOption[] }

interface AnswerModeProps {
  mode: "answer";
  payload: JPayload;
  value: string;
  onChange: (v: string) => void;
}

interface ReviewModeProps {
  mode: "review";
  payload: JPayload;
  submittedId: string | null;
  correctId: string;
}

export function JurisdictionRenderer(props: AnswerModeProps | ReviewModeProps) {
  if (props.mode === "answer") {
    return (
      <RadioGroup value={props.value} onValueChange={props.onChange} className="space-y-2">
        {props.payload.options.map((o) => (
          <div
            key={o.id}
            className={`flex items-start gap-3 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
              props.value === o.id ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30"
            }`}
            onClick={() => props.onChange(o.id)}
          >
            <RadioGroupItem value={o.id} id={`j-${o.id}`} className="mt-1" />
            <Label htmlFor={`j-${o.id}`} className="flex-1 cursor-pointer">
              <div className="font-bold text-sm text-foreground mb-1">{o.jurisdiction}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{o.reasoning}</div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="space-y-2">
      {props.payload.options.map((o) => {
        const isCorrect = o.id === props.correctId;
        const isSubmitted = o.id === props.submittedId;
        let cls = "border-border bg-card";
        if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/10";
        else if (isSubmitted) cls = "border-rose-500/60 bg-rose-500/10";
        return (
          <div key={o.id} className={`flex items-start gap-3 p-4 border-2 rounded-lg ${cls}`}>
            <div className="mt-1">
              {isCorrect ? <Check size={16} className="text-emerald-500" /> :
                isSubmitted ? <X size={16} className="text-rose-500" /> :
                <span className="block w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-foreground mb-1">
                {o.jurisdiction}
                {isSubmitted && !isCorrect && (
                  <span className="ml-2 text-xs text-rose-500 font-semibold">(your answer)</span>
                )}
                {isCorrect && (
                  <span className="ml-2 text-xs text-emerald-500 font-semibold">(correct)</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{o.reasoning}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
