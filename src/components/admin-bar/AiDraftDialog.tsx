import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_TYPE_LABELS, V1_QUESTION_TYPES } from "@/lib/bar/constants";
import type { Difficulty, QuestionType } from "@/lib/bar/types";

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sourceId: string;
  sourceTitle: string;
};

export default function AiDraftDialog({ open, onOpenChange, sourceId, sourceTitle }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState<QuestionType>("mcq");
  const [diff, setDiff] = useState<Difficulty>("easy");
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
    toast("AI is working… this may take 10–45s", { icon: <Sparkles className="w-4 h-4" /> });

    const { data, error } = await supabase.functions.invoke("draft-question-from-prompt", {
      body: { source_id: sourceId, question_type: type, difficulty: diff },
    });
    setBusy(false);

    if (error) { toast.error((error as any)?.message ?? "Draft failed"); return; }
    if (data?.error) { toast.error(data.error); return; }

    const genId = data?.generation_id;
    toast.success("Draft created", {
      action: genId
        ? { label: "Review draft", onClick: () => navigate(`/admin/bar?tab=challenges&generation_id=${genId}`) }
        : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Draft Question
          </DialogTitle>
          <DialogDescription>From topic: <span className="font-medium">{sourceTitle}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Question type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {V1_QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty *</Label>
            <Select value={diff} onValueChange={(v) => setDiff(v as Difficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            <Sparkles className="w-4 h-4 mr-2" /> {busy ? "Working…" : "Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
