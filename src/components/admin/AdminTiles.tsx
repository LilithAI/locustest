import { Link } from "react-router-dom";
import { ArrowRight, LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <div className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="font-heading text-3xl font-black leading-none">
        {loading ? "—" : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export function ToolTile({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="group block border-2 border-foreground bg-card p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-accent text-accent-foreground border-2 border-foreground shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-extrabold text-lg leading-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-accent shrink-0 mt-1">
          Open
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
