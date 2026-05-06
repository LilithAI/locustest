import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import {
  AREA_OF_LAW_LABELS,
  QUESTION_TYPE_LABELS,
  ENABLED_QUESTION_TYPES,
  DEFAULT_GRADING_CONFIG,
} from "@/lib/bar/constants";
import { computeBasePoints } from "@/lib/bar/scoring";
import {
  McqPayloadSchema,
  IssueSpotterPayloadSchema,
  SpeedRoundPayloadSchema,
  JurisdictionPayloadSchema,
  DocumentReviewPayloadSchema,
  BriefBuilderPayloadSchema,
  EthicsPayloadSchema,
  ClientCounselingPayloadSchema,
  type AreaOfLaw,
  type Difficulty,
  type QuestionType,
} from "@/lib/bar/types";

type Source = { id: string; title: string; source_type: string };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
  sources: Source[];
};

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const newId = () => crypto.randomUUID();

export default function ChallengeForm({ open, onOpenChange, onCreated, sources }: Props) {
  const [type, setType] = useState<QuestionType>("mcq");
  const [area, setArea] = useState<AreaOfLaw>("constitutional");
  const [diff, setDiff] = useState<Difficulty>("easy");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [sourceId, setSourceId] = useState<string>("__none");
  const [sourcePage, setSourcePage] = useState<string>("");
  const [sourceCitation, setSourceCitation] = useState("");

  // MCQ / Jurisdiction
  const [options, setOptions] = useState<{ id: string; text: string; jurisdiction?: string; reasoning?: string }[]>([
    { id: newId(), text: "" },
    { id: newId(), text: "" },
  ]);
  const [correctOption, setCorrectOption] = useState<string>("");

  // Issue Spotter
  const [issues, setIssues] = useState<{ id: string; text: string }[]>([
    { id: newId(), text: "" },
    { id: newId(), text: "" },
    { id: newId(), text: "" },
  ]);
  const [correctIssues, setCorrectIssues] = useState<Set<string>>(new Set());

  // Speed Round
  const [subQs, setSubQs] = useState<{ id: string; prompt: string; answer: string; aliases: string[] }[]>(
    Array.from({ length: 5 }, () => ({ id: newId(), prompt: "", answer: "", aliases: [] })),
  );
  const [timeLimit, setTimeLimit] = useState<number>(60);

  // Document Review
  const [docHtml, setDocHtml] = useState<string>("");
  const [docCategories, setDocCategories] = useState<{ id: string; label: string }[]>([
    { id: newId(), label: "Risk" },
    { id: newId(), label: "Ambiguity" },
  ]);
  const [docSpans, setDocSpans] = useState<
    { id: string; text: string; correct_category_id: string }[]
  >([{ id: newId(), text: "", correct_category_id: "" }]);

  // Brief Builder (4 fixed steps: statute, precedent, arguments, rebuttal)
  const [briefFacts, setBriefFacts] = useState("");
  const [briefCitation, setBriefCitation] = useState("");
  const [briefMcq, setBriefMcq] = useState<
    Record<
      "statute" | "precedent" | "rebuttal",
      { prompt: string; options: { id: string; title: string; desc: string; meta: string }[]; correct_id: string }
    >
  >({
    statute: { prompt: "", options: makeABCD(), correct_id: "" },
    precedent: { prompt: "", options: makeABCD(), correct_id: "" },
    rebuttal: { prompt: "", options: makeABCD(), correct_id: "" },
  });
  const [briefArguments, setBriefArguments] = useState<{
    prompt: string;
    blocks: { id: string; text: string }[];
    partial_credit: boolean;
  }>({
    prompt: "Order the arguments from strongest to weakest.",
    blocks: [
      { id: newId(), text: "" },
      { id: newId(), text: "" },
      { id: newId(), text: "" },
    ],
    partial_credit: false,
  });

  // Ethics (2-stage)
  const [ethics, setEthics] = useState<{
    scenario: string;
    decision: { id: string; text: string }[];
    correct_decision_id: string;
    consequence_text: string;
    followup: { id: string; text: string }[];
    correct_followup_id: string;
    model_reasoning: string;
    reasoning_threshold: number;
  }>({
    scenario: "",
    decision: makeABCDPlain(),
    correct_decision_id: "",
    consequence_text: "",
    followup: makeABCDPlain(),
    correct_followup_id: "",
    model_reasoning: "",
    reasoning_threshold: 60,
  });

  // Client Counseling
  const [counseling, setCounseling] = useState<{
    matter: string;
    transcript: { id: string; role: "client" | "lawyer"; text: string }[];
    decision_turns: {
      id: string;
      prompt: string;
      options: { id: string; text: string }[];
      correct_id: string;
      model_followup: string;
    }[];
    reasoning_threshold: number;
  }>({
    matter: "",
    transcript: [{ id: newId(), role: "client", text: "" }],
    decision_turns: [
      { id: newId(), prompt: "", options: makeABCDPlain(), correct_id: "", model_followup: "" },
    ],
    reasoning_threshold: 60,
  });

  const [busy, setBusy] = useState(false);

  const reset = () => {
    setType("mcq"); setArea("constitutional"); setDiff("easy"); setTitle(""); setPrompt(""); setExplanation("");
    setSourceId("__none"); setSourcePage(""); setSourceCitation("");
    setOptions([{ id: newId(), text: "" }, { id: newId(), text: "" }]);
    setCorrectOption("");
    setIssues([{ id: newId(), text: "" }, { id: newId(), text: "" }, { id: newId(), text: "" }]);
    setCorrectIssues(new Set());
    setSubQs(Array.from({ length: 5 }, () => ({ id: newId(), prompt: "", answer: "", aliases: [] })));
    setTimeLimit(60);
    setDocHtml("");
    setDocCategories([{ id: newId(), label: "Risk" }, { id: newId(), label: "Ambiguity" }]);
    setDocSpans([{ id: newId(), text: "", correct_category_id: "" }]);
    setBriefFacts(""); setBriefCitation("");
    setBriefMcq({
      statute: { prompt: "", options: makeABCD(), correct_id: "" },
      precedent: { prompt: "", options: makeABCD(), correct_id: "" },
      rebuttal: { prompt: "", options: makeABCD(), correct_id: "" },
    });
    setBriefArguments({
      prompt: "Order the arguments from strongest to weakest.",
      blocks: [{ id: newId(), text: "" }, { id: newId(), text: "" }, { id: newId(), text: "" }],
      partial_credit: false,
    });
    setEthics({
      scenario: "", decision: makeABCDPlain(), correct_decision_id: "",
      consequence_text: "", followup: makeABCDPlain(), correct_followup_id: "",
      model_reasoning: "", reasoning_threshold: 60,
    });
    setCounseling({
      matter: "", transcript: [{ id: newId(), role: "client", text: "" }],
      decision_turns: [{ id: newId(), prompt: "", options: makeABCDPlain(), correct_id: "", model_followup: "" }],
      reasoning_threshold: 60,
    });
  };

  const buildPayload = (): { ok: true; payload: unknown; grading?: Record<string, unknown>; questionCount?: number } | { ok: false; msg: string } => {
    if (type === "mcq") {
      const p = { options: options.map((o) => ({ id: o.id, text: o.text.trim() })), correct_option_id: correctOption };
      const r = McqPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data };
    }
    if (type === "jurisdiction") {
      const p = {
        options: options.map((o) => ({ id: o.id, jurisdiction: (o.jurisdiction ?? "").trim(), reasoning: (o.reasoning ?? "").trim() })),
        correct_option_id: correctOption,
      };
      const r = JurisdictionPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data };
    }
    if (type === "issue_spotter") {
      const p = {
        issue_options: issues.map((i) => ({ id: i.id, text: i.text.trim() })),
        correct_issue_ids: [...correctIssues],
      };
      const r = IssueSpotterPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data };
    }
    if (type === "speed_round") {
      const p = {
        questions: subQs.map((q) => ({
          id: q.id,
          prompt: q.prompt.trim(),
          answer: q.answer.trim(),
          ...(q.aliases.length > 0 ? { aliases: q.aliases.map((a) => a.trim()).filter(Boolean) } : {}),
        })),
        time_limit_seconds: timeLimit,
      };
      const r = SpeedRoundPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data, questionCount: p.questions.length };
    }
    if (type === "document_review") {
      const p = {
        document_html: docHtml.trim(),
        spans: docSpans.map((s) => ({ id: s.id, text: s.text.trim() })),
        categories: docCategories.map((c) => ({ id: c.id, label: c.label.trim() })),
        correct_flags: docSpans
          .filter((s) => s.correct_category_id)
          .map((s) => ({ span_id: s.id, category_id: s.correct_category_id })),
      };
      const r = DocumentReviewPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data };
    }
    if (type === "brief_builder") {
      const mkMcq = (key: "statute" | "precedent" | "rebuttal", label: string) => {
        const s = briefMcq[key];
        return {
          kind: "mcq" as const,
          label,
          prompt: s.prompt.trim(),
          options: s.options.map((o, i) => ({
            id: o.id,
            letter: LETTERS[i],
            title: o.title.trim(),
            desc: o.desc.trim(),
            meta: o.meta.trim(),
          })),
          correct_option_id: s.correct_id,
        };
      };
      const orderStep = {
        kind: "order" as const,
        label: "Arguments",
        prompt: briefArguments.prompt.trim(),
        blocks: briefArguments.blocks.map((b) => ({ id: b.id, text: b.text.trim() })),
        correct_order: briefArguments.blocks.map((b) => b.id),
      };
      const p = {
        fact_pattern: briefFacts.trim(),
        citation: briefCitation.trim(),
        steps: [
          mkMcq("statute", "Statute"),
          mkMcq("precedent", "Precedent"),
          orderStep,
          mkMcq("rebuttal", "Rebuttal"),
        ],
      };
      const r = BriefBuilderPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data, grading: { partial_order_credit: briefArguments.partial_credit } };
    }
    if (type === "ethics") {
      const p = {
        scenario: ethics.scenario.trim(),
        decision_options: ethics.decision.map((o, i) => ({ id: o.id, letter: LETTERS[i], text: o.text.trim() })),
        correct_decision_id: ethics.correct_decision_id,
        consequence_text: ethics.consequence_text.trim(),
        followup_options: ethics.followup.map((o, i) => ({ id: o.id, letter: LETTERS[i], text: o.text.trim() })),
        correct_followup_id: ethics.correct_followup_id,
        model_reasoning: ethics.model_reasoning.trim(),
      };
      const r = EthicsPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data, grading: { reasoning_threshold: ethics.reasoning_threshold } };
    }
    if (type === "client_counseling") {
      const p = {
        matter: counseling.matter.trim(),
        transcript: counseling.transcript.map((t, i) => ({
          turn: i + 1,
          role: t.role,
          text: t.text.trim(),
        })),
        decision_turns: counseling.decision_turns.map((d, i) => ({
          turn: i + 1,
          prompt: d.prompt.trim(),
          options: d.options.map((o, j) => ({ id: o.id, letter: LETTERS[j], text: o.text.trim() })),
          correct_option_id: d.correct_id,
          model_followup: d.model_followup.trim(),
        })),
      };
      const r = ClientCounselingPayloadSchema.safeParse(p);
      if (!r.success) return { ok: false, msg: r.error.errors[0].message };
      return { ok: true, payload: r.data, grading: { reasoning_threshold: counseling.reasoning_threshold } };
    }
    return { ok: false, msg: "unsupported type" };
  };

  const submit = async () => {
    if (!title.trim() || !prompt.trim()) { toast.error("Title and prompt required"); return; }
    const built = buildPayload();
    if (built.ok === false) { toast.error(built.msg); return; }
    const points = computeBasePoints(type, diff, built.questionCount);
    const grading = built.grading ?? DEFAULT_GRADING_CONFIG[type] ?? {};

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from("bar_challenges").insert({
      source_id: sourceId === "__none" ? null : sourceId,
      source_page: sourcePage ? parseInt(sourcePage, 10) : null,
      source_citation: sourceCitation.trim() || null,
      question_type: type,
      area_of_law: area,
      difficulty: diff,
      title: title.trim(),
      prompt: prompt.trim(),
      explanation: explanation.trim() || null,
      payload: built.payload as never,
      grading_config: grading as never,
      points_base: points,
      status: "draft",
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Challenge created (draft)");
    reset(); onOpenChange(false); onCreated();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Challenge</SheetTitle>
          <SheetDescription>Saves as draft. Approve from the table.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Question Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENABLED_QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={diff} onValueChange={(v) => setDiff(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Area of Law</Label>
              <Select value={area} onValueChange={(v) => setArea(v as AreaOfLaw)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AREA_OF_LAW_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Title (admin-facing) *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Prompt (shown to students) *</Label>
            <Textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div>
            <Label>Explanation (optional)</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <Label>Source (optional)</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Page</Label>
              <Input type="number" value={sourcePage} onChange={(e) => setSourcePage(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Citation</Label>
              <Input value={sourceCitation} onChange={(e) => setSourceCitation(e.target.value)} />
            </div>
          </div>

          <Card className="p-4 border-2 border-border space-y-3">
            {type === "mcq" && (
              <McqEditor options={options} setOptions={setOptions} correct={correctOption} setCorrect={setCorrectOption} />
            )}
            {type === "jurisdiction" && (
              <JurisdictionEditor options={options} setOptions={setOptions} correct={correctOption} setCorrect={setCorrectOption} />
            )}
            {type === "issue_spotter" && (
              <IssueEditor issues={issues} setIssues={setIssues} correct={correctIssues} setCorrect={setCorrectIssues} />
            )}
            {type === "speed_round" && (
              <SpeedRoundEditor subQs={subQs} setSubQs={setSubQs} timeLimit={timeLimit} setTimeLimit={setTimeLimit} />
            )}
            {type === "document_review" && (
              <DocumentReviewEditor
                docHtml={docHtml} setDocHtml={setDocHtml}
                categories={docCategories} setCategories={setDocCategories}
                spans={docSpans} setSpans={setDocSpans}
              />
            )}
            {type === "brief_builder" && (
              <BriefBuilderEditor
                facts={briefFacts} setFacts={setBriefFacts}
                citation={briefCitation} setCitation={setBriefCitation}
                mcq={briefMcq} setMcq={setBriefMcq}
                args={briefArguments} setArgs={setBriefArguments}
              />
            )}
            {type === "ethics" && (
              <EthicsEditor ethics={ethics} setEthics={setEthics} />
            )}
            {type === "client_counseling" && (
              <CounselingEditor counseling={counseling} setCounseling={setCounseling} />
            )}
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "Saving..." : "Save Draft"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============= Helpers =============
function makeABCD() {
  return Array.from({ length: 4 }, () => ({ id: newId(), title: "", desc: "", meta: "" }));
}
function makeABCDPlain() {
  return Array.from({ length: 4 }, () => ({ id: newId(), text: "" }));
}

// ============= MCQ / Issue / Jurisdiction / Speed (unchanged behavior) =============
function McqEditor({ options, setOptions, correct, setCorrect }: {
  options: { id: string; text: string }[];
  setOptions: (o: { id: string; text: string }[]) => void;
  correct: string; setCorrect: (s: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Options (2-6) — pick the correct one</Label>
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input type="radio" checked={correct === o.id} onChange={() => setCorrect(o.id)} />
          <Input value={o.text} placeholder={`Option ${i + 1}`} onChange={(e) => {
            const next = [...options]; next[i] = { ...o, text: e.target.value }; setOptions(next);
          }} />
          {options.length > 2 && (
            <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((x) => x.id !== o.id))}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <Button size="sm" variant="outline" onClick={() => setOptions([...options, { id: newId(), text: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add option
        </Button>
      )}
    </div>
  );
}

function JurisdictionEditor({ options, setOptions, correct, setCorrect }: {
  options: { id: string; text: string; jurisdiction?: string; reasoning?: string }[];
  setOptions: (o: { id: string; text: string; jurisdiction?: string; reasoning?: string }[]) => void;
  correct: string; setCorrect: (s: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Jurisdiction Options (2-5)</Label>
      {options.map((o, i) => (
        <div key={o.id} className="border border-border rounded-md p-2 space-y-2">
          <div className="flex items-center gap-2">
            <input type="radio" checked={correct === o.id} onChange={() => setCorrect(o.id)} />
            <Input placeholder="Jurisdiction" value={o.jurisdiction ?? ""} onChange={(e) => {
              const next = [...options]; next[i] = { ...o, jurisdiction: e.target.value }; setOptions(next);
            }} />
            {options.length > 2 && (
              <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((x) => x.id !== o.id))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Textarea placeholder="Reasoning" value={o.reasoning ?? ""} onChange={(e) => {
            const next = [...options]; next[i] = { ...o, reasoning: e.target.value }; setOptions(next);
          }} />
        </div>
      ))}
      {options.length < 5 && (
        <Button size="sm" variant="outline" onClick={() => setOptions([...options, { id: newId(), text: "", jurisdiction: "", reasoning: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add option
        </Button>
      )}
    </div>
  );
}

function IssueEditor({ issues, setIssues, correct, setCorrect }: {
  issues: { id: string; text: string }[];
  setIssues: (i: { id: string; text: string }[]) => void;
  correct: Set<string>; setCorrect: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(correct);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCorrect(next);
  };
  return (
    <div className="space-y-2">
      <Label>Issue Options (3-10) — check ALL correct</Label>
      {issues.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2">
          <Checkbox checked={correct.has(it.id)} onCheckedChange={() => toggle(it.id)} />
          <Input value={it.text} placeholder={`Issue ${i + 1}`} onChange={(e) => {
            const next = [...issues]; next[i] = { ...it, text: e.target.value }; setIssues(next);
          }} />
          {issues.length > 3 && (
            <Button size="icon" variant="ghost" onClick={() => {
              setIssues(issues.filter((x) => x.id !== it.id));
              const c = new Set(correct); c.delete(it.id); setCorrect(c);
            }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {issues.length < 10 && (
        <Button size="sm" variant="outline" onClick={() => setIssues([...issues, { id: newId(), text: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add issue
        </Button>
      )}
    </div>
  );
}

function SpeedRoundEditor({ subQs, setSubQs, timeLimit, setTimeLimit }: {
  subQs: { id: string; prompt: string; answer: string; aliases: string[] }[];
  setSubQs: (q: { id: string; prompt: string; answer: string; aliases: string[] }[]) => void;
  timeLimit: number; setTimeLimit: (n: number) => void;
}) {
  const updateAliases = (idx: number, raw: string) => {
    const aliases = raw.split(",").map((a) => a.trim()).filter(Boolean);
    const next = [...subQs]; next[idx] = { ...subQs[idx], aliases }; setSubQs(next);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Sub-questions (5-15)</Label>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Time limit (s)</Label>
          <Input type="number" min={30} max={300} className="w-20" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value || "60", 10))} />
        </div>
      </div>
      {subQs.map((q, i) => (
        <div key={q.id} className="space-y-1.5 border-2 border-border rounded-md p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
            <Input placeholder="Prompt" value={q.prompt} onChange={(e) => {
              const next = [...subQs]; next[i] = { ...q, prompt: e.target.value }; setSubQs(next);
            }} />
            <Input placeholder="Answer" value={q.answer} onChange={(e) => {
              const next = [...subQs]; next[i] = { ...q, answer: e.target.value }; setSubQs(next);
            }} />
            {subQs.length > 5 && (
              <Button size="icon" variant="ghost" onClick={() => setSubQs(subQs.filter((x) => x.id !== q.id))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 pl-8">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Also accept
            </Label>
            <Input
              placeholder="Comma-separated alternates (optional, e.g. HC writ, writ of HC)"
              value={q.aliases.join(", ")}
              onChange={(e) => updateAliases(i, e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      ))}
      {subQs.length < 15 && (
        <Button size="sm" variant="outline" onClick={() => setSubQs([...subQs, { id: newId(), prompt: "", answer: "", aliases: [] }])}>
          <Plus className="w-4 h-4 mr-1" /> Add sub-question
        </Button>
      )}
    </div>
  );
}

// ============= Document Review =============
function DocumentReviewEditor({
  docHtml, setDocHtml, categories, setCategories, spans, setSpans,
}: {
  docHtml: string; setDocHtml: (s: string) => void;
  categories: { id: string; label: string }[];
  setCategories: (c: { id: string; label: string }[]) => void;
  spans: { id: string; text: string; correct_category_id: string }[];
  setSpans: (s: { id: string; text: string; correct_category_id: string }[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Document HTML / Passage</Label>
        <Textarea rows={5} value={docHtml} onChange={(e) => setDocHtml(e.target.value)}
          placeholder="Paste the clause / contract text. Wrap flaggable phrases with the exact text in spans below." />
      </div>
      <div>
        <Label>Categories (chips)</Label>
        {categories.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 mt-1">
            <Input value={c.label} onChange={(e) => {
              const next = [...categories]; next[i] = { ...c, label: e.target.value }; setCategories(next);
            }} />
            {categories.length > 1 && (
              <Button size="icon" variant="ghost" onClick={() => setCategories(categories.filter((x) => x.id !== c.id))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <Button size="sm" variant="outline" className="mt-2"
          onClick={() => setCategories([...categories, { id: newId(), label: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add category
        </Button>
      </div>
      <div>
        <Label>Flaggable spans (text exactly as in passage + correct category)</Label>
        {spans.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[1fr_180px_auto] gap-2 mt-1 items-center">
            <Input placeholder="Span text" value={s.text} onChange={(e) => {
              const next = [...spans]; next[i] = { ...s, text: e.target.value }; setSpans(next);
            }} />
            <Select value={s.correct_category_id} onValueChange={(v) => {
              const next = [...spans]; next[i] = { ...s, correct_category_id: v }; setSpans(next);
            }}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label || "(unnamed)"}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" onClick={() => setSpans(spans.filter((x) => x.id !== s.id))}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="mt-2"
          onClick={() => setSpans([...spans, { id: newId(), text: "", correct_category_id: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add span
        </Button>
      </div>
    </div>
  );
}

// ============= Brief Builder =============
function BriefBuilderEditor({
  facts, setFacts, citation, setCitation, mcq, setMcq, args, setArgs,
}: {
  facts: string; setFacts: (s: string) => void;
  citation: string; setCitation: (s: string) => void;
  mcq: Record<"statute" | "precedent" | "rebuttal", { prompt: string; options: { id: string; title: string; desc: string; meta: string }[]; correct_id: string }>;
  setMcq: (m: typeof mcq) => void;
  args: { prompt: string; blocks: { id: string; text: string }[]; partial_credit: boolean };
  setArgs: (a: typeof args) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...args.blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setArgs({ ...args, blocks: next });
  };
  return (
    <div className="space-y-3">
      <div>
        <Label>Fact Pattern</Label>
        <Textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} />
      </div>
      <div>
        <Label>Citation (e.g. Priya v. QuickMart (2024))</Label>
        <Input value={citation} onChange={(e) => setCitation(e.target.value)} />
      </div>

      <Tabs defaultValue="statute">
        <TabsList>
          <TabsTrigger value="statute">1. Statute</TabsTrigger>
          <TabsTrigger value="precedent">2. Precedent</TabsTrigger>
          <TabsTrigger value="arguments">3. Arguments</TabsTrigger>
          <TabsTrigger value="rebuttal">4. Rebuttal</TabsTrigger>
        </TabsList>

        {(["statute", "precedent", "rebuttal"] as const).map((key) => (
          <TabsContent key={key} value={key} className="space-y-2 mt-3">
            <Input placeholder="Step prompt" value={mcq[key].prompt}
              onChange={(e) => setMcq({ ...mcq, [key]: { ...mcq[key], prompt: e.target.value } })} />
            {mcq[key].options.map((o, i) => (
              <div key={o.id} className="border border-border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <input type="radio" checked={mcq[key].correct_id === o.id}
                    onChange={() => setMcq({ ...mcq, [key]: { ...mcq[key], correct_id: o.id } })} />
                  <span className="text-xs font-bold text-accent">{LETTERS[i]}</span>
                  <Input placeholder="Title" value={o.title} onChange={(e) => {
                    const next = [...mcq[key].options]; next[i] = { ...o, title: e.target.value };
                    setMcq({ ...mcq, [key]: { ...mcq[key], options: next } });
                  }} />
                </div>
                <Input placeholder="Description" value={o.desc} onChange={(e) => {
                  const next = [...mcq[key].options]; next[i] = { ...o, desc: e.target.value };
                  setMcq({ ...mcq, [key]: { ...mcq[key], options: next } });
                }} />
                <Input placeholder="Meta (citation / section)" value={o.meta} onChange={(e) => {
                  const next = [...mcq[key].options]; next[i] = { ...o, meta: e.target.value };
                  setMcq({ ...mcq, [key]: { ...mcq[key], options: next } });
                }} />
              </div>
            ))}
          </TabsContent>
        ))}

        <TabsContent value="arguments" className="space-y-2 mt-3">
          <Input placeholder="Step prompt" value={args.prompt}
            onChange={(e) => setArgs({ ...args, prompt: e.target.value })} />
          <p className="text-xs text-muted-foreground">List blocks in the CORRECT order (top = strongest). Use arrows to reorder.</p>
          {args.blocks.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2">
              <span className="text-xs font-mono w-6">{String(i + 1).padStart(2, "0")}</span>
              <Input value={b.text} onChange={(e) => {
                const next = [...args.blocks]; next[i] = { ...b, text: e.target.value };
                setArgs({ ...args, blocks: next });
              }} />
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
              {args.blocks.length > 2 && (
                <Button size="icon" variant="ghost" onClick={() =>
                  setArgs({ ...args, blocks: args.blocks.filter((x) => x.id !== b.id) })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() =>
              setArgs({ ...args, blocks: [...args.blocks, { id: newId(), text: "" }] })}>
              <Plus className="w-4 h-4 mr-1" /> Add block
            </Button>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={args.partial_credit}
                onCheckedChange={(v) => setArgs({ ...args, partial_credit: !!v })} />
              Allow partial credit (Kendall-tau)
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============= Ethics =============
function EthicsEditor({ ethics, setEthics }: {
  ethics: {
    scenario: string; decision: { id: string; text: string }[]; correct_decision_id: string;
    consequence_text: string; followup: { id: string; text: string }[]; correct_followup_id: string;
    model_reasoning: string; reasoning_threshold: number;
  };
  setEthics: (e: typeof ethics) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Scenario</Label>
        <Textarea rows={3} value={ethics.scenario} onChange={(e) => setEthics({ ...ethics, scenario: e.target.value })} />
      </div>
      <Label>Stage 1 — Decision (A/B/C/D)</Label>
      {ethics.decision.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input type="radio" checked={ethics.correct_decision_id === o.id}
            onChange={() => setEthics({ ...ethics, correct_decision_id: o.id })} />
          <span className="text-xs font-bold text-accent w-4">{LETTERS[i]}</span>
          <Input value={o.text} onChange={(e) => {
            const next = [...ethics.decision]; next[i] = { ...o, text: e.target.value };
            setEthics({ ...ethics, decision: next });
          }} />
        </div>
      ))}
      <div>
        <Label>Consequence text (shown after Stage 1)</Label>
        <Textarea rows={2} value={ethics.consequence_text}
          onChange={(e) => setEthics({ ...ethics, consequence_text: e.target.value })} />
      </div>
      <Label>Stage 2 — Follow-up (A/B/C/D)</Label>
      {ethics.followup.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <input type="radio" checked={ethics.correct_followup_id === o.id}
            onChange={() => setEthics({ ...ethics, correct_followup_id: o.id })} />
          <span className="text-xs font-bold text-accent w-4">{LETTERS[i]}</span>
          <Input value={o.text} onChange={(e) => {
            const next = [...ethics.followup]; next[i] = { ...o, text: e.target.value };
            setEthics({ ...ethics, followup: next });
          }} />
        </div>
      ))}
      <div>
        <Label>Model reasoning ("Why this was the right call")</Label>
        <Textarea rows={3} value={ethics.model_reasoning}
          onChange={(e) => setEthics({ ...ethics, model_reasoning: e.target.value })} />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs">AI rubric threshold (0-100)</Label>
        <Input type="number" min={0} max={100} className="w-20" value={ethics.reasoning_threshold}
          onChange={(e) => setEthics({ ...ethics, reasoning_threshold: parseInt(e.target.value || "60", 10) })} />
      </div>
    </div>
  );
}

// ============= Client Counseling =============
function CounselingEditor({ counseling, setCounseling }: {
  counseling: {
    matter: string;
    transcript: { id: string; role: "client" | "lawyer"; text: string }[];
    decision_turns: {
      id: string; prompt: string; options: { id: string; text: string }[]; correct_id: string; model_followup: string;
    }[];
    reasoning_threshold: number;
  };
  setCounseling: (c: typeof counseling) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Matter (e.g. "Srinivasan — Labour / Retaliation")</Label>
        <Input value={counseling.matter}
          onChange={(e) => setCounseling({ ...counseling, matter: e.target.value })} />
      </div>

      <Label>Transcript turns</Label>
      {counseling.transcript.map((t, i) => (
        <div key={t.id} className="grid grid-cols-[100px_1fr_auto] gap-2 items-start">
          <Select value={t.role} onValueChange={(v) => {
            const next = [...counseling.transcript]; next[i] = { ...t, role: v as "client" | "lawyer" };
            setCounseling({ ...counseling, transcript: next });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="lawyer">Lawyer</SelectItem>
            </SelectContent>
          </Select>
          <Textarea rows={2} value={t.text} onChange={(e) => {
            const next = [...counseling.transcript]; next[i] = { ...t, text: e.target.value };
            setCounseling({ ...counseling, transcript: next });
          }} />
          <Button size="icon" variant="ghost" onClick={() => setCounseling({
            ...counseling, transcript: counseling.transcript.filter((x) => x.id !== t.id),
          })}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => setCounseling({
        ...counseling, transcript: [...counseling.transcript, { id: newId(), role: "client", text: "" }],
      })}><Plus className="w-4 h-4 mr-1" /> Add turn</Button>

      <Label>Decision turns (A/B/C/D pick per turn)</Label>
      {counseling.decision_turns.map((d, i) => (
        <div key={d.id} className="border border-border rounded-md p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Turn {i + 1}</span>
            <Button size="icon" variant="ghost" onClick={() => setCounseling({
              ...counseling, decision_turns: counseling.decision_turns.filter((x) => x.id !== d.id),
            })}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <Input placeholder="Prompt (e.g. How do you respond?)" value={d.prompt}
            onChange={(e) => {
              const next = [...counseling.decision_turns]; next[i] = { ...d, prompt: e.target.value };
              setCounseling({ ...counseling, decision_turns: next });
            }} />
          {d.options.map((o, j) => (
            <div key={o.id} className="flex items-center gap-2">
              <input type="radio" checked={d.correct_id === o.id} onChange={() => {
                const next = [...counseling.decision_turns]; next[i] = { ...d, correct_id: o.id };
                setCounseling({ ...counseling, decision_turns: next });
              }} />
              <span className="text-xs font-bold text-accent w-4">{LETTERS[j]}</span>
              <Input value={o.text} onChange={(e) => {
                const opts = [...d.options]; opts[j] = { ...o, text: e.target.value };
                const next = [...counseling.decision_turns]; next[i] = { ...d, options: opts };
                setCounseling({ ...counseling, decision_turns: next });
              }} />
            </div>
          ))}
          <Input placeholder="Model follow-up (shown in review)" value={d.model_followup}
            onChange={(e) => {
              const next = [...counseling.decision_turns]; next[i] = { ...d, model_followup: e.target.value };
              setCounseling({ ...counseling, decision_turns: next });
            }} />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => setCounseling({
        ...counseling, decision_turns: [...counseling.decision_turns, {
          id: newId(), prompt: "", options: makeABCDPlain(), correct_id: "", model_followup: "",
        }],
      })}><Plus className="w-4 h-4 mr-1" /> Add decision turn</Button>

      <div className="flex items-center gap-2">
        <Label className="text-xs">AI rubric threshold (0-100)</Label>
        <Input type="number" min={0} max={100} className="w-20" value={counseling.reasoning_threshold}
          onChange={(e) => setCounseling({ ...counseling, reasoning_threshold: parseInt(e.target.value || "60", 10) })} />
      </div>
    </div>
  );
}
