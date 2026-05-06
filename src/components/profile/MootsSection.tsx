import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type MootRole = "speaker" | "researcher" | "both";
type MootResult = "winner" | "runner_up" | "semi_finalist" | "quarter_finalist" | "participant";

export interface Moot {
  id: string;
  user_id: string;
  competition_name: string;
  year: number;
  role: MootRole;
  result: MootResult;
}

const ROLES: MootRole[] = ["speaker", "researcher", "both"];
const RESULTS: MootResult[] = ["winner", "runner_up", "semi_finalist", "quarter_finalist", "participant"];
const RESULT_LABEL: Record<MootResult, string> = {
  winner: "Winner", runner_up: "Runner-up", semi_finalist: "Semi-finalist", quarter_finalist: "Quarter-finalist", participant: "Participant",
};

interface Props {
  userId: string;
  moots: Moot[];
  setMoots: (v: Moot[]) => void;
}

export default function MootsSection({ userId, moots, setMoots }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Moot | null>(null);
  const [deleting, setDeleting] = useState<Moot | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [role, setRole] = useState<MootRole>("speaker");
  const [result, setResult] = useState<MootResult>("participant");

  const resetForm = () => { setName(""); setYear(""); setRole("speaker"); setResult("participant"); };
  const openNew = () => { setEditing(null); resetForm(); setOpen(true); };
  const openEdit = (m: Moot) => {
    setEditing(m);
    setName(m.competition_name); setYear(String(m.year)); setRole(m.role); setResult(m.result);
    setOpen(true);
  };

  const save = async () => {
    const yearNum = Number(year);
    if (!name.trim()) { toast.error("Competition name is required"); return; }
    if (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2100) { toast.error("Year must be between 1950 and 2100"); return; }

    const payload = { user_id: userId, competition_name: name.trim(), year: yearNum, role, result };
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase.from("profile_moots").update(payload).eq("id", editing.id).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setMoots(moots.map((m) => m.id === data.id ? (data as Moot) : m).sort(byYear));
    } else {
      const { data, error } = await supabase.from("profile_moots").insert(payload).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setMoots([data as Moot, ...moots].sort(byYear));
    }
    setOpen(false);
    toast.success("Saved");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("profile_moots").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setMoots(moots.filter((m) => m.id !== deleting.id));
    setDeleting(null);
    toast.success("Deleted");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading">Moots</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit moot" : "Add moot"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Competition name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" min={1950} max={2100} value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as MootRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Result</Label>
                  <Select value={result} onValueChange={(v) => setResult(v as MootResult)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESULTS.map((r) => <SelectItem key={r} value={r}>{RESULT_LABEL[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {moots.length === 0 && <p className="text-sm text-muted-foreground">No moots added yet.</p>}
        {moots.map((m) => (
          <div key={m.id} className="rounded-lg border border-border p-4 bg-card/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{m.competition_name}</p>
                <p className="text-sm text-muted-foreground">{m.year} · {m.role} · {RESULT_LABEL[m.result]}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(m)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete moot?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const byYear = (a: Moot, b: Moot) => b.year - a.year;
