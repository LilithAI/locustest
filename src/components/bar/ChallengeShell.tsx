// ChallengeShell — shared 3-zone layout for The Bar challenge formats.
// Locus-skinned implementation of the screenshot/PPTX shell:
//  - Left rail: Locus. wordmark, RESEARCH PREVIEW chip, numbered challenge list, session block.
//  - Header chip row: back · format · area · difficulty · step · WORTH N pts.
//  - Italic source line.
//  - Footer status strip.
//  - CTA slot bottom-right (passed via `cta` prop).
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChallengeShellChallengeListItem {
  id: string;
  index: number;
  label: string;
  status?: "active" | "done" | "pending";
}

export interface ChallengeShellSession {
  username?: string;
  streak?: number;
  rank?: string;
}

export interface ChallengeShellProps {
  formatLabel: string;
  areaLabel: string;
  difficulty: "easy" | "medium" | "hard";
  pointsLabel: string; // e.g. "WORTH 25 pts"
  stepLabel?: string; // e.g. "STEP 2 / 4"
  sourceLine?: string;
  matterContext?: string; // footer left
  footerStatus?: string; // footer right
  backHref?: string;
  cta?: ReactNode; // bottom-right CTA(s)
  showStateBar?: boolean; // dev/admin only
  stateBarChips?: { label: string; active?: boolean }[];
  challengeList?: ChallengeShellChallengeListItem[];
  session?: ChallengeShellSession;
  children: ReactNode;
}

const DIFF_CLASS: Record<ChallengeShellProps["difficulty"], string> = {
  easy: "border-emerald-500/60 text-emerald-500",
  medium: "border-amber-500/60 text-amber-500",
  hard: "border-rose-500/70 text-rose-500",
};

function Chip({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "accent" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 rounded-md font-heading",
        variant === "default" && "border-border text-foreground bg-card",
        variant === "accent" && "border-accent bg-accent text-accent-foreground",
        variant === "danger" && "border-rose-500/70 text-rose-500 bg-rose-500/10",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ChallengeShell({
  formatLabel,
  areaLabel,
  difficulty,
  pointsLabel,
  stepLabel,
  sourceLine,
  matterContext,
  footerStatus,
  backHref = "/the-bar",
  cta,
  showStateBar,
  stateBarChips,
  challengeList,
  session,
  children,
}: ChallengeShellProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(backHref);
  };
  return (
    <div className="min-h-screen bg-background text-foreground pt-28 md:pt-32 lg:pt-36">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-6 py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4 lg:gap-6">
          {/* ---------- LEFT RAIL ---------- */}
          <aside className="hidden lg:flex flex-col gap-4">
            <div className="border-2 border-foreground bg-card p-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
              <div className="font-heading font-extrabold text-2xl leading-none">
                Locus<span className="text-accent">.</span>
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                The Bar · Research Preview
              </div>
            </div>

            {challengeList && challengeList.length > 0 && (
              <div className="border-2 border-foreground bg-card p-2 space-y-1.5">
                <div className="px-2 pt-1 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Session Queue
                </div>
                {challengeList.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 text-xs font-medium border-2 rounded-sm",
                      c.status === "active"
                        ? "border-accent bg-accent/10 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                        : c.status === "done"
                          ? "border-border text-muted-foreground line-through"
                          : "border-border/40 text-muted-foreground",
                    )}
                  >
                    <span className="font-heading font-extrabold w-5 text-center text-[10px]">
                      {String(c.index).padStart(2, "0")}
                    </span>
                    <span className="truncate flex-1">{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            {session && (
              <div className="mt-auto border-2 border-foreground bg-card p-3 space-y-1.5">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Session
                </div>
                {session.username && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">student</span>
                    <span className="font-mono font-semibold">{session.username}</span>
                  </div>
                )}
                {typeof session.streak === "number" && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">streak</span>
                    <span className="font-mono font-semibold">{session.streak}d</span>
                  </div>
                )}
                {session.rank && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">rank</span>
                    <span className="font-mono font-semibold">{session.rank}</span>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ---------- MAIN ---------- */}
          <main className="space-y-4">
            {/* Dev state bar */}
            {showStateBar && stateBarChips && stateBarChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-2 border-dashed border-border rounded-md bg-muted/40">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mr-1">
                  Dev · States
                </span>
                {stateBarChips.map((c, i) => (
                  <span
                    key={i}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-sm",
                      c.active
                        ? "border-accent bg-accent/20 text-accent-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}

            {/* Header chip row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center w-8 h-8 border-2 border-foreground bg-card hover:bg-muted transition-colors rounded-md"
                aria-label="Back"
              >
                <ChevronLeft size={16} />
              </button>
              <Chip variant="accent">{formatLabel}</Chip>
              <Chip>{areaLabel}</Chip>
              <Chip
                variant={difficulty === "hard" ? "danger" : "default"}
                className={difficulty !== "hard" ? DIFF_CLASS[difficulty] : ""}
              >
                {difficulty}
              </Chip>
              {stepLabel && <Chip>{stepLabel}</Chip>}
              <div className="ml-auto">
                <Chip className="border-accent text-accent">{pointsLabel}</Chip>
              </div>
            </div>

            {sourceLine && (
              <div className="text-xs italic text-muted-foreground">{sourceLine}</div>
            )}

            {/* Content slot */}
            <div className="space-y-4">{children}</div>

            {/* Footer status strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t-2 border-border text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <div>{matterContext ?? "—"}</div>
              <div className="flex items-center gap-3">
                <span>{footerStatus ?? "Live · Recording for review"}</span>
              </div>
            </div>

            {/* CTA bottom-right */}
            {cta && <div className="flex justify-end pt-2">{cta}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}

// Convenience yellow-CTA button to keep visual cohesion across renderers.
export function ShellPrimaryCta({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 font-heading font-extrabold text-sm uppercase tracking-wider",
        "border-2 border-foreground bg-accent text-accent-foreground",
        "shadow-[4px_4px_0_0_hsl(var(--foreground))]",
        "transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
        "rounded-md",
      )}
    >
      {children}
    </button>
  );
}
