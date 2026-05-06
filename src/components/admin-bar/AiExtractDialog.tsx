import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AREA_OF_LAW_LABELS, QUESTION_TYPE_LABELS, V1_QUESTION_TYPES } from "@/lib/bar/constants";
import type { AreaOfLaw, Difficulty, QuestionType } from "@/lib/bar/types";

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sourceId: string;
  sourceTitle: string;
  mode: "single" | "batch";
};

export default function AiExtractDialog({ open, onOpenChange, sourceId, sourceTitle, mode }: Props) {
  const navigate = useNavigate();
  const [batchSize, setBatchSize] = useState<number>(10);
  const [typeHint, setTypeHint] = useState<string>("__any");
  const [areaHint, setAreaHint] = useState<string>("__any");
  const [diffHint, setDiffHint] = useState<string>("__any");
  const [busy, setBusy] = useState(false);

  const checkRateLimit = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("bar_ai_generations")
      .select("*", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 20) {
      toast.info("You've made 20 AI requests in the last hour. Please wait before more.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!(await checkRateLimit())) return;
    setBusy(true);
    const body: Record<string, unknown> = { source_id: sourceId, mode };
    if (mode === "batch") body.batch_size = Math.max(1, Math.min(20, batchSize));
    if (typeHint !== "__any") body.question_type_hint = typeHint as QuestionType;
    if (areaHint !== "__any") body.area_of_law_hint = areaHint as AreaOfLaw;
    if (diffHint !== "__any") body.difficulty_hint = diffHint as Difficulty;

    toast("AI is working… this may take 10–45s", { icon: <Sparkles className="w-4 h-4" /> });

    const { data, error } = await supabase.functions.invoke("extract-questions-from-pdf", { body });
    setBusy(false);

    if (error) {
      const msg = (error as any)?.message ?? "Extraction failed";
      toast.error(msg);
      return;
    }
    if (data?.error) { toast.error(data.error); return; }

    const created = data?.challenges_created ?? 0;
    const genId = data?.generation_id;
    toast.success(`Created ${created} challenge draft${created === 1 ? "" : "s"}`, {
      action: genId
        ? { label: "Review drafts", onClick: () => navigate(`/admin/bar?tab=challenges&generation_id=${genId}`) }
        : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {mode === "single" ? "Extract 1 Question" : "Extract Batch"}
          </DialogTitle>
          <DialogDescription>From source: <span className="font-medium">{sourceTitle}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode === "batch" && (
            <div>
              <Label>Batch size (1–20)</Label>
              <Input type="number" min={1} max={20} value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value || "10", 10))} />
            </div>
          )}
          <div>
            <Label>Question type (optional)</Label>
            <Select value={typeHint} onValueChange={setTypeHint}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {V1_QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Area of law (optional)</Label>
            <Select value={areaHint} onValueChange={setAreaHint}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {Object.entries(AREA_OF_LAW_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty (optional)</Label>
            <Select value={diffHint} onValueChange={setDiffHint}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            <Sparkles className="w-4 h-4 mr-2" />
            {busy ? "Working…" : mode === "single" ? "Extract" : "Extract Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
