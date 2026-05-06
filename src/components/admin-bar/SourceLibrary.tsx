import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, MessageSquare, Eye, Trash2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AiExtractDialog from "./AiExtractDialog";
import AiDraftDialog from "./AiDraftDialog";
import AiSuggestTopicsDialog from "./AiSuggestTopicsDialog";

const LICENSES = ["public_domain", "licensed", "fair_use_claim", "user_submitted", "other"] as const;

type Source = {
  id: string;
  title: string;
  description: string | null;
  source_type: "pdf_extraction" | "topic_prompt" | "manual";
  license: typeof LICENSES[number];
  storage_path: string | null;
  topic_prompt: string | null;
  uploaded_by: string;
  created_at: string;
};

export default function SourceLibrary() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [viewSource, setViewSource] = useState<Source | null>(null);
  const [deleteSource, setDeleteSource] = useState<Source | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [extractTarget, setExtractTarget] = useState<{ source: Source; mode: "single" | "batch" } | null>(null);
  const [draftTarget, setDraftTarget] = useState<Source | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bar_sources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setSources((data as Source[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const fetchSigned = async () => {
      if (viewSource?.source_type === "pdf_extraction" && viewSource.storage_path) {
        const { data } = await supabase.storage.from("bar-sources")
          .createSignedUrl(viewSource.storage_path, 60);
        setSignedUrl(data?.signedUrl ?? null);
      } else {
        setSignedUrl(null);
      }
    };
    if (viewSource) fetchSigned();
  }, [viewSource]);

  const handleDelete = async () => {
    if (!deleteSource) return;
    if (deleteSource.storage_path) {
      await supabase.storage.from("bar-sources").remove([deleteSource.storage_path]);
    }
    const { error } = await supabase.from("bar_sources").delete().eq("id", deleteSource.id);
    if (error) toast.error(error.message);
    else { toast.success("Source deleted"); load(); }
    setDeleteSource(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Source Library</h2>
        <div className="flex gap-2">
          <Button onClick={() => setUploadOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" /> Upload PDF
          </Button>
          <Button onClick={() => setPromptOpen(true)} variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" /> Add Topic Prompt
          </Button>
          <Button onClick={() => setSuggestOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> AI Suggest Topics
          </Button>
        </div>
      </div>

      <Card className="border-2 border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            )}
            {!loading && sources.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sources yet.</TableCell></TableRow>
            )}
            {sources.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.title}</TableCell>
                <TableCell><Badge variant="outline">{s.source_type.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs">{s.license.replace("_", " ")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), "PP")}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                    {s.source_type === "pdf_extraction" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setExtractTarget({ source: s, mode: "single" })}>
                          <Sparkles className="w-3 h-3 mr-1" /> Extract 1
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setExtractTarget({ source: s, mode: "batch" })}>
                          <Sparkles className="w-3 h-3 mr-1" /> Batch
                        </Button>
                      </>
                    )}
                    {s.source_type === "topic_prompt" && (
                      <Button size="sm" variant="outline" onClick={() => setDraftTarget(s)}>
                        <Sparkles className="w-3 h-3 mr-1" /> Draft
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setViewSource(s)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteSource(s)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UploadPdfDialog open={uploadOpen} onOpenChange={setUploadOpen} onCreated={load} />
      <AddPromptDialog open={promptOpen} onOpenChange={setPromptOpen} onCreated={load} />
      <AiSuggestTopicsDialog open={suggestOpen} onOpenChange={setSuggestOpen} onCreated={load} />

      {extractTarget && (
        <AiExtractDialog
          open={!!extractTarget}
          onOpenChange={(o) => { if (!o) setExtractTarget(null); }}
          sourceId={extractTarget.source.id}
          sourceTitle={extractTarget.source.title}
          mode={extractTarget.mode}
        />
      )}
      {draftTarget && (
        <AiDraftDialog
          open={!!draftTarget}
          onOpenChange={(o) => { if (!o) setDraftTarget(null); }}
          sourceId={draftTarget.id}
          sourceTitle={draftTarget.title}
        />
      )}

      {/* View dialog */}
      <Dialog open={!!viewSource} onOpenChange={(o) => !o && setViewSource(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewSource?.title}</DialogTitle>
            <DialogDescription>
              <Badge variant="outline" className="mr-2">{viewSource?.source_type.replace("_", " ")}</Badge>
              <Badge variant="secondary">{viewSource?.license.replace("_", " ")}</Badge>
            </DialogDescription>
          </DialogHeader>
          {viewSource?.description && (
            <div><Label>Description</Label><p className="text-sm mt-1">{viewSource.description}</p></div>
          )}
          {viewSource?.topic_prompt && (
            <div><Label>Topic Prompt</Label><p className="text-sm mt-1 whitespace-pre-wrap">{viewSource.topic_prompt}</p></div>
          )}
          {signedUrl && (
            <Button asChild variant="outline">
              <a href={signedUrl} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-2" />Download PDF</a>
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSource} onOpenChange={(o) => !o && setDeleteSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this source?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{deleteSource?.title}" and any uploaded file. Linked challenges will keep their data but lose the source link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UploadPdfDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState<typeof LICENSES[number]>("other");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setLicense("other"); setFile(null); };

  const submit = async () => {
    if (!title.trim() || !file) { toast.error("Title and PDF are required"); return; }
    if (file.type !== "application/pdf") { toast.error("Only PDF allowed"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Max 50MB"); return; }

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); toast.error("Not signed in"); return; }

    const id = crypto.randomUUID();
    const path = `${id}/${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("bar-sources").upload(path, file, { contentType: "application/pdf" });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }

    const { error: insErr } = await supabase.from("bar_sources").insert({
      id, title: title.trim(), description: description.trim() || null,
      source_type: "pdf_extraction", license, storage_path: path, uploaded_by: user.id,
    });
    setBusy(false);
    if (insErr) { toast.error(insErr.message); await supabase.storage.from("bar-sources").remove([path]); return; }
    toast.success("Source uploaded");
    reset(); onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload PDF Source</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div>
            <Label>License *</Label>
            <Select value={license} onValueChange={(v) => setLicense(v as typeof LICENSES[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LICENSES.map((l) => <SelectItem key={l} value={l}>{l.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PDF (max 50MB) *</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Uploading..." : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPromptDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [license, setLicense] = useState<typeof LICENSES[number]>("other");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setPrompt(""); setLicense("other"); };

  const submit = async () => {
    if (!title.trim() || !prompt.trim()) { toast.error("Title and prompt are required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from("bar_sources").insert({
      title: title.trim(), description: description.trim() || null,
      source_type: "topic_prompt", license, topic_prompt: prompt.trim(), uploaded_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Topic prompt added");
    reset(); onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Topic Prompt Source</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Topic Prompt *</Label><Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>
          <div>
            <Label>License</Label>
            <Select value={license} onValueChange={(v) => setLicense(v as typeof LICENSES[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LICENSES.map((l) => <SelectItem key={l} value={l}>{l.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
