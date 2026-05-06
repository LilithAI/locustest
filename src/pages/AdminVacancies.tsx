import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, ShieldOff, Pencil, Archive, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import AdminVacancyDialog from "@/components/vacancies/AdminVacancyDialog";
import { type Vacancy, daysLeft } from "@/lib/vacancies";

export default function AdminVacancies() {
  usePageMeta({
    title: "Admin · Vacancies — Locus",
    description: "Curate the live vacancy board.",
    path: "/admin/vacancies",
  });

  const { ready: adminReady, hasScope } = useAdminAccess();
  const isAdmin = !adminReady ? null : hasScope("opportunities_admin");
  const { userId } = useAuthSession();
  const [rows, setRows] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vacancy | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vacancies")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Vacancy[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center border-2 border-border space-y-4">
          <div className="flex justify-center"><ShieldOff className="w-12 h-12 text-destructive" /></div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <Button asChild><Link to="/">Back to Home</Link></Button>
        </Card>
      </div>
    );
  }

  const archiveNow = async (v: Vacancy) => {
    const { error } = await supabase
      .from("vacancies")
      .update({ status: "archived", expires_at: new Date().toISOString() })
      .eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success("Archived."); void load(); }
  };

  const remove = async (v: Vacancy) => {
    if (!confirm(`Permanently delete "${v.firm_name} — ${v.role}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("vacancies").delete().eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success("Deleted."); void load(); }
  };

  const live = rows.filter((r) => r.status === "live" && new Date(r.expires_at).getTime() > Date.now());
  const expired = rows.filter((r) => !(r.status === "live" && new Date(r.expires_at).getTime() > Date.now()));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 container mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold">Vacancies — Admin</h1>
          <p className="text-muted-foreground mt-1">
            Curate 2–5 live vacancies. Auto-archives on expiry, hard-deletes after 30 days.
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="font-bold border-2 border-foreground/80 shadow-[3px_3px_0_0_hsl(var(--foreground))]"
        >
          <Plus size={16} className="mr-1.5" /> Add vacancy
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-bold mb-3">
              Live <span className="text-muted-foreground text-sm font-normal">({live.length})</span>
            </h2>
            {live.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground border-dashed">
                No live vacancies. Add one to populate the board.
              </Card>
            ) : (
              <div className="space-y-2">
                {live.map((v) => (
                  <Row key={v.id} v={v} onEdit={(x) => { setEditing(x); setDialogOpen(true); }} onArchive={archiveNow} onDelete={remove} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">
              Archived / expired <span className="text-muted-foreground text-sm font-normal">({expired.length})</span>
            </h2>
            {expired.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground border-dashed">
                Nothing in the archive yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {expired.map((v) => (
                  <Row key={v.id} v={v} archived onEdit={(x) => { setEditing(x); setDialogOpen(true); }} onArchive={archiveNow} onDelete={remove} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {userId && (
        <AdminVacancyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={editing}
          onSaved={load}
          userId={userId}
        />
      )}
    </div>
  );
}

function Row({
  v, archived = false, onEdit, onArchive, onDelete,
}: {
  v: Vacancy;
  archived?: boolean;
  onEdit: (v: Vacancy) => void;
  onArchive: (v: Vacancy) => void;
  onDelete: (v: Vacancy) => void;
}) {
  const d = daysLeft(v.expires_at);
  return (
    <Card className="p-4 flex items-center gap-3 flex-wrap border-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-extrabold truncate">{v.firm_name}</span>
          <span className="text-muted-foreground text-sm">— {v.role}</span>
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
              v.opportunity_type === "job"
                ? "border-foreground/60 bg-background text-foreground"
                : "border-foreground/60 bg-accent text-accent-foreground"
            }`}
          >
            {v.opportunity_type === "job" ? "Job" : "Internship"}
          </span>
          {!archived && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
              {d}d left
            </span>
          )}
          {archived && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">
              {v.status === "live" ? "Expired" : "Archived"}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {v.application_email}{v.location ? ` · ${v.location}` : ""}{v.source_credit ? ` · ${v.source_credit}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button asChild size="sm" variant="ghost" title="View on board">
          <Link to={`/vacancies#vacancy-${v.id}`} target="_blank"><ExternalLink size={14} /></Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(v)} title="Edit">
          <Pencil size={14} />
        </Button>
        {!archived && (
          <Button size="sm" variant="ghost" onClick={() => onArchive(v)} title="Archive now">
            <Archive size={14} />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onDelete(v)} title="Delete" className="text-destructive hover:text-destructive">
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  );
}
