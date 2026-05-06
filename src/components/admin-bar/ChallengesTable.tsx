import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, XCircle, Archive, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import ChallengeForm from "./ChallengeForm";
import {
  AREA_OF_LAW_LABELS,
  QUESTION_TYPE_LABELS,
  V1_QUESTION_TYPES,
} from "@/lib/bar/constants";
import type { AreaOfLaw, ChallengeStatus, Difficulty, QuestionType } from "@/lib/bar/types";
import { format } from "date-fns";

type Challenge = {
  id: string;
  title: string;
  question_type: QuestionType;
  area_of_law: AreaOfLaw;
  difficulty: Difficulty;
  status: ChallengeStatus;
  points_base: number;
  created_at: string;
  ai_generation_id: string | null;
  ai_generation: { created_at: string; source: { title: string; source_type: string } | null } | null;
};

type Source = { id: string; title: string; source_type: string };

const STATUSES: ChallengeStatus[] = ["draft", "pending_review", "approved", "rejected", "archived"];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

export default function ChallengesTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const generationFilter = searchParams.get("generation_id");

  const [items, setItems] = useState<Challenge[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Challenge | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [fStatus, setFStatus] = useState<string>("all");
  const [fType, setFType] = useState<string>("all");
  const [fArea, setFArea] = useState<string>("all");
  const [fDiff, setFDiff] = useState<string>("all");
  const [fOrigin, setFOrigin] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("bar_challenges")
      .select("*, ai_generation:bar_ai_generations(created_at, source:bar_sources(title, source_type))")
      .order("created_at", { ascending: false });
    if (fStatus !== "all") q = q.eq("status", fStatus as ChallengeStatus);
    if (fType !== "all") q = q.eq("question_type", fType as QuestionType);
    if (fArea !== "all") q = q.eq("area_of_law", fArea as AreaOfLaw);
    if (fDiff !== "all") q = q.eq("difficulty", fDiff as Difficulty);
    if (generationFilter) q = q.eq("ai_generation_id", generationFilter);
    if (fOrigin === "manual") q = q.is("ai_generation_id", null);
    if (fOrigin === "ai") q = q.not("ai_generation_id", "is", null);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data as unknown as Challenge[]) || []);
    setLoading(false);
  };

  const loadSources = async () => {
    const { data } = await supabase.from("bar_sources").select("id, title, source_type").order("created_at", { ascending: false });
    setSources((data as Source[]) || []);
  };

  useEffect(() => { load(); }, [fStatus, fType, fArea, fDiff, fOrigin, generationFilter]);
  useEffect(() => { loadSources(); }, []);

  const clearGenerationFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("generation_id");
    setSearchParams(next, { replace: true });
  };

  const updateStatus = async (id: string, status: ChallengeStatus, extra: Record<string, unknown> = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = { status, ...extra };
    if (status === "approved") { patch.approved_by = user?.id ?? null; patch.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("bar_challenges").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Status → ${status}`); load(); }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Reason required"); return; }
    await updateStatus(rejectTarget.id, "rejected", { rejection_reason: rejectReason.trim() });
    setRejectTarget(null); setRejectReason("");
  };

  const statusBadge = (s: ChallengeStatus) => {
    const variant: Record<ChallengeStatus, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "outline", pending_review: "secondary", approved: "default", rejected: "destructive", archived: "outline",
    };
    return <Badge variant={variant[s]}>{s.replace("_", " ")}</Badge>;
  };

  const originLabel = (c: Challenge): string => {
    if (!c.ai_generation_id) return "Manual";
    const t = c.ai_generation?.source?.source_type;
    if (t === "topic_prompt") return "AI Topic";
    if (t === "pdf_extraction") return "AI PDF";
    return "AI";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Challenges</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Manual</Button>
      </div>

      {generationFilter && (
        <div className="flex items-center gap-2 p-2 border-2 border-accent rounded-md bg-accent/5">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm">Filtered to a single AI generation run.</span>
          <Button size="sm" variant="ghost" onClick={clearGenerationFilter}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterSelect value={fStatus} onChange={setFStatus} placeholder="Status" options={STATUSES} />
        <FilterSelect value={fType} onChange={setFType} placeholder="Type" options={V1_QUESTION_TYPES} labels={QUESTION_TYPE_LABELS} />
        <FilterSelect value={fArea} onChange={setFArea} placeholder="Area" options={Object.keys(AREA_OF_LAW_LABELS) as AreaOfLaw[]} labels={AREA_OF_LAW_LABELS} />
        <FilterSelect value={fDiff} onChange={setFDiff} placeholder="Difficulty" options={DIFFS} />
        <Select value={fOrigin} onValueChange={setFOrigin}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Origin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Origins</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-2 border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Pts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
            {!loading && items.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No challenges.</TableCell></TableRow>}
            <TooltipProvider>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      {c.ai_generation_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              AI-generated from {c.ai_generation?.source?.title ?? "source"}
                              {c.ai_generation?.created_at ? ` · ${format(new Date(c.ai_generation.created_at), "PP")}` : ""}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span className="truncate">{c.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{originLabel(c)}</Badge></TableCell>
                  <TableCell className="text-xs">{QUESTION_TYPE_LABELS[c.question_type]}</TableCell>
                  <TableCell className="text-xs">{AREA_OF_LAW_LABELS[c.area_of_law]}</TableCell>
                  <TableCell className="text-xs">{c.difficulty}</TableCell>
                  <TableCell className="text-xs">{c.points_base}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "PP")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {(c.status === "draft" || c.status === "rejected") && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "pending_review")}>Submit</Button>
                    )}
                    {(c.status === "draft" || c.status === "pending_review") && (
                      <Button size="sm" variant="default" onClick={() => updateStatus(c.id, "approved")}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {c.status === "pending_review" && (
                      <Button size="sm" variant="neutral" className="text-destructive" onClick={() => setRejectTarget(c)}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    {c.status === "approved" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "archived")}>
                        <Archive className="w-3 h-3 mr-1" /> Archive
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TooltipProvider>
          </TableBody>
        </Table>
      </Card>

      <ChallengeForm open={createOpen} onOpenChange={setCreateOpen} onCreated={load} sources={sources} />

      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject "{rejectTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>Provide a rejection reason — visible only to admins.</AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label>Reason *</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitReject}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect<T extends string>({ value, onChange, placeholder, options, labels }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: T[]; labels?: Record<T, string>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] ?? o.replace("_", " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
