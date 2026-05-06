import { AlertTriangle, Info, Lightbulb, Scale } from "lucide-react";
import type { ReactNode } from "react";

type CalloutType = "rule" | "warning" | "tip" | "info";

/* Each variant maps to one of the prose semantic tokens defined in
   .playbook-prose (--prose-anchor / -positive / -warning / -emphasis). */
const variants: Record<
  CalloutType,
  { icon: typeof Info; token: string; label: string }
> = {
  rule: { icon: Scale, token: "--prose-anchor", label: "Rule" },
  tip: { icon: Lightbulb, token: "--prose-positive", label: "Tip" },
  warning: { icon: AlertTriangle, token: "--prose-warning", label: "Watch out" },
  info: { icon: Info, token: "--prose-emphasis", label: "Note" },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const v = variants[type];
  const Icon = v.icon;
  const tint = `hsl(var(${v.token}))`;
  return (
    <div
      className="my-6 rounded-lg border-l-[3px] p-5"
      style={{
        borderLeftColor: tint,
        background: `hsl(var(${v.token}) / 0.07)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: tint }} />
        <span
          className="text-[11px] font-bold uppercase tracking-[0.16em] font-sora"
          style={{ color: tint }}
        >
          {title || v.label}
        </span>
      </div>
      <div className="text-[0.95rem] leading-relaxed text-foreground/88 [&>p]:mb-2 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
