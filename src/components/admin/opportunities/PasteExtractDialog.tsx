import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OppStream = "cfp" | "moot" | "competition";

type FieldType = "textarea" | "url" | "datetime" | "date" | "number";
interface FieldDef { key: string; label: string; type?: FieldType }

// Order matters — deadline + URLs surfaced near the top.
const FIELDS: Record<OppStream, FieldDef[]> = {
  cfp: [
    { key: "publication_name", label: "Publication / event name" },
    { key: "publication_type", label: "Type (journal / blog / magazine / other)" },
    { key: "submission_deadline", label: "Submission deadline", type: "datetime" },
    { key: "submission_url", label: "Submission URL", type: "url" },
    { key: "brochure_url", label: "Brochure URL", type: "url" },
    { key: "theme", label: "Theme" },
    { key: "word_limit_min", label: "Min words", type: "number" },
    { key: "word_limit_max", label: "Max words", type: "number" },
    { key: "co_authorship_allowed", label: "Co-authorship? (true/false)" },
    { key: "submission_fee", label: "Submission fee" },
    { key: "peer_reviewed", label: "Peer reviewed? (true/false)" },
    { key: "contact_email", label: "Contact email" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "source_credit", label: "Source credit" },
  ],
  moot: [
    { key: "competition_name", label: "Competition name" },
    { key: "organiser", label: "Organiser" },
    { key: "registration_deadline", label: "Registration deadline", type: "datetime" },
    { key: "registration_url", label: "Registration URL", type: "url" },
    { key: "brochure_url", label: "Brochure URL", type: "url" },
    { key: "edition", label: "Edition" },
    { key: "area_of_law", label: "Area of law" },
    { key: "mode", label: "Mode (online / offline / hybrid)" },
    { key: "venue", label: "Venue" },
    { key: "event_start_date", label: "Event start", type: "date" },
    { key: "event_end_date", label: "Event end", type: "date" },
    { key: "prize_pool", label: "Prize pool" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "source_credit", label: "Source credit" },
  ],
  competition: [
    { key: "title", label: "Title" },
    { key: "organiser", label: "Organiser" },
    { key: "deadline", label: "Deadline", type: "datetime" },
    { key: "application_url", label: "Application URL", type: "url" },
    { key: "brochure_url", label: "Brochure URL", type: "url" },
    { key: "category", label: "Category (essay / research_paper / quiz / debate / negotiation / mediation / client_counselling / hackathon / drafting / other)" },
    { key: "event_date", label: "Event date", type: "date" },
    { key: "mode", label: "Mode (online / offline / hybrid)" },
    { key: "prize_or_stipend", label: "Prize / stipend" },
    { key: "fee", label: "Fee" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "source_credit", label: "Source credit" },
  ],
};

const TABLE: Record<OppStream, "cfps" | "moots" | "competitions"> = {
  cfp: "cfps",
  moot: "moots",
  competition: "competitions",
};

// Convert ISO "2026-05-03T23:59:59Z" -> "2026-05-03T23:59" for <input type=datetime-local>
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // Accept either a date "YYYY-MM-DD" or full ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stream: OppStream;
  userId: string;
  onSaved: () => void;
}

export default function PasteExtractDialog({ open, onOpenChange, stream, userId, onSaved }: Props) {
  const [step, setStep] = useState<"paste" | "form">("paste");
  const [pasted, setPasted] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [expiresInDays, setExpiresInDays] = useState(14);

  useEffect(() => {
    if (open) {
      setStep("paste");
      setPasted("");
      setForm({});
      setExpiresInDays(14);
    }
  }, [open, stream]);

  const extract = async () => {
    if (!pasted.trim()) {
      toast.error("Paste the text first.");
      return;
    }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-opportunity", {
        body: { text: pasted, stream },
      });
      if (error) {
        toast.error(error.message ?? "Extraction failed.");
        return;
      }
      setForm((data ?? {}) as Record<string, any>);
      setStep("form");
      toast.success("Extracted. Review and save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const expires_at = new Date(Date.now() + expiresInDays * 86400000).toISOString();
      const cleaned: Record<string, any> = { ...form };
      const fieldsByKey = Object.fromEntries(FIELDS[stream].map((f) => [f.key, f]));

      for (const k of Object.keys(cleaned)) {
        const def = fieldsByKey[k];
        const v = cleaned[k];
        if (v === "" || v == null) { cleaned[k] = null; continue; }
        if (v === "true") { cleaned[k] = true; continue; }
        if (v === "false") { cleaned[k] = false; continue; }
        if (def?.type === "datetime") {
          // Already an ISO if AI gave it; if from input, convert.
          cleaned[k] = typeof v === "string" && /T\d{2}:\d{2}$/.test(v) ? localInputToIso(v) : new Date(v).toISOString();
        }
      }

      // Hard validation: deadline must exist and be in the future.
      const deadlineKey = stream === "cfp" ? "submission_deadline"
        : stream === "moot" ? "registration_deadline" : "deadline";
      const deadlineVal = cleaned[deadlineKey];
      if (!deadlineVal) {
        toast.error("Deadline is missing — fill it in before publishing.");
        setSaving(false);
        return;
      }
      const deadlineDate = new Date(deadlineVal);
      if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
        toast.error("Deadline is in the past — this opportunity won't be shown. Fix the date or skip this post.");
        setSaving(false);
        return;
      }

      cleaned.created_by = userId;
      cleaned.status = "live";
      cleaned.expires_at = expires_at;

      const { error } = await (supabase.from(TABLE[stream]) as any).insert(cleaned);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Posted.");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const fields = FIELDS[stream];
  const titles: Record<OppStream, string> = { cfp: "Add CFP", moot: "Add Moot", competition: "Add Competition" };

  const renderInput = (f: FieldDef) => {
    const raw = form[f.key];
    if (f.type === "textarea") {
      return (
        <Textarea
          value={raw ?? ""}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          className="border-2 border-foreground"
          rows={3}
        />
      );
    }
    if (f.type === "datetime") {
      return (
        <Input
          type="datetime-local"
          value={isoToLocalInput(raw)}
          onChange={(e) => setForm({ ...form, [f.key]: localInputToIso(e.target.value) })}
          className="border-2 border-foreground"
        />
      );
    }
    if (f.type === "date") {
      return (
        <Input
          type="date"
          value={isoToDateInput(raw)}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value || null })}
          className="border-2 border-foreground"
        />
      );
    }
    return (
      <Input
        type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
        value={raw ?? ""}
        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        className="border-2 border-foreground"
        placeholder={f.type === "url" ? "https://…" : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]">
        <DialogHeader>
          <DialogTitle className="font-heading">{titles[stream]}</DialogTitle>
          <DialogDescription>
            {step === "paste"
              ? "Paste the raw post — Locus AI will extract structured fields."
              : "Review and adjust before publishing."}
          </DialogDescription>
        </DialogHeader>

        {step === "paste" ? (
          <div className="space-y-3">
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste the call/notice text here…"
              className="border-2 border-foreground"
            />
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("form")}>Skip — fill manually</Button>
              <Button
                onClick={extract}
                disabled={extracting || !pasted.trim()}
                className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              >
                {extracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Extract
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                  <Label className="text-xs">{f.label}</Label>
                  {renderInput(f)}
                </div>
              ))}
              <div>
                <Label className="text-xs">Live for (days, max 60)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value) || 14)}
                  className="border-2 border-foreground"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("paste")}>Back</Button>
              <Button
                onClick={submit}
                disabled={saving}
                className="font-bold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Publish
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
