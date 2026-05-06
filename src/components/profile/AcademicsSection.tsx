import { useState, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

type Degree = "BA LLB" | "BBA LLB" | "BCom LLB" | "LLB (3yr)" | "LLM" | "Other";
const DEGREES: Degree[] = ["BA LLB", "BBA LLB", "BCom LLB", "LLB (3yr)", "LLM", "Other"];
const SUGGESTED = ["Corporate Law", "IP", "Criminal Law", "Constitutional Law", "Labour Law", "Tax", "Arbitration", "Environmental Law", "Technology Law", "Contract Law"];

interface Props {
  userId: string;
  college: string;
  setCollege: (v: string) => void;
  degree: Degree | "";
  setDegree: (v: Degree | "") => void;
  graduationYear: string;
  setGraduationYear: (v: string) => void;
  cgpa: string;
  setCgpa: (v: string) => void;
  subjects: string[];
  setSubjects: (v: string[]) => void;
}

export default function AcademicsSection({ userId, college, setCollege, degree, setDegree, graduationYear, setGraduationYear, cgpa, setCgpa, subjects, setSubjects }: Props) {
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (subjects.includes(t)) return;
    setSubjects([...subjects, t]);
  };

  const removeTag = (t: string) => setSubjects(subjects.filter((s) => s !== t));

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
      setTagDraft("");
    } else if (e.key === "Backspace" && !tagDraft && subjects.length) {
      setSubjects(subjects.slice(0, -1));
    }
  };

  const save = async () => {
    const yearNum = graduationYear ? Number(graduationYear) : null;
    if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2100)) {
      toast.error("Graduation year must be between 1950 and 2100"); return;
    }
    const cgpaNum = cgpa ? Number(cgpa) : null;
    if (cgpaNum !== null && (Number.isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10)) {
      toast.error("CGPA must be between 0 and 10"); return;
    }

    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      college: college.trim() || null,
      degree: degree || null,
      graduation_year: yearNum,
      cgpa: cgpaNum,
      subjects_of_interest: subjects,
    }).eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Academics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="college">College</Label>
          <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. NLSIU Bangalore" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Degree</Label>
            <Select value={degree || undefined} onValueChange={(v) => setDegree(v as Degree)}>
              <SelectTrigger><SelectValue placeholder="Select degree" /></SelectTrigger>
              <SelectContent>
                {DEGREES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grad-year">Graduation year</Label>
            <Input id="grad-year" type="number" min={1950} max={2100} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="e.g. 2027" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cgpa">CGPA <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="cgpa" type="number" step="0.01" min={0} max={10} value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="0.00 – 10.00" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Subjects of interest</Label>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {subjects.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} aria-label={`Remove ${t}`} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Input id="tags" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} placeholder="Type a subject and press Enter" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTED.filter((s) => !subjects.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addTag(s)} className="text-xs px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                + {s}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={saving} size="sm">Save academics</Button>
      </CardContent>
    </Card>
  );
}
