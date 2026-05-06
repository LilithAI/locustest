import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  count: number;
  children: ReactNode;
}

export function StageSection({ title, subtitle, count, children }: Props) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-4 mb-4 pb-2 border-b border-border/60">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground shrink-0">
          {String(count).padStart(2, "0")} {count === 1 ? "GUIDE" : "GUIDES"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </section>
  );
}
