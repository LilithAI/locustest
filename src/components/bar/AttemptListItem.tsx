import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/bar/constants";
import { getRelativeDateLabel } from "@/lib/bar/display";
import type { QuestionType } from "@/lib/bar/types";

interface AttemptListItemProps {
  title: string;
  question_type: QuestionType;
  is_correct: boolean;
  points_awarded: number;
  attempted_at: string;
  onClick?: () => void;
}

export function AttemptListItem({
  title,
  question_type,
  is_correct,
  points_awarded,
  attempted_at,
  onClick,
}: AttemptListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-2 border-border rounded-lg hover:border-accent transition-colors text-left bg-card"
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          is_correct
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
            : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
        }`}
      >
        {is_correct ? <Check size={16} /> : <X size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {QUESTION_TYPE_LABELS[question_type]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {getRelativeDateLabel(attempted_at)}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`text-lg font-bold font-heading ${is_correct ? "text-accent" : "text-muted-foreground"}`}>
          {is_correct ? "+" : ""}{points_awarded}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">pts</div>
      </div>
    </button>
  );
}
