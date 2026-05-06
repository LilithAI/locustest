// Locus+ neobrutalist primitives (dark, 2px borders, no shadows).
import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Dark card surface */
export function PremiumCard({
  children,
  className,
  hoverable,
  selected,
  state,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
  state?: "correct" | "wrong";
}) {
  return (
    <div
      className={cn(
        "border-2 rounded-[6px] p-[18px] transition-colors",
        "bg-[hsl(var(--lp-bg-1))] border-[hsl(var(--lp-line))]",
        hoverable && "cursor-pointer hover:bg-[hsl(var(--lp-bg-2))] hover:border-[hsl(var(--lp-line-2))]",
        selected && "border-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)]",
        state === "correct" && "border-[hsl(152_55%_53%/0.55)] bg-[hsl(var(--lp-good-soft))]",
        state === "wrong" && "border-[hsl(358_100%_67%/0.5)] bg-[hsl(var(--lp-bad-soft))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Mono uppercase label */
export function PremiumLabel({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "accent" | "ink";
}) {
  return (
    <div
      className={cn(
        "uppercase tracking-[0.18em] text-[10.5px] font-medium",
        tone === "muted" && "text-[hsl(var(--lp-text-3))]",
        tone === "accent" && "text-[hsl(var(--lp-accent))]",
        tone === "ink" && "text-[hsl(var(--lp-text))]",
        className,
      )}
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}
    >
      {children}
    </div>
  );
}

/** Mono chip (e.g. counter chip) */
export function PremiumChip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "good" | "bad";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-[4px] border-2 uppercase",
        "text-[11px] tracking-[0.08em]",
        tone === "default" && "border-[hsl(var(--lp-line))] text-[hsl(var(--lp-text-2))] bg-[hsl(var(--lp-bg-1))]",
        tone === "accent" && "border-[hsl(45_100%_63%/0.35)] text-[hsl(var(--lp-accent))] bg-[hsl(45_100%_63%/0.12)]",
        tone === "good" && "border-[hsl(152_55%_53%/0.35)] text-[hsl(152_55%_70%)] bg-[hsl(var(--lp-good-soft))]",
        tone === "bad" && "border-[hsl(358_100%_67%/0.35)] text-[hsl(358_100%_78%)] bg-[hsl(var(--lp-bad-soft))]",
        className,
      )}
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}
    >
      {children}
    </span>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

export function PremiumButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-2 rounded-[4px] font-semibold",
        "transition-colors active:translate-y-[1px] disabled:opacity-35 disabled:cursor-not-allowed",
        size === "md" ? "px-[18px] py-[10px] text-[13.5px]" : "px-[22px] py-3 text-[14.5px]",
        variant === "primary" &&
          "bg-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent-ink))] border-[hsl(var(--lp-accent))] hover:bg-[hsl(45_100%_70%)] hover:border-[hsl(45_100%_70%)]",
        variant === "secondary" &&
          "bg-[hsl(var(--lp-bg-1))] text-[hsl(var(--lp-text))] border-[hsl(var(--lp-line))] hover:bg-[hsl(var(--lp-bg-2))] hover:border-[hsl(var(--lp-line-2))]",
        variant === "ghost" &&
          "bg-transparent text-[hsl(var(--lp-text-2))] border-transparent hover:text-[hsl(var(--lp-text))] hover:bg-[hsl(var(--lp-bg-1))]",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Letter pill used inside option cards (A / B / C ...) */
export function LetterBadge({
  letter,
  selected,
  state,
  className,
}: {
  letter: string;
  selected?: boolean;
  state?: "correct" | "wrong";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center w-7 h-7 rounded-[3px] border-[1.5px] text-[11px] shrink-0",
        "border-[hsl(var(--lp-line-2))] text-[hsl(var(--lp-text-2))] bg-[hsl(var(--lp-bg))]",
        selected && "bg-[hsl(var(--lp-accent))] text-[hsl(var(--lp-accent-ink))] border-[hsl(var(--lp-accent))]",
        state === "correct" && "bg-[hsl(var(--lp-good))] text-[hsl(0_0%_5%)] border-[hsl(var(--lp-good))]",
        state === "wrong" && "bg-[hsl(var(--lp-bad))] text-[hsl(0_0%_5%)] border-[hsl(var(--lp-bad))]",
        className,
      )}
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" }}
    >
      {letter}
    </span>
  );
}
