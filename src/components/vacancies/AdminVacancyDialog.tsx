import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, AlertTriangle, GraduationCap, Briefcase, ClipboardList, Mail, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Vacancy,
  type VacancyOpportunityType,
  type VacancyApplicationMode,
  type VacancyTier,
  TIER_LABELS,
  TIER_OPTIONS,
  PRACTICE_AREA_SUGGESTIONS,
} from "@/lib/vacancies";
import { findDuplicates, hasAnyDupe, daysAgo, type DupeResult } from "@/lib/vacancy-dedupe";
import DuplicateBanner from "@/components/vacancies/DuplicateBanner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Vacancy | null;
  onSaved: () => void;
  userId: string;
}

interface FormState {
  firm_name: string;
  role: string;
  opportunity_type: VacancyOpportunityType;
  application_mode: VacancyApplicationMode;
  application_email: string;
  application_url: string;
  tier: VacancyTier | "";
  practice_area: string;
  location: string;
  eligibility: string;
  stipend: string;
  description: string;
  task_brief: string;
  source_credit: string;
  expires_in_days: number;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const URL_RE = /^https?:\/\/.+/i;

const blank = (): FormState => ({
  firm_name: "", role: "", opportunity_type: "internship",
  application_mode: "email",
  application_email: "", application_url: "",
  tier: "", practice_area: "",
  location: "", eligibility: "", stipend: "",
  description: "", task_brief: "", source_credit: "",
  expires_in_days: 5,
});

export default function AdminVacancyDialog({ open, onOpenChange, initial, onSaved, userId }: Props) {
  const [step, setStep] = useState<"paste" | "form">("paste");
  const [pasted, setPasted] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(blank());
  const [recent, setRecent] = useState<Vacancy[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [missingPortalHint, setMissingPortalHint] = useState(false);
  const recentLoadedRef = useRef(false);

  const editMode = !!initial;

  const dupes: DupeResult = useMemo(
    () =>
      findDuplicates(
        {
          firm_name: form.firm_name,
          role: form.role,
          application_mode: form.application_mode,
          application_email: form.application_email || null,
          application_url: form.application_url || null,
        },
        recent,
        initial?.id,
      ),
    [form.firm_name, form.role, form.application_mode, form.application_email, form.application_url, recent, initial?.id],
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const remainingMs = new Date(initial.expires_at).getTime() - Date.now();
      const days = Math.max(1, Math.ceil(remainingMs / 86400000));
      setForm({
        firm_name: initial.firm_name,
        role: initial.role,
        opportunity_type: initial.opportunity_type ?? "internship",
        application_mode: initial.application_mode ?? "email",
        application_email: initial.application_email ?? "",
        application_url: initial.application_url ?? "",
        tier: initial.tier ?? "",
        practice_area: initial.practice_area ?? "",
        location: initial.location ?? "",
        eligibility: initial.eligibility ?? "",
        stipend: initial.stipend ?? "",
        description: initial.description ?? "",
        task_brief: initial.task_brief ?? "",
        source_credit: initial.source_credit ?? "",
        expires_in_days: days,
      });
      setStep("form");
      setPasted("");
      setMissingPortalHint(false);
    } else {
      setForm(blank());
      setStep("paste");
      setPasted("");
      setMissingPortalHint(false);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) {
      recentLoadedRef.current = false;
      return;
    }
    if (recentLoadedRef.current) return;
    recentLoadedRef.current = true;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    void (async () => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("*")
        .or(`status.eq.live,and(status.eq.archived,expires_at.gt.${cutoff})`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && data) setRecent(data as Vacancy[]);
    })();
  }, [open]);

  const extract = async () => {
    if (!pasted.trim()) {
      toast.error("Paste the vacancy text first.");
      return;
    }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-vacancy", { body: { text: pasted } });
      if (error) {
        toast.error(error.message ?? "Couldn't extract.");
        return;
      }
      const d = data as Partial<FormState> & {
        application_email?: string;
        application_url?: string | null;
        application_mode?: string;
        opportunity_type?: string;
        tier?: string | null;
        practice_area?: string | null;
      };
      const detectedType: VacancyOpportunityType = d.opportunity_type === "job" ? "job" : "internship";
      const detectedMode: VacancyApplicationMode = d.application_mode === "external_url" ? "external_url" : "email";
      const detectedTier = (TIER_OPTIONS as string[]).includes(d.tier ?? "") ? (d.tier as VacancyTier) : "";
      setForm((f) => ({
        ...f,
        firm_name: d.firm_name ?? "",
        role: d.role ?? "",
        opportunity_type: detectedType,
        application_mode: detectedMode,
        application_email: d.application_email ?? "",
        application_url: d.application_url ?? "",
        tier: detectedTier,
        practice_area: d.practice_area ?? "",
        location: d.location ?? "",
        eligibility: d.eligibility ?? "",
        stipend: d.stipend ?? "",
        description: d.description ?? "",
        task_brief: d.task_brief ?? "",
        source_credit: d.source_credit ?? "",
      }));
      setStep("form");

      // Show missing-portal callout when post said "via portal" but no URL was pasted
      const portalNoUrl = detectedMode === "external_url" && !(d.application_url ?? "").trim();
      setMissingPortalHint(portalNoUrl);

      const dupeCheck = findDuplicates(
        {
          firm_name: d.firm_name ?? "",
          role: d.role ?? "",
          application_mode: detectedMode,
          application_email: d.application_email ?? null,
          application_url: d.application_url ?? null,
        },
        recent,
        initial?.id,
      );

      const typeLabel = detectedType === "job" ? "Job" : "Internship";
      const modeLabel = detectedMode === "external_url" ? "Portal" : "Email";
      const taskNote = d.task_brief && d.task_brief.trim() ? " A written task was detected." : "";

      if (dupeCheck.hardMatches.length > 0) {
        const m = dupeCheck.hardMatches[0];
        toast.warning(
          `Looks like a duplicate of ${m.firm_name} — ${m.role} (posted ${daysAgo(m.posted_at)}d ago). Review before saving.`,
        );
      } else if (dupeCheck.softMatches.length > 0) {
        const m = dupeCheck.softMatches[0];
        toast.warning(
          `Similar vacancy already on the board: ${m.firm_name} — ${m.role}. Confirm this isn't a re-paste.`,
        );
      } else if (portalNoUrl) {
        toast.warning(`Detected as ${typeLabel} · Portal application. No URL was pasted — add the link before saving.`);
      } else if (detectedMode === "email" && (!d.application_email || !EMAIL_RE.test(d.application_email))) {
        toast.warning(`Detected as ${typeLabel}.${taskNote} No valid email found — add one or switch to portal mode.`);
      } else {
        toast.success(`Detected as ${typeLabel} · ${modeLabel}.${taskNote} Review and save.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  const submit = async (force = false) => {
    if (!form.firm_name.trim() || !form.role.trim()) {
      toast.error("Firm name and role are required.");
      return;
    }

    if (form.application_mode === "email") {
      const email = form.application_email.trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email)) {
        toast.error("Add a valid application email or switch to Company portal mode.");
        return;
      }
    } else {
      const url = form.application_url.trim();
      if (!url || !URL_RE.test(url)) {
        toast.error("Portal mode needs a valid https:// application URL.");
        return;
      }
      if (url.length > 2000) {
        toast.error("URL too long.");
        return;
      }
    }

    if (!force && !editMode && dupes.hardMatches.length > 0) {
      setConfirmOpen(true);
      return;
    }

    const days = Math.max(1, Math.min(14, form.expires_in_days || 5));
    setSaving(true);
    try {
      const payloadCommon = {
        firm_name: form.firm_name.trim(),
        role: form.role.trim(),
        opportunity_type: form.opportunity_type,
        application_mode: form.application_mode,
        application_email:
          form.application_mode === "email" ? form.application_email.trim().toLowerCase() : null,
        application_url:
          form.application_mode === "external_url" ? form.application_url.trim() : null,
        tier: form.tier || null,
        practice_area: form.practice_area.trim() || null,
        location: form.location.trim() || null,
        eligibility: form.eligibility.trim() || null,
        stipend: form.stipend.trim() || null,
        description: form.description.trim() || null,
        task_brief: form.task_brief.trim() || null,
        source_credit: form.source_credit.trim() || null,
      };

      if (editMode && initial) {
        const expires_at = new Date(Date.now() + days * 86400000).toISOString();
        const { error } = await supabase
          .from("vacancies")
          .update({ ...payloadCommon, expires_at })
          .eq("id", initial.id);
        if (error) throw error;
        toast.success("Vacancy updated.");
      } else {
        const now = new Date();
        const expires_at = new Date(now.getTime() + days * 86400000).toISOString();
        const { error } = await supabase.from("vacancies").insert({
          ...payloadCommon,
          posted_at: now.toISOString(),
          expires_at,
          created_by: userId,
        });
        if (error) throw error;
        toast.success("Vacancy posted.");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      if (msg.includes("application_email_required")) toast.error("Application email is required.");
      else if (msg.includes("application_email_invalid")) toast.error("That email isn't valid.");
      else if (msg.includes("application_url_required")) toast.error("Portal URL is required.");
      else if (msg.includes("application_url_invalid")) toast.error("URL must start with http:// or https://");
      else if (msg.includes("expiry_must_be_after_posted")) toast.error("Expiry must be in the future.");
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const emailValid =
    form.application_mode !== "email" ||
    !form.application_email ||
    EMAIL_RE.test(form.application_email.trim().toLowerCase());
  const urlValid =
    form.application_mode !== "external_url" ||
    !form.application_url ||
    URL_RE.test(form.application_url.trim());

  const saveDisabled =
    saving ||
    !emailValid ||
    !urlValid ||
    (form.application_mode === "external_url" && !form.application_url.trim()) ||
    (form.application_mode === "email" && !form.application_email.trim());

  const googleSearchUrl = useMemo(() => {
    const q = `${form.firm_name} ${form.role} careers apply`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }, [form.firm_name, form.role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl font-extrabold">
            <Sparkles size={18} className="text-accent" />
            {editMode ? "Edit vacancy" : step === "paste" ? "Add vacancy — paste source" : "Review & post vacancy"}
          </DialogTitle>
          <DialogDescription>
            {editMode
              ? "Update fields. Expiry is calculated forward from now."
              : step === "paste"
                ? "Paste the raw posting (WhatsApp forward, screenshot OCR, LinkedIn copy). AI will fill the form and detect whether applicants apply by email or via a company portal."
                : "Verify every field. Email mode needs a valid application email. Portal mode needs a working https:// URL."}
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && !editMode ? (
          <>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste the vacancy text here…"
              className="min-h-[220px] font-mono text-xs"
              maxLength={8000}
            />
            <p className="text-xs text-muted-foreground mt-1">{pasted.length} / 8000 characters</p>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setStep("form")}>
                Skip — fill manually
              </Button>
              <Button onClick={extract} disabled={extracting || !pasted.trim()}>
                {extracting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
                Extract with AI
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {hasAnyDupe(dupes) && <DuplicateBanner result={dupes} />}
            <div className="space-y-3">
              {/* Apply via — segmented control */}
              <div>
                <Label>Apply via *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(["email", "external_url"] as const).map((m) => {
                    const Icon = m === "email" ? Mail : ExternalLink;
                    const active = form.application_mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          update("application_mode", m);
                          if (m === "email") setMissingPortalHint(false);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 rounded-md border-2 font-bold text-sm uppercase tracking-wide transition-all",
                          active
                            ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/60",
                        )}
                      >
                        <Icon size={14} />
                        {m === "email" ? "Email" : "Company portal"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Type *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(["internship", "job"] as const).map((t) => {
                    const Icon = t === "internship" ? GraduationCap : Briefcase;
                    const active = form.opportunity_type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update("opportunity_type", t)}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2 rounded-md border-2 font-bold text-sm uppercase tracking-wide transition-all",
                          active
                            ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/60",
                        )}
                      >
                        <Icon size={14} />
                        {t === "internship" ? "Internship" : "Job"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Firm name *</Label>
                  <Input value={form.firm_name} onChange={(e) => update("firm_name", e.target.value)} />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Input value={form.role} onChange={(e) => update("role", e.target.value)} />
                </div>
              </div>

              {/* Email mode field */}
              {form.application_mode === "email" && (
                <div>
                  <Label>Application email *</Label>
                  <Input
                    type="email"
                    value={form.application_email}
                    onChange={(e) => update("application_email", e.target.value)}
                    className={!emailValid ? "border-destructive" : ""}
                  />
                  {!emailValid && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle size={11} /> That email isn't valid.
                    </p>
                  )}
                </div>
              )}

              {/* Portal mode field */}
              {form.application_mode === "external_url" && (
                <div className="space-y-2">
                  {missingPortalHint && (
                    <div className="rounded-md border-2 border-foreground bg-accent text-accent-foreground p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                      <p className="font-extrabold uppercase tracking-wide text-xs flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Portal link missing
                      </p>
                      <p className="text-xs mt-1 leading-relaxed">
                        This post says applications go through the company's careers page, but no URL
                        was pasted. Add the direct link to the job opening so applicants can reach it
                        in one click.
                      </p>
                      <a
                        href={googleSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                      >
                        <Search size={11} />
                        Search Google for "{form.firm_name || "firm"} {form.role || "role"} careers"
                      </a>
                    </div>
                  )}
                  <div>
                    <Label>Application URL *</Label>
                    <Input
                      type="url"
                      placeholder="https://careers.example.com/job/12345"
                      value={form.application_url}
                      onChange={(e) => {
                        update("application_url", e.target.value);
                        if (e.target.value.trim()) setMissingPortalHint(false);
                      }}
                      className={form.application_url && !urlValid ? "border-destructive" : ""}
                    />
                    {form.application_url && !urlValid && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> URL must start with http:// or https://
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Paste the deepest link you can find — direct to the job opening, not the firm's
                      home page.
                    </p>
                  </div>
                </div>
              )}

              {/* Tier + practice area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tier</Label>
                  <Select
                    value={form.tier || "_none"}
                    onValueChange={(v) => update("tier", v === "_none" ? "" : (v as VacancyTier))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Not sure / unset</SelectItem>
                      {TIER_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Practice area</Label>
                  <Input
                    value={form.practice_area}
                    onChange={(e) => update("practice_area", e.target.value)}
                    placeholder="Corporate / IP / Disputes…"
                    list="practice-area-suggestions"
                    maxLength={80}
                  />
                  <datalist id="practice-area-suggestions">
                    {PRACTICE_AREA_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Mumbai" />
                </div>
                <div>
                  <Label>Stipend</Label>
                  <Input value={form.stipend} onChange={(e) => update("stipend", e.target.value)} placeholder="₹15k/mo" />
                </div>
                <div>
                  <Label>Expires in (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={14}
                    value={form.expires_in_days}
                    onChange={(e) => update("expires_in_days", parseInt(e.target.value || "5", 10))}
                  />
                </div>
              </div>

              <div>
                <Label>Eligibility</Label>
                <Input
                  value={form.eligibility}
                  onChange={(e) => update("eligibility", e.target.value)}
                  placeholder="3rd-5th year, NLU only"
                />
              </div>

              <div>
                <Label>Description / instructions</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="min-h-[120px]"
                  placeholder="What the post says — application instructions, CV requirements, subject line, etc."
                  maxLength={800}
                />
                <p className="text-xs text-muted-foreground mt-1">{form.description.length} / 800</p>
              </div>

              <div className="rounded-md border-2 border-dashed border-foreground/30 bg-accent/5 p-3">
                <Label className="flex items-center gap-2 font-extrabold uppercase tracking-wide text-xs">
                  <ClipboardList size={14} className="text-accent" />
                  Required task / assignment (optional)
                </Label>
                <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                  Paste the written task the firm wants applicants to submit. Shown inline on the card.
                </p>
                <Textarea
                  value={form.task_brief}
                  onChange={(e) => update("task_brief", e.target.value)}
                  className="min-h-[100px]"
                  placeholder='e.g. "Submit a 500-word note on Section 9 arbitration interim relief, citing 3 recent SC judgments."'
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">{form.task_brief.length} / 2000</p>
              </div>

              <div>
                <Label>Source credit (optional)</Label>
                <Input
                  value={form.source_credit}
                  onChange={(e) => update("source_credit", e.target.value)}
                  placeholder="via @somehandle"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              {!editMode && (
                <Button variant="ghost" onClick={() => setStep("paste")}>
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={() => submit()}
                disabled={saveDisabled}
                title={
                  form.application_mode === "external_url" && !form.application_url.trim()
                    ? "Add the portal URL"
                    : undefined
                }
              >
                {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                {editMode ? "Save changes" : "Post vacancy"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent" />
              This looks like a duplicate
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {dupes.hardMatches[0] && (
                  <p>
                    A vacancy from <strong>{dupes.hardMatches[0].firm_name}</strong> for the same
                    role was posted{" "}
                    <strong>
                      {daysAgo(dupes.hardMatches[0].posted_at) === 0
                        ? "today"
                        : `${daysAgo(dupes.hardMatches[0].posted_at)} day(s) ago`}
                    </strong>
                    .
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Posting again will create a duplicate on the board. Only continue if this is a
                  fresh re-opening.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void submit(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Post anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
