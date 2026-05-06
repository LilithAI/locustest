import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export interface Internship {
  id: string;
  user_id: string;
  firm_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

interface Props {
  userId: string;
  internships: Internship[];
  setInternships: (v: Internship[]) => void;
}

const DESC_MAX = 500;

export default function InternshipsSection({ userId, internships, setInternships }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Internship | null>(null);
  const [editing, setEditing] = useState<Internship | null>(null);
  const [saving, setSaving] = useState(false);

  const [firmName, setFirmName] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ongoing, setOngoing] = useState(false);
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setFirmName(""); setRole(""); setStartDate(""); setEndDate(""); setOngoing(false); setDescription("");
  };

  const openNew = () => { setEditing(null); resetForm(); setOpen(true); };
  const openEdit = (i: Internship) => {
    setEditing(i);
    setFirmName(i.firm_name); setRole(i.role); setStartDate(i.start_date);
    setEndDate(i.end_date || ""); setOngoing(!i.end_date); setDescription(i.description || "");
    setOpen(true);
  };

  const save = async () => {
    if (!firmName.trim() || !role.trim() || !startDate) { toast.error("Firm, role, and start date are required"); return; }
    if (description.length > DESC_MAX) { toast.error(`Description must be ${DESC_MAX} chars or less`); return; }
    if (!ongoing && endDate && endDate < startDate) { toast.error("End date can't be before start date"); return; }

    const payload = {
      user_id: userId,
      firm_name: firmName.trim(),
      role: role.trim(),
      start_date: startDate,
      end_date: ongoing ? null : (endDate || null),
      description: description.trim() || null,
    };

    setSaving(true);
    if (editing) {
      const { data, error } = await supabase.from("profile_internships").update(payload).eq("id", editing.id).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setInternships(internships.map((i) => i.id === data.id ? (data as Internship) : i).sort(byStart));
    } else {
      const { data, error } = await supabase.from("profile_internships").insert(payload).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setInternships([data as Internship, ...internships].sort(byStart));
    }
    setOpen(false);
    toast.success("Saved");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("profile_internships").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setInternships(internships.filter((i) => i.id !== deleting.id));
    setDeleting(null);
    toast.success("Deleted");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading">Internships</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit internship" : "Add internship"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Firm name</Label>
                <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Summer Associate" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={endDate} disabled={ongoing} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox checked={ongoing} onCheckedChange={(v) => setOngoing(!!v)} />
                I currently work here
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <span className={`text-xs ${description.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}>{description.length}/{DESC_MAX}</span>
                </div>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={DESC_MAX + 50} />
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
        {internships.length === 0 && <p className="text-sm text-muted-foreground">No internships added yet.</p>}
        {internships.map((i) => (
          <div key={i.id} className="rounded-lg border border-border p-4 bg-card/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{i.firm_name}</p>
                <p className="text-sm text-muted-foreground">{i.role}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtDate(i.start_date)} — {i.end_date ? fmtDate(i.end_date) : "ongoing"}
                </p>
                {i.description && <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{i.description}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete internship?</AlertDialogTitle>
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

const byStart = (a: Internship, b: Internship) => (a.start_date < b.start_date ? 1 : -1);
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
