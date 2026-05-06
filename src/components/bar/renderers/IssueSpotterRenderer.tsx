import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface IssueOption { id: string; text: string }
interface IssuePayload { issue_options: IssueOption[] }

interface AnswerModeProps {
  mode: "answer";
  payload: IssuePayload;
  selected: string[];
  onChange: (v: string[]) => void;
}

interface ReviewModeProps {
  mode: "review";
  payload: IssuePayload;
  submittedIds: string[];
  correctIds: string[];
}

export function IssueSpotterRenderer(props: AnswerModeProps | ReviewModeProps) {
  if (props.mode === "answer") {
    const toggle = (id: string) => {
      const next = props.selected.includes(id)
        ? props.selected.filter((x) => x !== id)
        : [...props.selected, id];
      props.onChange(next);
    };
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground italic mb-3">
          Select ALL issues present in this fact pattern.
        </p>
        {props.payload.issue_options.map((o) => {
          const checked = props.selected.includes(o.id);
          return (
            <div
              key={o.id}
              className={`flex items-start gap-3 p-4 border-2 rounded-lg transition-colors cursor-pointer ${
                checked ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30"
              }`}
              onClick={() => toggle(o.id)}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(o.id)}
                id={`issue-${o.id}`}
                className="mt-0.5"
              />
              <Label htmlFor={`issue-${o.id}`} className="flex-1 text-sm leading-relaxed cursor-pointer">
                {o.text}
              </Label>
            </div>
          );
        })}
      </div>
    );
  }

  const submittedSet = new Set(props.submittedIds);
  const correctSet = new Set(props.correctIds);
  return (
    <div className="space-y-2">
      {props.payload.issue_options.map((o) => {
        const isCorrect = correctSet.has(o.id);
        const isSubmitted = submittedSet.has(o.id);
        let cls = "border-border bg-card";
        if (isCorrect && isSubmitted) cls = "border-emerald-500/60 bg-emerald-500/10";
        else if (isCorrect && !isSubmitted) cls = "border-emerald-500/40 bg-emerald-500/5";
        else if (!isCorrect && isSubmitted) cls = "border-rose-500/60 bg-rose-500/10";
        return (
          <div key={o.id} className={`flex items-start gap-3 p-4 border-2 rounded-lg ${cls}`}>
            <div className="mt-0.5">
              {isCorrect ? <Check size={16} className="text-emerald-500" /> :
                isSubmitted ? <X size={16} className="text-rose-500" /> :
                <span className="block w-4 h-4" />}
            </div>
            <div className="flex-1 text-sm leading-relaxed">
              {o.text}
              {isSubmitted && !isCorrect && (
                <span className="ml-2 text-xs text-rose-500 font-semibold">(you picked — wrong)</span>
              )}
              {isCorrect && !isSubmitted && (
                <span className="ml-2 text-xs text-emerald-500 font-semibold">(missed)</span>
              )}
              {isCorrect && isSubmitted && (
                <span className="ml-2 text-xs text-emerald-500 font-semibold">(correct)</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
