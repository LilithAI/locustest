import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ShareIconButton } from "@/components/ShareIconButton";
import { AREA_OF_LAW_LABELS, QUESTION_TYPE_LABELS } from "@/lib/bar/constants";
import type { AreaOfLaw, Difficulty, QuestionType } from "@/lib/bar/types";
import { isPremiumType } from "@/lib/bar/premium";
import { PremiumBadge } from "@/components/bar/premium/PremiumBadge";
import { shareOrCopy, withRef } from "@/lib/share";

interface ChallengeCardProps {
  id: string;
  question_type: QuestionType;
  area_of_law: AreaOfLaw;
  difficulty: Difficulty;
  prompt: string;
  points_base: number;
  source_citation: string | null;
  disabled?: boolean;
}

const DIFF_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-500/40 text-emerald-500",
  medium: "border-amber-500/40 text-amber-500",
  hard: "border-rose-500/40 text-rose-500",
};

export function ChallengeCard({
  id,
  question_type,
  area_of_law,
  difficulty,
  prompt,
  points_base,
  source_citation,
  disabled,
}: ChallengeCardProps) {
  const preview = prompt.length > 120 ? prompt.slice(0, 120).trimEnd() + "…" : prompt;

  const handleShare = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = withRef(`${window.location.origin}/the-bar/challenge/${id}`, "bar-challenge");
    const text = `Try this Bar challenge on Locus: ${preview}`;
    const r = await shareOrCopy({ title: "Locus — The Bar", text, url });
    if (r === "copied") toast.success("Link copied");
  };

  const inner = (
    <Card
      className={`relative border-2 border-border p-5 h-full flex flex-col gap-3 transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-accent hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--accent))] cursor-pointer"
      }`}
    >
      {!disabled && (
        <ShareIconButton
          size="sm"
          label="Share this challenge"
          onShare={handleShare}
          className="absolute top-2 right-2 z-10"
        />
      )}
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {QUESTION_TYPE_LABELS[question_type]}
          </Badge>
          {isPremiumType(question_type) && <PremiumBadge size="sm" />}
        </div>
        <Badge variant="outline" className={`text-xs capitalize ${DIFF_STYLES[difficulty]}`}>
          {difficulty}
        </Badge>
      </div>

      <p className="text-sm text-foreground leading-relaxed flex-1">{preview}</p>

      <div className="flex items-end justify-between pt-2 border-t border-border">
        <div>
          <div className="text-2xl font-extrabold font-heading text-accent leading-none">
            {points_base}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            pts
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{AREA_OF_LAW_LABELS[area_of_law]}</div>
          {source_citation ? (
            <div className="text-[10px] italic text-muted-foreground/70 mt-1 max-w-[180px] truncate">
              {source_citation}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );

  if (disabled) return inner;
  return <Link to={`/the-bar/challenge/${id}`}>{inner}</Link>;
}
