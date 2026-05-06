import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

export interface Publication {
  id: string;
  user_id: string;
  title: string;
  publisher: string;
  url: string | null;
  publication_date: string;
}

interface Props {
  userId: string;
  publications: Publication[];
  setPublications: (v: Publication[]) => void;
}

export default function PublicationsSection({ userId, publications, setPublications }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [deleting, setDeleting] = useState<Publication | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [pubDate, setPubDate] = useState("");

  const resetForm = () => { setTitle(""); setPublisher(""); setUrl(""); setPubDate(""); };
  const openNew = () => { setEditing(null); resetForm(); setOpen(true); };
  const openEdit = (p: Publication) => {
    setEditing(p);
    setTitle(p.title); setPublisher(p.publisher); setUrl(p.url || ""); setPubDate(p.publication_date);
    setOpen(true);
  };

  const isValidUrl = (v: string) => { try { new URL(v); return true; } catch { return false; } };

  const save = async () => {
    if (!title.trim() || !publisher.trim() || !pubDate) { toast.error("Title, publisher, and date are required"); return; }
    if (url && !isValidUrl(url)) { toast.error("URL must start with http:// or https://"); return; }

    const payload = {
      user_id: userId,
      title: title.trim(),
      publisher: publisher.trim(),
      url: url.trim() || null,
      publication_date: pubDate,
    };
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase.from("profile_publications").update(payload).eq("id", editing.id).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setPublications(publications.map((p) => p.id === data.id ? (data as Publication) : p).sort(byDate));
    } else {
      const { data, error } = await supabase.from("profile_publications").insert(payload).select().maybeSingle();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      if (data) setPublications([data as Publication, ...publications].sort(byDate));
    }
    setOpen(false);
    toast.success("Saved");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("profile_publications").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    setPublications(publications.filter((p) => p.id !== deleting.id));
    setDeleting(null);
    toast.success("Deleted");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading">Publications</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit publication" : "Add publication"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Publisher</Label>
                <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="e.g. NLSIR" />
              </div>
              <div className="space-y-2">
                <Label>URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Publication date</Label>
                <Input type="date" value={pubDate} onChange={(e) => setPubDate(e.target.value)} />
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
        {publications.length === 0 && <p className="text-sm text-muted-foreground">No publications added yet.</p>}
        {publications.map((p) => (
          <div key={p.id} className="rounded-lg border border-border p-4 bg-card/50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  {p.title}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Open publication">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{p.publisher}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(p.publication_date)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete publication?</AlertDialogTitle>
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

const byDate = (a: Publication, b: Publication) => (a.publication_date < b.publication_date ? 1 : -1);
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
