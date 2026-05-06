import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["application_status"];

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "bg-muted text-muted-foreground border-border" },
  acknowledged: { label: "Acknowledged", cls: "bg-blue-500/10 text-blue-400 border-blue-500/40" },
  interview_scheduled: { label: "Interview scheduled", cls: "bg-accent/15 text-accent border-accent/50" },
  interviewed: { label: "Interviewed", cls: "bg-accent/15 text-accent border-accent/50" },
  offer: { label: "Offer", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" },
  accepted: { label: "Accepted", cls: "bg-emerald-500 text-black border-emerald-600" },
  rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/40" },
  withdrawn: { label: "Withdrawn", cls: "bg-muted/40 text-muted-foreground border-border" },
  no_response: { label: "No response", cls: "bg-muted/40 text-muted-foreground border-border" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({
  value: value as Status,
  label: m.label,
}));

export default function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
