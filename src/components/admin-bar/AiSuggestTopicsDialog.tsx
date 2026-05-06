import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AREA_OF_LAW_LABELS } from "@/lib/bar/constants";
import type { AreaOfLaw, Difficulty } from "@/lib/bar/types";

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];
const LICENSES = ["public_domain", "licensed", "fair_use_claim", "user_submitted", "other"] as const;

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
};

export default function AiSuggestTopicsDialog({ open, onOpenChange, onCreated }: Props) {
  const [mode, setMode] = useState<"surprise" | "expand">("surprise");
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState("");
  const [area, setArea] = useState<AreaOfLaw | "any">("any");
  const [diff, setDiff] = useState<Difficulty | "any">("any");
  const [license, setLicense] = useState<typeof LICENSES[number]>("other");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode("surprise"); setCount(5); setSeed(""); setArea("any"); setDiff("any"); setLicense("other");
  };

  const checkRateLimit = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: c } = await supabase
      .from("bar_ai_generations")
      .select("*", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .gte("created_at", oneHourAgo);
    if ((c ?? 0) >= 20) {
      toast.info("You've made 20 AI requests in the last hour. Please wait before more.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (mode === "expand" && seed.trim().length < 3) {
      toast.error("Seed must be at least 3 characters");
      return;
    }
    if (!(await checkRateLimit())) return;

    setBusy(true);
    toast("AI is researching topics… this may take 10–45s", { icon: <Sparkles className="w-4 h-4" /> });

    const body: Record<string, unknown> = { mode, license };
    if (mode === "surprise") body.count = count;
    if (mode === "expand") body.seed = seed.trim();
    if (area !== "any") body.areas = [area];
    if (diff !== "any") body.difficulty_hint = diff;

    const { data, error } = await supabase.functions.invoke("suggest-topics", { body });
    setBusy(false);

    if (error) {
      let msg = (error as any)?.message ?? "Topic suggestion failed";
      try {
        const ctxBody = (error as any)?.context?.body;
        if (ctxBody) {
          const parsed = typeof ctxBody === "string" ? JSON.parse(ctxBody) : ctxBody;
          if (parsed?.error) msg = parsed.error;
        }
      } catch { /* ignore */ }
      toast.error(msg);
      return;
    }
    if (data?.error) { toast.error(data.error); return; }

    const n = data?.sources_created ?? 0;
    toast.success(`Created ${n} topic source${n === 1 ? "" : "s"}`, {
      action: { label: "Review", onClick: () => onCreated() },
    });
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> AI Suggest Topics
          </DialogTitle>
          <DialogDescription>
            Generate topic_prompt sources you can then turn into challenges via the Draft button.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "surprise" | "expand")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="surprise">Surprise me</TabsTrigger>
            <TabsTrigger value="expand">Expand a seed</TabsTrigger>
          </TabsList>

          <TabsContent value="surprise" className="space-y-4 pt-4">
            <div>
              <Label>How many topics? <span className="text-muted-foreground">({count})</span></Label>
              <Slider min={1} max={10} step={1} value={[count]} onValueChange={(v) => setCount(v[0])} className="mt-2" />
            </div>
          </TabsContent>

          <TabsContent value="expand" className="space-y-4 pt-4">
            <div>
              <Label>Seed idea *</Label>
              <Textarea
                rows={4}
                maxLength={500}
                placeholder='e.g. "Section 69A blocking orders and natural justice"'
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{seed.length}/500</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-2">
          <div>
            <Label>Area of law</Label>
            <Select value={area} onValueChange={(v) => setArea(v as AreaOfLaw | "any")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {Object.entries(AREA_OF_LAW_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={diff} onValueChange={(v) => setDiff(v as Difficulty | "any")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            <Sparkles className="w-4 h-4 mr-2" /> {busy ? "Working…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
