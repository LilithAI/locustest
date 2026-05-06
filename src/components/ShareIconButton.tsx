import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareIconButtonProps {
  onShare: (e: React.MouseEvent) => void | Promise<void>;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Canonical share affordance used across the app.
 * Provides consistent sizing, hit area, and chrome.
 */
export function ShareIconButton({
  onShare,
  label = "Share",
  size = "md",
  className,
}: ShareIconButtonProps) {
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconSize = size === "sm" ? 14 : 15;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        void onShare(e);
      }}
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 active:scale-95 transition-colors",
        dims,
        className
      )}
    >
      <Share2 size={iconSize} strokeWidth={2.2} />
    </button>
  );
}

export default ShareIconButton;
