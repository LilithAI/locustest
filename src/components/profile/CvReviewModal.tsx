import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Internship } from "./InternshipsSection";
import type { Moot } from "./MootsSection";
import type { Publication } from "./PublicationsSection";

type Degree = "BA LLB" | "BBA LLB" | "BCom LLB" | "LLB (3yr)" | "LLM" | "Other";
type MootRole = "speaker" | "researcher" | "both";
type MootResult = "winner" | "runner_up" | "semi_finalist" | "quarter_finalist" | "participant";

const DEGREES: Degree[] = ["BA LLB", "BBA LLB", "BCom LLB", "LLB (3yr)", "LLM", "Other"];
const MOOT_ROLES: MootRole[] = ["speaker", "researcher", "both"];
const MOOT_RESULTS: MootResult[] = ["winner", "runner_up", "semi_finalist", "quarter_finalist", "participant"];
const RESULT_LABEL: Record<MootResult, string> = {
  winner: "Winner", runner_up: "Runner-up", semi_finalist: "Semi-finalist", quarter_finalist: "Quarter-finalist", participant: "Participant",
};

export interface ParsedInternship {
  firm_name: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}
export interface ParsedMoot {
  competition_name: string;
  year: number;
  role: MootRole;
  result: MootResult;
}
export interface ParsedPublication {
  title: string;
  publisher: string;
  url: string | null;
  publication_date: string | null;
}
export interface ParsedCv {
  bio: string | null;
  college: string | null;
  degree: Degree | null;
  graduation_year: number | null;
  subjects_of_interest: string[];
  internships: ParsedInternship[];
  moots: ParsedMoot[];
  publications: ParsedPublication[];
}

export interface CurrentProfile {
  bio: string;
  college: string;
  degree: Degree | "";
  graduationYear: string;
  subjects: string[];
  internships: Internship[];
  moots: Moot[];
  publications: Publication[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  parsed: ParsedCv;
  current: CurrentProfile;
  onSaved: () => void;
}

const BIO_MAX = 280;
const DESC_MAX = 500;
const YEAR_MIN = 1950;
const YEAR_MAX = 2100;

export default function CvReviewModal({ open, onOpenChange, userId, parsed, current, onSaved }: Props) {
  const isMobile = useIsMobile();

  // ---------- BASICS ----------
  const [bioApply, setBioApply] = useState(false);
  const [bioVal, setBioVal] = useState("");

  // ---------- ACADEMICS ----------
  const [collegeApply, setCollegeApply] = useState(false);
  const [collegeVal, setCollegeVal] = useState("");
  const [degreeApply, setDegreeApply] = useState(false);
  const [degreeVal, setDegreeVal] = useState<Degree | "">("");
  const [yearApply, setYearApply] = useState(false);
  const [yearVal, setYearVal] = useState("");
  const [subjectsApply, setSubjectsApply] = useState(false);
  const [subjectsVal, setSubjectsVal] = useState<string[]>([]);

  // ---------- LISTS ----------
  type IRow = ParsedInternship & { _id: string; _checked: boolean };
  type MRow = ParsedMoot & { _id: string; _checked: boolean };
  type PRow = ParsedPublication & { _id: string; _checked: boolean };

  const [internshipRows, setInternshipRows] = useState<IRow[]>([]);
  const [mootRows, setMootRows] = useState<MRow[]>([]);
  const [pubRows, setPubRows] = useState<PRow[]>([]);
  const [internshipSkipped, setInternshipSkipped] = useState(0);
  const [mootSkipped, setMootSkipped] = useState(0);
  const [pubSkipped, setPubSkipped] = useState(0);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Initialize state from parsed when modal opens (only once per open)
  useEffect(() => {
    if (!open) return;

    // Basics
    const hasBio = !!parsed.bio?.trim();
    setBioVal((parsed.bio || "").slice(0, BIO_MAX));
    setBioApply(hasBio);

    // Academics
    const collegeDiffers = !!parsed.college?.trim() && parsed.college.trim() !== current.college.trim();
    setCollegeVal(parsed.college || "");
    setCollegeApply(collegeDiffers);

    const degreeDiffers = !!parsed.degree && parsed.degree !== current.degree;
    setDegreeVal(parsed.degree || "");
    setDegreeApply(degreeDiffers);

    const yearStr = parsed.graduation_year ? String(parsed.graduation_year) : "";
    const yearDiffers = !!yearStr && yearStr !== current.graduationYear;
    setYearVal(yearStr);
    setYearApply(yearDiffers);

    const parsedSubs = (parsed.subjects_of_interest || []).map((s) => s.toLowerCase());
    const currentSubsLower = current.subjects.map((s) => s.toLowerCase());
    const subsDiffer = parsedSubs.length > 0 && JSON.stringify([...parsedSubs].sort()) !== JSON.stringify([...currentSubsLower].sort());
    setSubjectsVal(parsedSubs);
    setSubjectsApply(subsDiffer);

    // Internships dedupe
    const existingIKeys = new Set(
      current.internships.map((i) => `${i.firm_name.toLowerCase().trim()}|${i.role.toLowerCase().trim()}`)
    );
    let iSkipped = 0;
    const iRows: IRow[] = [];
    (parsed.internships || []).forEach((it, idx) => {
      const key = `${it.firm_name.toLowerCase().trim()}|${it.role.toLowerCase().trim()}`;
      if (existingIKeys.has(key)) { iSkipped++; return; }
      iRows.push({ ...it, _id: `i-${idx}-${Math.random().toString(36).slice(2, 8)}`, _checked: true });
    });
    setInternshipRows(iRows);
    setInternshipSkipped(iSkipped);

    // Moots dedupe
    const existingMKeys = new Set(
      current.moots.map((m) => `${m.competition_name.toLowerCase().trim()}|${m.year}`)
    );
    let mSkipped = 0;
    const mRows: MRow[] = [];
    (parsed.moots || []).forEach((m, idx) => {
      const key = `${m.competition_name.toLowerCase().trim()}|${m.year}`;
      if (existingMKeys.has(key)) { mSkipped++; return; }
      mRows.push({ ...m, _id: `m-${idx}-${Math.random().toString(36).slice(2, 8)}`, _checked: true });
    });
    setMootRows(mRows);
    setMootSkipped(mSkipped);

    // Publications dedupe
    const existingPKeys = new Set(current.publications.map((p) => p.title.toLowerCase().trim()));
    let pSkipped = 0;
    const pRows: PRow[] = [];
    (parsed.publications || []).forEach((p, idx) => {
      const key = p.title.toLowerCase().trim();
      if (existingPKeys.has(key)) { pSkipped++; return; }
      pRows.push({ ...p, _id: `p-${idx}-${Math.random().toString(36).slice(2, 8)}`, _checked: true });
    });
    setPubRows(pRows);
    setPubSkipped(pSkipped);

    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Build the active step list (skip steps with no parseable data)
  const stepDefs = useMemo(() => {
    const steps: Array<"basics" | "academics" | "internships" | "moots" | "publications"> = [];
    if (parsed.bio?.trim()) steps.push("basics");
    if (parsed.college || parsed.degree || parsed.graduation_year || (parsed.subjects_of_interest?.length ?? 0) > 0) steps.push("academics");
    if (internshipRows.length > 0) steps.push("internships");
    if (mootRows.length > 0) steps.push("moots");
    if (pubRows.length > 0) steps.push("publications");
    return steps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parsed, internshipRows.length, mootRows.length, pubRows.length]);

  const totalSteps = stepDefs.length;
  const currentStepKey = stepDefs[step];
  const isLastStep = step >= totalSteps - 1;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (parsed.bio?.trim()) parts.push("1 bio");
    const academicsCount = [parsed.college, parsed.degree, parsed.graduation_year].filter(Boolean).length + ((parsed.subjects_of_interest?.length ?? 0) > 0 ? 1 : 0);
    if (academicsCount > 0) parts.push(`${academicsCount} academic field${academicsCount === 1 ? "" : "s"}`);
    if (internshipRows.length) parts.push(`${internshipRows.length} internship${internshipRows.length === 1 ? "" : "s"}`);
    if (mootRows.length) parts.push(`${mootRows.length} moot${mootRows.length === 1 ? "" : "s"}`);
    if (pubRows.length) parts.push(`${pubRows.length} publication${pubRows.length === 1 ? "" : "s"}`);
    return parts.join(" · ");
  }, [parsed, internshipRows.length, mootRows.length, pubRows.length]);

  // -------- Handlers --------
  const updateInternship = (id: string, patch: Partial<IRow>) => {
    setInternshipRows((rows) => rows.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };
  const updateMoot = (id: string, patch: Partial<MRow>) => {
    setMootRows((rows) => rows.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };
  const updatePub = (id: string, patch: Partial<PRow>) => {
    setPubRows((rows) => rows.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };
  const handleSkipSection = () => {
    // Uncheck everything in current step then advance
    if (currentStepKey === "basics") setBioApply(false);
    if (currentStepKey === "academics") {
      setCollegeApply(false); setDegreeApply(false); setYearApply(false); setSubjectsApply(false);
    }
    if (currentStepKey === "internships") setInternshipRows((r) => r.map((x) => ({ ...x, _checked: false })));
    if (currentStepKey === "moots") setMootRows((r) => r.map((x) => ({ ...x, _checked: false })));
    if (currentStepKey === "publications") setPubRows((r) => r.map((x) => ({ ...x, _checked: false })));
    if (!isLastStep) setStep(step + 1);
  };

  const tryClose = () => {
    setConfirmDiscard(true);
  };
  const confirmDiscardYes = () => {
    setConfirmDiscard(false);
    onOpenChange(false);
  };

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  const missingInternshipDates = internshipRows.filter((r) => r._checked && !(r.start_date && dateRe.test(r.start_date))).length;
  const missingPubDates = pubRows.filter((r) => r._checked && !(r.publication_date && dateRe.test(r.publication_date))).length;
  const hasBlockingErrors = missingInternshipDates > 0 || missingPubDates > 0;

  const handleFinish = async () => {
    if (missingInternshipDates > 0) {
      toast.error("Please add a start date to each checked internship before saving.");
      return;
    }
    if (missingPubDates > 0) {
      toast.error("Please add a publication date to each checked publication before saving.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Profile update (only checked fields)
      const profilePatch: Record<string, unknown> = {};
      if (bioApply) {
        const trimmed = bioVal.trim().slice(0, BIO_MAX);
        if (trimmed) profilePatch.bio = trimmed;
      }
      if (collegeApply) {
        const c = collegeVal.trim();
        if (c) profilePatch.college = c;
      }
      if (degreeApply && degreeVal) profilePatch.degree = degreeVal;
      if (yearApply) {
        const y = parseInt(yearVal, 10);
        if (Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX) profilePatch.graduation_year = y;
      }
      if (subjectsApply) {
        const cleaned = Array.from(new Set(subjectsVal.map((s) => s.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
        profilePatch.subjects_of_interest = cleaned;
      }

      if (Object.keys(profilePatch).length > 0) {
        const { error } = await supabase.from("profiles").update(profilePatch).eq("id", userId);
        if (error) throw new Error(`Profile update failed: ${error.message}`);
      }

      // 2. Internships - insert checked rows (start_date already validated above)
      const internshipsToInsert = internshipRows
        .filter((r) => r._checked && r.firm_name.trim() && r.role.trim() && r.start_date && dateRe.test(r.start_date))
        .map((r) => ({
          user_id: userId,
          firm_name: r.firm_name.trim(),
          role: r.role.trim(),
          start_date: r.start_date as string,
          end_date: r.end_date && dateRe.test(r.end_date) ? r.end_date : null,
          description: r.description?.trim().slice(0, DESC_MAX) || null,
        }));
      if (internshipsToInsert.length) {
        const { error } = await supabase.from("profile_internships").insert(internshipsToInsert);
        if (error) throw new Error(`Internships failed: ${error.message}`);
      }

      // 3. Moots
      const mootsToInsert = mootRows
        .filter((r) => r._checked && r.competition_name.trim() && Number.isInteger(r.year) && r.year >= YEAR_MIN && r.year <= YEAR_MAX)
        .map((r) => ({
          user_id: userId,
          competition_name: r.competition_name.trim(),
          year: r.year,
          role: r.role,
          result: r.result,
        }));
      if (mootsToInsert.length) {
        const { error } = await supabase.from("profile_moots").insert(mootsToInsert);
        if (error) throw new Error(`Moots failed: ${error.message}`);
      }

      // 4. Publications (publication_date already validated above)
      const pubsToInsert = pubRows
        .filter((r) => r._checked && r.title.trim() && r.publisher.trim() && r.publication_date && dateRe.test(r.publication_date))
        .map((r) => ({
          user_id: userId,
          title: r.title.trim(),
          publisher: r.publisher.trim(),
          url: r.url?.trim() || null,
          publication_date: r.publication_date as string,
        }));
      if (pubsToInsert.length) {
        const { error } = await supabase.from("profile_publications").insert(pubsToInsert);
        if (error) throw new Error(`Publications failed: ${error.message}`);
      }

      toast.success("Profile updated from CV");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save changes");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Step renderers ----------
  const renderBasics = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cv-bio">Bio (max {BIO_MAX} characters)</Label>
        <Textarea
          id="cv-bio"
          value={bioVal}
          onChange={(e) => setBioVal(e.target.value.slice(0, BIO_MAX))}
          rows={4}
          maxLength={BIO_MAX}
        />
        <p className="text-xs text-muted-foreground">{bioVal.length}/{BIO_MAX}</p>
        {current.bio?.trim() && (
          <p className="text-xs text-muted-foreground italic break-words">
            <span className="font-medium not-italic text-foreground/70">Current bio: </span>{current.bio}
          </p>
        )}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={bioApply} onCheckedChange={(v) => setBioApply(!!v)} />
        <span className="text-sm">Apply this bio to my profile</span>
      </label>
    </div>
  );

  const renderAcademics = () => (
    <div className="space-y-5">
      {/* College */}
      {(parsed.college || current.college) && (
        <div className="space-y-2">
          <Label>College</Label>
          <Input value={collegeVal} onChange={(e) => setCollegeVal(e.target.value)} disabled={!parsed.college} />
          {parsed.college && current.college && parsed.college.trim() !== current.college.trim() && (
            <p className="text-xs text-muted-foreground">Current: {current.college}</p>
          )}
          {parsed.college && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={collegeApply} onCheckedChange={(v) => setCollegeApply(!!v)} />
              <span className="text-sm">Apply</span>
            </label>
          )}
        </div>
      )}

      {/* Degree */}
      {(parsed.degree || current.degree) && (
        <div className="space-y-2">
          <Label>Degree</Label>
          <Select value={degreeVal} onValueChange={(v) => setDegreeVal(v as Degree)} disabled={!parsed.degree}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {DEGREES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {parsed.degree && current.degree && parsed.degree !== current.degree && (
            <p className="text-xs text-muted-foreground">Current: {current.degree}</p>
          )}
          {parsed.degree && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={degreeApply} onCheckedChange={(v) => setDegreeApply(!!v)} />
              <span className="text-sm">Apply</span>
            </label>
          )}
        </div>
      )}

      {/* Graduation year */}
      {(parsed.graduation_year || current.graduationYear) && (
        <div className="space-y-2">
          <Label>Graduation year</Label>
          <Input
            type="number"
            min={YEAR_MIN}
            max={YEAR_MAX}
            value={yearVal}
            onChange={(e) => setYearVal(e.target.value)}
            disabled={!parsed.graduation_year}
          />
          {parsed.graduation_year && current.graduationYear && String(parsed.graduation_year) !== current.graduationYear && (
            <p className="text-xs text-muted-foreground">Current: {current.graduationYear}</p>
          )}
          {parsed.graduation_year && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={yearApply} onCheckedChange={(v) => setYearApply(!!v)} />
              <span className="text-sm">Apply</span>
            </label>
          )}
        </div>
      )}

      {/* Subjects */}
      {(parsed.subjects_of_interest?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <Label>Subjects of interest</Label>
          <div className="flex flex-wrap gap-2">
            {subjectsVal.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button
                  type="button"
                  onClick={() => setSubjectsVal((arr) => arr.filter((x) => x !== s))}
                  className="hover:text-destructive"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {subjectsVal.length === 0 && <span className="text-xs text-muted-foreground">No subjects</span>}
          </div>
          {current.subjects.length > 0 && (
            <p className="text-xs text-muted-foreground">Current: {current.subjects.join(", ")}</p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={subjectsApply} onCheckedChange={(v) => setSubjectsApply(!!v)} />
            <span className="text-sm">Replace my subjects with these</span>
          </label>
        </div>
      )}
    </div>
  );

  const renderInternships = () => (
    <div className="space-y-3">
      {internshipSkipped > 0 && (
        <p className="text-xs text-muted-foreground">{internshipSkipped} existing internship{internshipSkipped === 1 ? "" : "s"} skipped (already on your profile).</p>
      )}
      {internshipRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing new to add.</p>
      ) : (
        internshipRows.map((row) => (
          <div key={row._id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={row._checked} onCheckedChange={(v) => updateInternship(row._id, { _checked: !!v })} />
                <span className="text-sm font-medium">Add this internship</span>
              </label>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setInternshipRows((rows) => rows.filter((r) => r._id !== row._id))}
                aria-label="Remove from review"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Firm</Label>
                <Input value={row.firm_name} onChange={(e) => updateInternship(row._id, { firm_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Input value={row.role} onChange={(e) => updateInternship(row._id, { role: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start date <span className="text-destructive">*</span></Label>
                {(() => {
                  const invalid = row._checked && !(row.start_date && /^\d{4}-\d{2}-\d{2}$/.test(row.start_date));
                  return (
                    <>
                      <Input
                        type="date"
                        value={row.start_date || ""}
                        onChange={(e) => updateInternship(row._id, { start_date: e.target.value || null })}
                        aria-invalid={invalid}
                        className={invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {invalid && <p className="text-xs text-destructive">Start date is required to save this entry.</p>}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End date (blank if ongoing)</Label>
                <Input type="date" value={row.end_date || ""} onChange={(e) => updateInternship(row._id, { end_date: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional, max {DESC_MAX})</Label>
              <Textarea
                rows={2}
                value={row.description || ""}
                onChange={(e) => updateInternship(row._id, { description: e.target.value.slice(0, DESC_MAX) })}
                maxLength={DESC_MAX}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderMoots = () => (
    <div className="space-y-3">
      {mootSkipped > 0 && (
        <p className="text-xs text-muted-foreground">{mootSkipped} existing moot{mootSkipped === 1 ? "" : "s"} skipped (already on your profile).</p>
      )}
      {mootRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing new to add.</p>
      ) : (
        mootRows.map((row) => (
          <div key={row._id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={row._checked} onCheckedChange={(v) => updateMoot(row._id, { _checked: !!v })} />
                <span className="text-sm font-medium">Add this moot</span>
              </label>
              <Button size="icon" variant="ghost" onClick={() => setMootRows((rows) => rows.filter((r) => r._id !== row._id))} aria-label="Remove">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Competition</Label>
                <Input value={row.competition_name} onChange={(e) => updateMoot(row._id, { competition_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  value={row.year}
                  onChange={(e) => updateMoot(row._id, { year: parseInt(e.target.value, 10) || row.year })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={row.role} onValueChange={(v) => updateMoot(row._id, { role: v as MootRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOOT_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Result</Label>
                <Select value={row.result} onValueChange={(v) => updateMoot(row._id, { result: v as MootResult })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOOT_RESULTS.map((r) => <SelectItem key={r} value={r}>{RESULT_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderPubs = () => (
    <div className="space-y-3">
      {pubSkipped > 0 && (
        <p className="text-xs text-muted-foreground">{pubSkipped} existing publication{pubSkipped === 1 ? "" : "s"} skipped (already on your profile).</p>
      )}
      {pubRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing new to add.</p>
      ) : (
        pubRows.map((row) => (
          <div key={row._id} className="rounded-lg border border-border p-3 space-y-2 bg-card/50">
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={row._checked} onCheckedChange={(v) => updatePub(row._id, { _checked: !!v })} />
                <span className="text-sm font-medium">Add this publication</span>
              </label>
              <Button size="icon" variant="ghost" onClick={() => setPubRows((rows) => rows.filter((r) => r._id !== row._id))} aria-label="Remove">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Title</Label>
                <Input value={row.title} onChange={(e) => updatePub(row._id, { title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Publisher</Label>
                <Input value={row.publisher} onChange={(e) => updatePub(row._id, { publisher: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
                {(() => {
                  const invalid = row._checked && !(row.publication_date && /^\d{4}-\d{2}-\d{2}$/.test(row.publication_date));
                  return (
                    <>
                      <Input
                        type="date"
                        value={row.publication_date || ""}
                        onChange={(e) => updatePub(row._id, { publication_date: e.target.value || null })}
                        aria-invalid={invalid}
                        className={invalid ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {invalid && <p className="text-xs text-destructive">Publication date is required to save this entry.</p>}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">URL (optional)</Label>
                <Input value={row.url || ""} onChange={(e) => updatePub(row._id, { url: e.target.value || null })} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderStep = () => {
    if (totalSteps === 0) {
      return <p className="text-sm text-muted-foreground">Nothing to review.</p>;
    }
    switch (currentStepKey) {
      case "basics": return renderBasics();
      case "academics": return renderAcademics();
      case "internships": return renderInternships();
      case "moots": return renderMoots();
      case "publications": return renderPubs();
      default: return null;
    }
  };

  const stepTitle: Record<string, string> = {
    basics: "Basics",
    academics: "Academics",
    internships: "Internships",
    moots: "Moots",
    publications: "Publications",
  };

  const Body = (
    <div className="space-y-4">
      {step === 0 && summary && (
        <p className="text-sm text-muted-foreground">We found: {summary}</p>
      )}
      <div className="text-xs text-muted-foreground">
        Step {Math.min(step + 1, Math.max(totalSteps, 1))} of {Math.max(totalSteps, 1)}
        {currentStepKey && <span className="ml-2 font-medium text-foreground">· {stepTitle[currentStepKey]}</span>}
      </div>
      {renderStep()}
    </div>
  );

  const finishButton = (
    <Button size="sm" onClick={handleFinish} disabled={submitting || hasBlockingErrors}>
      {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Finish & Save
    </Button>
  );

  const Footer = (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      <Button variant="ghost" size="sm" onClick={handleBack} disabled={step === 0 || submitting}>Back</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSkipSection} disabled={submitting || totalSteps === 0}>Skip this section</Button>
        {isLastStep || totalSteps === 0 ? (
          hasBlockingErrors ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><span tabIndex={0}>{finishButton}</span></TooltipTrigger>
                <TooltipContent>Add missing required dates to save.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            finishButton
          )
        ) : (
          <Button size="sm" onClick={handleNext}>Next</Button>
        )}
      </div>
    </div>
  );

  const titleNode = "Review what we found in your CV";

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      tryClose();
      return;
    }
    onOpenChange(next);
  };

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col">
            <SheetHeader>
              <SheetTitle className="font-heading">{titleNode}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4">{Body}</div>
            <SheetFooter>{Footer}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-heading">{titleNode}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-2">{Body}</div>
            <DialogFooter>{Footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard all changes from CV review?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits in this review session will be lost. Your uploaded CV is still saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscardYes}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
