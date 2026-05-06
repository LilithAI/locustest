import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, Phone, Award, Loader2 } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Firm {
  id?: string;
  name: string;
  city?: string;
  email?: string;
  phone?: string;
  tier?: string;
}

interface Props {
  firm: Firm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Field = "email" | "tier" | "phone";

const fieldMeta: Record<Field, { label: string; icon: typeof Mail; placeholder: string; validate: (v: string) => string | null }> = {
  email: {
    label: "Email is wrong",
    icon: Mail,
    placeholder: "correct@firmdomain.com",
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address",
  },
  phone: {
    label: "Phone is wrong",
    icon: Phone,
    placeholder: "+91 98765 43210",
    validate: (v) => v.replace(/\D/g, "").length >= 7 ? null : "Enter a valid phone number",
  },
  tier: {
    label: "Tier is wrong",
    icon: Award,
    placeholder: "e.g. Tier 1, Tier 2, Individual Chamber",
    validate: (v) => v.trim().length >= 3 ? null : "Tier must be at least 3 characters",
  },
};

export default function SuggestFixDialog({ firm, open, onOpenChange }: Props) {
  const { userId, ready } = useAuthSession();
  const navigate = useNavigate();
  const [field, setField] = useState<Field>("email");
  const [suggested, setSuggested] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!firm) return null;

  const currentValue = field === "email" ? firm.email ?? "" : field === "phone" ? firm.phone ?? "" : firm.tier ?? "";

  const handleSubmit = async () => {
    if (!ready) return;
    if (!userId) {
      toast({ title: "Sign in to suggest a fix", description: "We attribute every suggestion so admins can follow up." });
      onOpenChange(false);
      navigate("/auth?next=/directory");
      return;
    }
    const trimmed = suggested.trim();
    const err = fieldMeta[field].validate(trimmed);
    if (err) {
      toast({ title: "Check the suggestion", description: err, variant: "destructive" });
      return;
    }
    if (trimmed.toLowerCase() === currentValue.toLowerCase()) {
      toast({ title: "Same as current value", description: "Suggest a different value or change the field.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("firm_suggestions").insert({
      firm_id: firm.id ?? firm.name,
      firm_name_snapshot: firm.name,
      firm_city_snapshot: firm.city ?? null,
      user_id: userId,
      field,
      current_value: currentValue || null,
      suggested_value: trimmed,
      evidence: evidence.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      const msg = error.message?.includes("rate_limit_exceeded")
        ? "You've reached 5 suggestions in the last 24 hours. Try again tomorrow."
        : "Couldn't submit your suggestion. Try again.";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
      return;
    }

    toast({ title: "Thanks — we'll review it.", description: "Approved fixes go live in the next directory update." });
    setSuggested("");
    setEvidence("");
    setField("email");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Suggest a fix</DialogTitle>
          <DialogDescription>
            Help keep <span className="font-semibold text-foreground">{firm.name}</span> accurate. Admins review every suggestion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">What's wrong?</Label>
            <RadioGroup value={field} onValueChange={(v) => { setField(v as Field); setSuggested(""); }} className="grid grid-cols-3 gap-2">
              {(Object.keys(fieldMeta) as Field[]).map((f) => {
                const Icon = fieldMeta[f].icon;
                const active = field === f;
                return (
                  <Label
                    key={f}
                    htmlFor={`field-${f}`}
                    className={`flex flex-col items-center justify-center gap-1 cursor-pointer border-2 rounded-lg py-2.5 px-2 text-xs font-bold transition-all ${
                      active
                        ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <RadioGroupItem id={`field-${f}`} value={f} className="sr-only" />
                    <Icon size={14} />
                    <span>{f === "tier" ? "Tier" : f === "email" ? "Email" : "Phone"}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Currently shown</Label>
            <div className="text-sm bg-muted/50 border border-border rounded-md px-3 py-2 font-mono text-muted-foreground break-all">
              {currentValue || <span className="italic">— empty —</span>}
            </div>
          </div>

          <div>
            <Label htmlFor="suggested" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Your suggestion</Label>
            <Input
              id="suggested"
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              placeholder={fieldMeta[field].placeholder}
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="evidence" className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Evidence <span className="normal-case text-muted-foreground/70">(optional)</span>
            </Label>
            <Textarea
              id="evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Got a bounce reply from this address last week."
              maxLength={280}
              rows={2}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{evidence.length}/280</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !suggested.trim()}
            className="w-full border-2 border-foreground bg-accent text-accent-foreground font-bold shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
          >
            {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            Submit suggestion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
