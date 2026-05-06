import { Heart } from "lucide-react";

interface FeatureVoteButtonProps {
  featureKey: string;
  count: number;
  voted: boolean;
  onToggle: (key: string) => void;
  className?: string;
}

export function FeatureVoteButton({ featureKey, count, voted, onToggle, className = "" }: FeatureVoteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(featureKey);
      }}
      className={`inline-flex items-center gap-1.5 text-xs transition-all ${className}`}
      title={voted ? "Remove vote" : "Vote for this feature"}
    >
      <Heart
        size={16}
        className={`transition-all ${voted ? "fill-red-500 text-red-500 scale-110" : "text-muted-foreground hover:text-red-400"}`}
      />
      <span className={`font-semibold ${voted ? "text-red-400" : "text-muted-foreground"}`}>
        {voted ? "Voted" : "Vote"}
        {count > 0 && ` (${count})`}
      </span>
    </button>
  );
}
