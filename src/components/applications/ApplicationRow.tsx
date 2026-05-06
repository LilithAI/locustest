import { useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import StatusPill from "./StatusPill";
import { METHOD_META } from "./methodMeta";
import type { Database } from "@/integrations/supabase/types";

type App = Database["public"]["Tables"]["profile_applications"]["Row"];

interface Props {
  app: App;
  onEdit: (app: App) => void;
  onDelete: (app: App) => void;
}

export default function ApplicationRow({ app, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const Method = METHOD_META[app.method].Icon;

  return (
    <div className="border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))] transition-shadow hover:shadow-[5px_5px_0_0_hsl(var(--accent))]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-sm font-bold text-foreground">
              {app.firm_name_snapshot}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{app.role}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Method size={11} />
              {METHOD_META[app.method].label}
            </span>
          </div>
        </div>
        <div className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
          {format(parseISO(app.applied_on), "d MMM yy")}
        </div>
        <StatusPill status={app.status} />
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 px-4 py-3">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Meta label="Applied" value={format(parseISO(app.applied_on), "d MMM yyyy")} />
            <Meta label="Method" value={METHOD_META[app.method].label} />
            <Meta
              label="Status changed"
              value={formatDistanceToNow(new Date(app.status_updated_at), { addSuffix: true })}
            />
            <Meta
              label="Logged"
              value={formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
            />
          </div>
          {app.notes && (
            <div className="border border-border/60 bg-background p-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Notes
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{app.notes}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onEdit(app)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(app)}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
    <div className="mt-0.5 text-foreground">{value}</div>
  </div>
);
