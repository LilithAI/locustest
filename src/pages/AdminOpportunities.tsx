import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, ShieldOff, Trash2, Briefcase, FileText, Gavel, Trophy, Pencil, Archive, Inbox } from "lucide-react";
import ReviewQueuePanel from "@/components/admin/opportunities/ReviewQueuePanel";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import PasteExtractDialog, { type OppStream } from "@/components/admin/opportunities/PasteExtractDialog";
import AdminVacancyDialog from "@/components/vacancies/AdminVacancyDialog";
import { type Vacancy, daysLeft } from "@/lib/vacancies";

type Row = Record<string, any> & { id: string; status: string; expires_at: string };

const TABLES = [
  { key: "cfp" as const, table: "cfps", label: "CFPs", icon: FileText, titleField: "publication_name", subField: "theme" },
  { key: "moot" as const, table: "moots", label: "Moots", icon: Gavel, titleField: "competition_name", subField: "organiser" },
  { key: "competition" as const, table: "competitions", label: "Competitions", icon: Trophy, titleField: "title", subField: "organiser" },
];

function VacanciesPanel({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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

  useEffect(() => { void load(); }, [load]);

  const archive = async (v: Vacancy) => {
    const { error } = await supabase.from("vacancies")
      .update({ status: "archived", expires_at: new Date().toISOString() }).eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success("Archived."); void load(); }
  };
  const remove = async (v: Vacancy) => {
    if (!confirm(`Permanently delete "${v.firm_name} — ${v.role}"?`)) return;
    const { error } = await supabase.from("vacancies").delete().eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success("Deleted."); void load(); }
  };

  const live = rows.filter((r) => r.status === "live" && new Date(r.expires_at).getTime() > Date.now());
  const expired = rows.filter((r) => !(r.status === "live" && new Date(r.expires_at).getTime() > Date.now()));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
        >
          <Plus size={16} className="mr-1.5" /> Add vacancy
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : (
        <>
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Live ({live.length})</h3>
            <div className="grid gap-3">
              {live.length === 0 && <p className="text-sm text-muted-foreground">Nothing live.</p>}
              {live.map((v) => (
                <Card key={v.id} className="border-2 border-foreground p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-bold">{v.firm_name} — {v.role}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-1">
                        {v.opportunity_type} · {daysLeft(v.expires_at)}d left · expires {new Date(v.expires_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(v); setOpen(true); }}><Pencil size={14} /></Button>
                      <Button size="sm" variant="outline" onClick={() => archive(v)}><Archive size={14} /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(v)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Archived / Expired ({expired.length})</h3>
            <div className="grid gap-3">
              {expired.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {expired.map((v) => (
                <Card key={v.id} className="border-2 border-foreground p-4 opacity-60">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-bold">{v.firm_name} — {v.role}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-1">
                        {v.status} · expired {new Date(v.expires_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(v); setOpen(true); }}><Pencil size={14} /></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(v)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <AdminVacancyDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSaved={load}
        userId={userId}
      />
    </div>
  );
}

function StreamPanel({
  stream,
  table,
  titleField,
  subField,
  userId,
}: {
  stream: OppStream;
  table: "cfps" | "moots" | "competitions";
  titleField: string;
  subField: string;
  userId: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from(table) as any)
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table]);

  useEffect(() => { void load(); }, [load]);

  const archive = async (r: Row) => {
    const { error } = await (supabase.from(table) as any)
      .update({ status: "archived", expires_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Archived."); void load(); }
  };

  const remove = async (r: Row) => {
    if (!confirm("Permanently delete this entry?")) return;
    const { error } = await (supabase.from(table) as any).delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Deleted."); void load(); }
  };

  const live = rows.filter((r) => r.status === "live" && new Date(r.expires_at).getTime() > Date.now());
  const expired = rows.filter((r) => !(r.status === "live" && new Date(r.expires_at).getTime() > Date.now()));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setOpen(true)}
          className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
        >
          <Plus size={16} className="mr-1.5" /> Add {stream}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : (
        <>
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Live ({live.length})
            </h3>
            <div className="grid gap-3">
              {live.length === 0 && <p className="text-sm text-muted-foreground">Nothing live.</p>}
              {live.map((r) => (
                <RowCard key={r.id} r={r} titleField={titleField} subField={subField} onArchive={archive} onDelete={remove} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Archived / Expired ({expired.length})
            </h3>
            <div className="grid gap-3">
              {expired.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {expired.map((r) => (
                <RowCard key={r.id} r={r} titleField={titleField} subField={subField} onArchive={archive} onDelete={remove} archived />
              ))}
            </div>
          </section>
        </>
      )}

      <PasteExtractDialog
        open={open}
        onOpenChange={setOpen}
        stream={stream}
        userId={userId}
        onSaved={load}
      />
    </div>
  );
}

function RowCard({
  r,
  titleField,
  subField,
  onArchive,
  onDelete,
  archived,
}: {
  r: Row;
  titleField: string;
  subField: string;
  onArchive: (r: Row) => void;
  onDelete: (r: Row) => void;
  archived?: boolean;
}) {
  return (
    <Card className={`border-2 border-foreground p-4 ${archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-heading font-bold">{r[titleField] ?? "(untitled)"}</div>
          {r[subField] && <div className="text-sm text-muted-foreground">{r[subField]}</div>}
          <div className="text-[11px] font-mono text-muted-foreground mt-1">
            {r.status} · expires {new Date(r.expires_at).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          {!archived && (
            <Button size="sm" variant="outline" onClick={() => onArchive(r)}>Archive</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onDelete(r)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminOpportunities() {
  usePageMeta({
    title: "Admin · Opportunities — Locus",
    description: "Curate vacancies, CFPs, moots, and competitions.",
    path: "/admin/opportunities",
  });
  const { ready: adminReady, hasScope } = useAdminAccess();
  const isAdmin = !adminReady ? null : hasScope("opportunities_admin");
  const { userId } = useAuthSession();
  const [tab, setTab] = useState("vacancies");

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Console</p>
        <h1 className="font-heading text-3xl md:text-4xl font-black">Opportunities</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          One board for vacancies, calls for papers, moots, and competitions.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border-2 border-foreground">
          <TabsTrigger value="vacancies"><Briefcase size={14} className="mr-1" /> Vacancies</TabsTrigger>
          <TabsTrigger value="queue"><Inbox size={14} className="mr-1" /> Review Queue</TabsTrigger>
          {TABLES.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              <t.icon size={14} className="mr-1" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="vacancies" className="mt-6">
          <VacanciesPanel userId={userId ?? ""} />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <ReviewQueuePanel userId={userId ?? ""} />
        </TabsContent>

        {TABLES.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <StreamPanel
              stream={t.key}
              table={t.table as "cfps" | "moots" | "competitions"}
              titleField={t.titleField}
              subField={t.subField}
              userId={userId ?? ""}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
