import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAdminAccess } from "@/hooks/useAdminRole";
import AccessDenied from "@/components/admin/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, X, Copy, RefreshCw, Mail, Phone, Award, Building2 } from "lucide-react";

type Status = "pending" | "accepted" | "rejected";

interface Suggestion {
  id: string;
  firm_id: string;
  firm_name_snapshot: string;
  firm_city_snapshot: string | null;
  user_id: string | null;
  field: "email" | "tier" | "phone";
  current_value: string | null;
  suggested_value: string;
  evidence: string | null;
  status: Status;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
}

const fieldIcon = { email: Mail, phone: Phone, tier: Award } as const;

export default function AdminFirmSuggestions() {
  usePageMeta({ title: "Firm Suggestions — Admin", description: "Review crowdsourced corrections.", path: "/admin/firm-suggestions" });
  const { ready, userId } = useAuthSession();
  const { ready: adminReady, hasScope } = useAdminAccess();
  const [filter, setFilter] = useState<Status>("pending");
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("firm_suggestions")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Failed to load suggestions", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as Suggestion[]) ?? []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (ready && userId) void load();
  }, [ready, userId, load]);

  const review = async (id: string, status: Status) => {
    setBusyId(id);
    const { error } = await supabase
      .from("firm_suggestions")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        admin_note: notes[id]?.trim() || null,
      })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "accepted" ? "Accepted" : "Rejected" });
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const copyApply = (s: Suggestion) => {
    const payload = `firm_id: ${s.firm_id}\nfield: ${s.field}\nnew_value: ${s.suggested_value}`;
    navigator.clipboard.writeText(payload);
    toast({ title: "Copied to clipboard", description: "Paste in chat to ask AI to apply this to firms.json." });
  };

  if (!adminReady) return null;
  if (!hasScope("waitlist_admin")) {
    return <AccessDenied message="You need Waitlist admin access to review firm suggestions." />;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Console</p>
          <h1 className="font-heading text-3xl md:text-4xl font-black">Firm Suggestions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review crowdsourced fixes from students. Accept the good ones — applying them to the static directory is a one-shot AI task.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="flex items-center gap-2 mb-5">
        {(["pending", "accepted", "rejected"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-bold border-2 capitalize transition-all ${
              filter === s
                ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                : "border-border bg-card hover:border-foreground/50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <Building2 className="mx-auto mb-3 opacity-40" size={36} />
          <p className="text-muted-foreground text-sm">No {filter} suggestions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => {
            const Icon = fieldIcon[s.field];
            return (
              <div key={s.id} className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className="text-accent" />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.field}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">·</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                    <h3 className="font-heading font-extrabold text-base leading-tight">{s.firm_name_snapshot}</h3>
                    <p className="text-xs text-muted-foreground">
                      {s.firm_city_snapshot ?? "—"} · <span className="font-mono">{s.firm_id}</span>
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Currently</p>
                    <div className="text-sm bg-muted/50 border border-border rounded px-3 py-2 font-mono break-all">
                      {s.current_value || <span className="italic text-muted-foreground">empty</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">Suggested</p>
                    <div className="text-sm bg-accent/10 border-2 border-accent/40 rounded px-3 py-2 font-mono break-all font-bold">
                      {s.suggested_value}
                    </div>
                  </div>
                </div>

                {s.evidence && (
                  <div className="mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Evidence</p>
                    <p className="text-sm bg-muted/30 border border-border rounded px-3 py-2 italic">{s.evidence}</p>
                  </div>
                )}

                {filter === "pending" && (
                  <>
                    <Input
                      placeholder="Optional admin note…"
                      value={notes[s.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                      maxLength={500}
                      className="mb-3"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => review(s.id, "accepted")}
                        disabled={busyId === s.id}
                        className="border-2 border-foreground bg-accent text-accent-foreground font-bold shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                      >
                        <Check size={14} className="mr-1.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(s.id, "rejected")}
                        disabled={busyId === s.id}
                        className="border-2 border-foreground"
                      >
                        <X size={14} className="mr-1.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyApply(s)}
                        className="border-2 border-foreground"
                      >
                        <Copy size={14} className="mr-1.5" /> Copy apply payload
                      </Button>
                    </div>
                  </>
                )}

                {filter !== "pending" && s.admin_note && (
                  <p className="text-xs text-muted-foreground mt-2 italic">Admin note: {s.admin_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
