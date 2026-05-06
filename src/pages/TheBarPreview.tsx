// Preview page — showcases all 8 question type renderers with sample data
// in both Answer and Review modes. No DB calls; pure UI demo.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, CheckCircle2 } from "lucide-react";
import { McqRenderer } from "@/components/bar/renderers/McqRenderer";
import { IssueSpotterRenderer } from "@/components/bar/renderers/IssueSpotterRenderer";
import { JurisdictionRenderer } from "@/components/bar/renderers/JurisdictionRenderer";
import { SpeedRoundRenderer } from "@/components/bar/renderers/SpeedRoundRenderer";
import {
  DocumentReviewRenderer,
  type DocReviewAnswerState,
} from "@/components/bar/renderers/DocumentReviewRenderer";
import {
  BriefBuilderRenderer,
  type BriefAnswerState,
  type BriefPayload,
} from "@/components/bar/renderers/BriefBuilderRenderer";
import {
  EthicsRenderer,
  type EthicsAnswerState,
  type EthicsStage,
} from "@/components/bar/renderers/EthicsRenderer";
import {
  ClientCounselingRenderer,
  type CounselingAnswerState,
} from "@/components/bar/renderers/ClientCounselingRenderer";
import { PremiumDocumentReview } from "@/components/bar/premium/PremiumDocumentReview";
import { PremiumBriefBuilder } from "@/components/bar/premium/PremiumBriefBuilder";
import { PremiumEthics } from "@/components/bar/premium/PremiumEthics";
import { PremiumClientCounseling } from "@/components/bar/premium/PremiumClientCounseling";
import { PremiumBadge } from "@/components/bar/premium/PremiumBadge";
import { isPremiumType } from "@/lib/bar/premium";
import { QUESTION_TYPE_LABELS } from "@/lib/bar/constants";
import { usePageMeta } from "@/hooks/usePageMeta";
import { RitChatPanel } from "@/components/bar/rit/RitChatPanel";

const STARTERS = {
  why: "Why isn't my answer correct?",
  cite: "Cite the leading case",
  hypo: "Give me a similar hypothetical",
} as const;

// ---------- legacy 4 sample data (unchanged) ----------
const SAMPLES: any = {
  mcq: {
    title: "Multiple Choice",
    difficulty: "easy" as const,
    area: "Constitutional",
    points: 5,
    prompt:
      "Under Article 21 of the Constitution of India, which of the following is NOT considered a component of the right to life and personal liberty as developed by the Supreme Court?",
    payload: {
      options: [
        { id: "a", text: "Right to a clean environment" },
        { id: "b", text: "Right to privacy" },
        { id: "c", text: "Right to free higher education for all adults" },
        { id: "d", text: "Right to a speedy trial" },
      ],
    },
    correctId: "c",
    explanation:
      "While the right to free education up to 14 years is guaranteed under Article 21A, the Supreme Court has not extended this to free higher education for all adults. The other options are recognised facets of Article 21.",
  },
  issue_spotter: {
    title: "Issue Spotter",
    difficulty: "medium" as const,
    area: "Contract",
    points: 15,
    prompt:
      "A, a 17-year-old, signs a contract to buy a motorcycle from B for ₹80,000. A pays ₹10,000 advance. B later sells the same motorcycle to C, who is unaware of the prior agreement. A also discovers B knew about a hidden engine defect. Identify ALL legal issues present.",
    payload: {
      issue_options: [
        { id: "i1", text: "Capacity to contract — minority of A under Section 11, Indian Contract Act, 1872" },
        { id: "i2", text: "Misrepresentation / fraud by B regarding the engine defect" },
        { id: "i3", text: "Specific performance — whether A can compel sale despite resale to C" },
        { id: "i4", text: "Bona fide purchaser for value without notice — protection of C" },
        { id: "i5", text: "Frustration of contract under Section 56" },
        { id: "i6", text: "Restitution of the ₹10,000 advance" },
      ],
    },
    correctIds: ["i1", "i2", "i4", "i6"],
    explanation:
      "Minor's contract is void ab initio (Mohori Bibee), so specific performance and frustration do not arise. Misrepresentation, the bona-fide purchaser doctrine, and restitution of the advance are all live issues.",
  },
  jurisdiction: {
    title: "Jurisdiction",
    difficulty: "medium" as const,
    area: "Procedure",
    points: 10,
    prompt:
      "A company registered in Mumbai enters into a contract with a supplier in Chennai. The contract is executed in Bengaluru and goods are to be delivered in Hyderabad. The supplier sues for non-payment. Which court has territorial jurisdiction under Section 20 CPC?",
    payload: {
      options: [
        { id: "a", jurisdiction: "Only the Bombay High Court", reasoning: "Defendant company has its registered office in Mumbai, so only Mumbai courts apply." },
        { id: "b", jurisdiction: "Mumbai, Chennai, Bengaluru, or Hyderabad — plaintiff's choice", reasoning: "Under Section 20 CPC, suit may be filed where defendant resides/works for gain OR where cause of action wholly or partly arose. Each city satisfies one of these." },
        { id: "c", jurisdiction: "Only Chennai (where supplier is based)", reasoning: "The plaintiff's place of business always determines jurisdiction." },
        { id: "d", jurisdiction: "Only Hyderabad (place of delivery)", reasoning: "Delivery is the crux of cause of action and overrides residence." },
      ],
    },
    correctId: "b",
    explanation:
      "Section 20 CPC gives the plaintiff a choice between defendant's residence/place of business and any place where the cause of action wholly or partly arose. All four cities qualify under one limb or the other.",
  },
  speed_round: {
    title: "Speed Round",
    difficulty: "hard" as const,
    area: "Criminal",
    points: 3,
    prompt: "Rapid-fire: identify the section of the Bharatiya Nyaya Sanhita, 2023 for each offence.",
    payload: {
      time_limit_seconds: 60,
      questions: [
        { id: "q1", prompt: "Murder", answer: "103" },
        { id: "q2", prompt: "Culpable homicide not amounting to murder", answer: "105" },
        { id: "q3", prompt: "Theft", answer: "303" },
        { id: "q4", prompt: "Cheating", answer: "318" },
        { id: "q5", prompt: "Criminal breach of trust", answer: "316" },
      ],
    },
  },
} as const;

// ---------- new 4 sample data ----------
const DOC_REVIEW_SAMPLE = {
  title: "Document Review — NDA Excerpt",
  difficulty: "medium" as const,
  area: "Contract",
  points: 15,
  prompt:
    "Review this NDA excerpt for a junior associate at a startup. Flag every clause that is unconscionable, overbroad, or contrary to Indian law.",
  payload: {
    document_html:
      "1. The Recipient agrees to keep all Confidential Information secret {{s1}}for a period of fifty (50) years from the date of disclosure{{/s1}}, regardless of whether such information enters the public domain.\n\n2. {{s2}}The Recipient irrevocably waives all rights to seek employment with any competitor of the Discloser anywhere in the world for a period of seven (7) years following termination.{{/s2}}\n\n3. The Recipient shall return all Confidential Information upon written request from the Discloser within thirty (30) days.\n\n4. {{s3}}Any dispute arising under this Agreement shall be settled exclusively by binding arbitration in Geneva, Switzerland, with all costs borne solely by the Recipient regardless of outcome.{{/s3}}\n\n5. {{s4}}The Discloser may, at its sole discretion, modify the terms of this Agreement at any time without notice to the Recipient.{{/s4}}\n\n6. This Agreement is governed by the laws of India.",
    spans: [
      { id: "s1", text: "for a period of fifty (50) years from the date of disclosure" },
      { id: "s2", text: "The Recipient irrevocably waives all rights to seek employment with any competitor of the Discloser anywhere in the world for a period of seven (7) years following termination." },
      { id: "s3", text: "Any dispute arising under this Agreement shall be settled exclusively by binding arbitration in Geneva, Switzerland, with all costs borne solely by the Recipient regardless of outcome." },
      { id: "s4", text: "The Discloser may, at its sole discretion, modify the terms of this Agreement at any time without notice to the Recipient." },
    ],
    categories: [
      { id: "c1", label: "Overbroad / Unreasonable" },
      { id: "c2", label: "Restraint of Trade (S. 27 ICA)" },
      { id: "c3", label: "Unconscionable Forum / Cost" },
      { id: "c4", label: "Unilateral Modification" },
    ],
    correct_flags: [
      { span_id: "s1", category_id: "c1" },
      { span_id: "s2", category_id: "c2" },
      { span_id: "s3", category_id: "c3" },
      { span_id: "s4", category_id: "c4" },
    ],
  },
  explanation:
    "S.27 of the Indian Contract Act voids agreements in restraint of trade. Excessive duration, unilateral modification rights, and forum-selection clauses with cost-shifting can all be struck down as unconscionable. Clause 6 (governing law) is fine.",
};

const BRIEF_SAMPLE: { title: string; difficulty: "hard"; area: string; points: number; prompt: string; payload: BriefPayload; explanation: string } = {
  title: "Brief Builder — Priya v. QuickMart (2024)",
  difficulty: "hard",
  area: "Torts",
  points: 40,
  prompt:
    "Priya slipped on an unmarked wet floor in a QuickMart aisle and fractured her wrist. CCTV shows the spill occurred 47 minutes before her fall, with no warning sign placed and no staff on the aisle. Build the plaintiff's brief.",
  payload: {
    fact_pattern:
      "Plaintiff Priya, 34, slipped on a clear liquid spill in a QuickMart aisle. CCTV confirms the spill occurred 47 minutes before her fall. No warning sign was placed. The store's own SOP requires hourly aisle checks. Priya suffered a comminuted fracture of her left wrist requiring surgery (₹2.4 lakh) and 8 weeks off work (₹1.6 lakh in lost wages).",
    citation: "Suit No. 412/2024, City Civil Court, Bengaluru",
    steps: [
      {
        kind: "mcq",
        label: "Statute",
        prompt: "Identify the primary statutory anchor for QuickMart's liability.",
        options: [
          { id: "a", letter: "A", title: "Consumer Protection Act, 2019 — S. 2(11) deficiency", desc: "Service deficiency in providing a safe shopping environment.", meta: "CPA 2019, S. 2(11)" },
          { id: "b", letter: "B", title: "Indian Contract Act — implied warranty", desc: "Implied term of safety in the contract of sale.", meta: "ICA 1872, S. 16" },
          { id: "c", letter: "C", title: "Common law negligence — duty of care", desc: "Occupier's duty to invitees on the premises.", meta: "Donoghue v. Stevenson [1932]" },
          { id: "d", letter: "D", title: "Bharatiya Nyaya Sanhita — criminal negligence", desc: "Culpable rashness causing hurt.", meta: "BNS 2023, S. 125" },
        ],
        correct_option_id: "c",
      },
      {
        kind: "mcq",
        label: "Precedent",
        prompt: "Pick the strongest precedent for occupier's liability on retail premises.",
        options: [
          { id: "a", letter: "A", title: "Klaus Mittelbachert v. East India Hotels", desc: "Occupier's strict liability for guest safety.", meta: "AIR 1997 Del 201" },
          { id: "b", letter: "B", title: "Jay Laxmi Salt Works v. State of Gujarat", desc: "State liability for sovereign function failures.", meta: "(1994) 4 SCC 1" },
          { id: "c", letter: "c", title: "M.C. Mehta v. Union of India", desc: "Absolute liability in hazardous industries.", meta: "(1987) 1 SCC 395" },
          { id: "d", letter: "D", title: "Rylands v. Fletcher", desc: "Strict liability for escape of dangerous things.", meta: "[1868] UKHL 1" },
        ],
        correct_option_id: "a",
      },
      {
        kind: "order",
        label: "Arguments (Drag)",
        prompt: "Order the plaintiff's arguments from strongest opening to closing.",
        blocks: [
          { id: "b1", text: "QuickMart owed Priya a duty of care as a business invitee on its premises." },
          { id: "b2", text: "QuickMart breached that duty: the spill remained unmarked for 47 minutes, violating its own hourly-check SOP." },
          { id: "b3", text: "Causation is direct — the unmarked spill is the proximate cause of the fall and the fracture." },
          { id: "b4", text: "Damages are quantifiable: ₹2.4L medical + ₹1.6L lost wages, plus general damages for pain and suffering." },
          { id: "b5", text: "Therefore QuickMart is liable for the full quantum of damages claimed." },
        ],
        correct_order: ["b1", "b2", "b3", "b4", "b5"],
      },
      {
        kind: "mcq",
        label: "Rebuttal",
        prompt: "Anticipate QuickMart's strongest defence and pick the best rebuttal.",
        options: [
          { id: "a", letter: "A", title: "Volenti non fit injuria", desc: "Plaintiff was wearing slippery shoes — no consent to risk shown.", meta: "Defence rebuttal" },
          { id: "b", letter: "B", title: "Contributory negligence", desc: "Priya was looking at her phone — but CCTV shows she was not; rebut with footage.", meta: "Defence rebuttal" },
          { id: "c", letter: "C", title: "Act of stranger", desc: "Spill caused by another customer — irrelevant; duty to inspect persists.", meta: "Defence rebuttal" },
          { id: "d", letter: "D", title: "All of B and C", desc: "Both contributory negligence and act-of-stranger fail on the facts.", meta: "Combined rebuttal" },
        ],
        correct_option_id: "d",
      },
    ],
  },
  explanation:
    "Occupier's liability flows from common-law negligence (duty/breach/causation/damages). Klaus Mittelbachert is the leading Indian authority. The argument chain must establish duty before breach, then causation, then damages. Both contributory negligence and act-of-stranger defences fail given the 47-minute SOP breach.",
};

const ETHICS_SAMPLE = {
  title: "Ethics — Environmental Disclosure",
  difficulty: "hard" as const,
  area: "Environmental",
  points: 25,
  prompt:
    "You represent a publicly-listed manufacturing client. During a routine document review, you discover internal memos showing the client knowingly under-reported effluent discharge for the past 18 months. The client tells you to keep the memos out of the upcoming regulatory filing.",
  payload: {
    scenario:
      "You represent a publicly-listed manufacturing client. During a routine document review, you discover internal memos showing the client knowingly under-reported effluent discharge for the past 18 months. The client tells you to keep the memos out of the upcoming regulatory filing.",
    decision_options: [
      { id: "a", letter: "A", text: "Comply with the client's instruction — confidentiality under BCI Rules requires you to protect the client." },
      { id: "b", letter: "B", text: "Refuse to file the regulatory document and immediately report the client to the Pollution Control Board." },
      { id: "c", letter: "C", text: "Counsel the client in writing that filing a misleading document would itself be an offence; refuse to assist; advise voluntary disclosure." },
      { id: "d", letter: "D", text: "Resign the engagement quietly without explanation." },
    ],
    correct_decision_id: "c",
    consequence_text:
      "You send a written advisory to the client. They push back hard, citing share-price impact, and threaten to terminate the engagement. They also remind you that BCI Rule 49 obliges you to protect their secrets.",
    followup_options: [
      { id: "a", letter: "A", text: "Withdraw the advisory and proceed with the filing — client's commercial concerns outweigh regulatory risk." },
      { id: "b", letter: "B", text: "Hold firm: confidentiality does not extend to assisting an ongoing or future fraud. Decline to assist with the filing and document your refusal." },
      { id: "c", letter: "C", text: "Anonymously tip off the regulator while staying on the engagement." },
      { id: "d", letter: "D", text: "Settle for a partial disclosure that hides the worst memos but mentions the discrepancy." },
    ],
    correct_followup_id: "b",
    model_reasoning:
      "BCI Rule 49 confidentiality is bounded by the crime-fraud exception: a lawyer cannot assist a client in committing a future fraud or in concealing an ongoing offence. The right path is written counsel + refusal to assist with the misleading filing, while preserving the privilege over past-act discussions. Anonymous tipping breaches duty; outright reporting jumps the gun before counselling.",
  },
  explanation:
    "Stage 1 — counsel and refuse rather than report or comply blindly. Stage 2 — when pressured, hold firm: the crime-fraud exception overrides confidentiality for prospective wrongdoing.",
};

const COUNSELING_SAMPLE = {
  title: "Client Counseling — Srinivasan (Labour / Retaliation)",
  difficulty: "medium" as const,
  area: "Labour",
  points: 35,
  prompt:
    "Mr. Srinivasan, a 12-year employee at a mid-size IT firm, walks into your office. He says he was demoted two weeks after filing an internal sexual-harassment complaint against his manager. He's asking what to do.",
  payload: {
    matter: "Srinivasan — Labour / Retaliation",
    transcript: [
      { turn: 1, role: "client" as const, text: "I filed a POSH complaint against my manager four weeks ago. Last week HR moved me to a back-office role with the same pay but no team. They're saying it's a 'restructuring'." },
      { turn: 2, role: "client" as const, text: "I have emails from HR over the last two years praising my work. Performance reviews are all top-quartile." },
      { turn: 3, role: "client" as const, text: "I don't want to lose my job. I just want the role back. I'm not sure if I should escalate or settle quietly." },
      { turn: 4, role: "client" as const, text: "What about the company's internal grievance redressal? Should I exhaust that first?" },
      { turn: 5, role: "client" as const, text: "If I file a formal complaint outside the company, will my career in this industry be over?" },
    ],
    decision_turns: [
      {
        turn: 1,
        prompt: "Open the consultation — what is your first move?",
        options: [
          { id: "a", letter: "A", text: "Tell him to immediately resign and sue for constructive dismissal." },
          { id: "b", letter: "B", text: "Ask permission to record key facts; confirm timeline (POSH complaint date, demotion date, who he reported to)." },
          { id: "c", letter: "C", text: "Reassure him this is clearly retaliation — he'll win." },
          { id: "d", letter: "D", text: "Refer him to a senior partner without taking notes." },
        ],
        correct_option_id: "b",
        model_followup: "Anchor the timeline before the legal theory. Retaliation cases live or die on dates and documents.",
      },
      {
        turn: 2,
        prompt: "He just shared positive performance reviews. What do you do with that?",
        options: [
          { id: "a", letter: "A", text: "Note that the reviews undercut any performance-based justification for demotion; ask him to email the full set." },
          { id: "b", letter: "B", text: "Ignore — performance reviews are not relevant to retaliation." },
          { id: "c", letter: "C", text: "Suggest he leak them on LinkedIn." },
          { id: "d", letter: "D", text: "Tell him to delete them — they may be company property." },
        ],
        correct_option_id: "a",
        model_followup: "Strong contemporaneous performance evidence is the single best rebuttal to a 'restructuring' defence.",
      },
      {
        turn: 3,
        prompt: "He wants the role back, not money. Frame the strategy.",
        options: [
          { id: "a", letter: "A", text: "Push for litigation immediately — only a court order will restore the role." },
          { id: "b", letter: "B", text: "Explain a tiered approach: (i) preserve evidence, (ii) formal written complaint to ICC + HR head asking for reinstatement, (iii) escalate to Labour Commissioner / writ if needed." },
          { id: "c", letter: "C", text: "Recommend silent settlement with an NDA." },
          { id: "d", letter: "D", text: "Tell him to quit and find a new job — easier than fighting." },
        ],
        correct_option_id: "b",
        model_followup: "Tiered escalation matches the client's stated objective and preserves the litigation path if internal routes fail.",
      },
      {
        turn: 4,
        prompt: "On exhausting internal grievance redressal first.",
        options: [
          { id: "a", letter: "A", text: "Yes — courts disfavour parties who skip internal mechanisms; document every step." },
          { id: "b", letter: "B", text: "No — internal mechanisms are biased; go straight to the Labour Commissioner." },
          { id: "c", letter: "C", text: "Skip everything and file a writ in the High Court." },
          { id: "d", letter: "D", text: "It does not matter; the outcome is identical." },
        ],
        correct_option_id: "a",
        model_followup: "Exhausting alternative remedies is both procedurally required for many forums and strategically useful evidence of good faith.",
      },
      {
        turn: 5,
        prompt: "Address the career-impact concern honestly.",
        options: [
          { id: "a", letter: "A", text: "Promise his career will not be affected." },
          { id: "b", letter: "B", text: "Acknowledge the risk is real but manageable; statutory protection against retaliation exists; document the trajectory; consider mediation as a bridge." },
          { id: "c", letter: "C", text: "Tell him there is no risk — POSH protects whistleblowers absolutely." },
          { id: "d", letter: "D", text: "Refuse to discuss reputational risk — that is a personal matter." },
        ],
        correct_option_id: "b",
        model_followup: "Honesty about risk + a concrete plan is what builds client trust and informed consent.",
      },
    ],
  },
  explanation:
    "Counselling priorities: gather facts before forming a theory, anchor positive evidence, frame remedies tiered to the client's actual goal (reinstatement, not money), respect procedural routes, and answer reputational concerns honestly with a plan.",
};

const DIFF_STYLES = {
  easy: "border-emerald-500/40 text-emerald-500",
  medium: "border-amber-500/40 text-amber-500",
  hard: "border-rose-500/40 text-rose-500",
} as const;

const DEMO_REPLIES: Record<string, Record<string, string>> = {
  mcq: {
    [STARTERS.why]:
      "You picked **(a) Right to a clean environment**, but that *is* a recognised facet of Article 21 — see *Subhash Kumar v. State of Bihar* (1991) and the *M.C. Mehta* line of cases.\n\nThe odd-one-out is **(c) free higher education for all adults**.",
    [STARTERS.cite]:
      "- **Maneka Gandhi v. Union of India**, (1978) 1 SCC 248\n- **Unni Krishnan v. State of A.P.**, (1993) 1 SCC 645",
    [STARTERS.hypo]:
      "A state government stops funding postgraduate seats. **Will an Article 21 challenge succeed?** Reason from *Unni Krishnan* and Article 21A's textual ceiling at age 14.",
  },
  issue_spotter: {
    [STARTERS.why]:
      "You flagged **specific performance** as a live issue — but a minor's contract is **void *ab initio*** under *Mohori Bibee*. There's no contract to enforce.",
    [STARTERS.cite]:
      "- **Mohori Bibee v. Dharmodas Ghose**, (1903) ILR 30 Cal 539 (PC)\n- **Khan Gul v. Lakha Singh**, AIR 1928 Lah 609",
    [STARTERS.hypo]:
      "A 16-year-old buys a laptop on EMI from a dealer who knows her age. She defaults. **Can the dealer recover the laptop or sue for the balance?**",
  },
  jurisdiction: {
    [STARTERS.why]:
      "Section 20 CPC gives the plaintiff a *choice* between (i) defendant's residence/business, and (ii) where the cause of action arose **wholly or in part**. So the answer is **(b)**.",
    [STARTERS.cite]:
      "- **A.B.C. Laminart v. A.P. Agencies**, (1989) 2 SCC 163\n- **Patel Roadways v. Prasad Trading**, (1991) 4 SCC 270",
    [STARTERS.hypo]:
      "Delhi buyer, Pune seller, online contract, Bengaluru bank, Kolkata shipment. **List every court with jurisdiction under S.20 CPC.**",
  },
  speed_round: {
    [STARTERS.why]:
      "You missed **Q2** (BNS **§105** — culpable homicide not amounting to murder) and **Q5** (BNS **§316** — criminal breach of trust).",
    [STARTERS.cite]:
      "- **Reg v. Govinda**, (1876) ILR 1 Bom 342\n- **State of A.P. v. Rayavarapu Punnayya**, (1976) 4 SCC 382",
    [STARTERS.hypo]:
      "A bank manager moves client deposits into his personal account to cover a margin call, intending to repay the next day. **§316 or §303?**",
  },
  document_review: {
    [STARTERS.why]:
      "You missed Clause 2 (the seven-year non-compete). It's a textbook **restraint of trade under S.27 ICA** — void unless saved by S.27's narrow sale-of-goodwill exception, which doesn't apply here.",
    [STARTERS.cite]:
      "- **Niranjan Shankar Golikari v. Century Spinning**, AIR 1967 SC 1098 — limits on post-employment restraints.\n- **Superintendence Co. v. Krishan Murgai**, (1981) 2 SCC 246 — S.27 strictness.",
    [STARTERS.hypo]:
      "Same NDA but Clause 2 says **\"6 months in Bengaluru only\"**. **Still void under S.27?** Walk through Niranjan Golikari.",
  },
  brief_builder: {
    [STARTERS.why]:
      "Your argument order is close — but in occupier's-liability briefs, **duty must be established before breach**. Switching b1 and b2 weakens the chain because breach presupposes a duty.",
    [STARTERS.cite]:
      "- **Klaus Mittelbachert v. East India Hotels**, AIR 1997 Del 201 — leading Indian authority on occupier's liability.\n- **Donoghue v. Stevenson**, [1932] AC 562 — foundational duty-of-care doctrine.",
    [STARTERS.hypo]:
      "Same facts, but the spill was **9 minutes** old, not 47. **Does the brief survive?** Reason from the SOP and the foreseeability standard in Klaus.",
  },
  ethics: {
    [STARTERS.why]:
      "Stage 1: counsel + refuse, don't report yet — reporting first breaches confidentiality. Stage 2: under pressure, **the crime-fraud exception** overrides BCI Rule 49 for *future* wrongdoing. So (b) — hold firm and document.",
    [STARTERS.cite]:
      "- **BCI Rules**, Part VI, Chapter II, Rule 49 — duty of confidentiality.\n- **R v. Cox & Railton** (1884) 14 QBD 153 — classic crime-fraud exception (persuasive).\n- **Indian Evidence Act, S. 126(1)** — privilege does not extend to communications in furtherance of an illegal purpose.",
    [STARTERS.hypo]:
      "Same facts, but the under-reporting is **historical** (filings are now accurate). **Does the analysis change?** Distinguish ongoing from completed wrongdoing.",
  },
  client_counseling: {
    [STARTERS.why]:
      "On Turn 1 you reassured before gathering facts. Counselling order matters: **dates and documents first, theory second.** That's why (b) — the timeline anchor — beats (c) — the early reassurance.",
    [STARTERS.cite]:
      "- **POSH Act, 2013, S. 19(g)** — employer's duty to protect complainants from retaliation.\n- **Vishaka v. State of Rajasthan**, (1997) 6 SCC 241 — foundational protection framework.",
    [STARTERS.hypo]:
      "Mr. S is a **contract** worker, not a permanent employee, and his contract is up for renewal in 30 days. **How does the strategy shift?** Consider POSH coverage of contract workers and the renewal leverage.",
  },
};

const DEMO_GREETINGS: Record<string, string> = {
  mcq: "The correct answer is **(c)** — free higher education for all adults isn't a recognised facet of Article 21.",
  issue_spotter: "The live issues are capacity, fraud, bona-fide purchaser, and restitution — *not* specific performance or frustration.",
  jurisdiction: "Under S.20 CPC the plaintiff has a choice across all four cities — answer **(b)**.",
  speed_round: "You got 3/5. The two misses (§105 and §316) sit close to common look-alikes.",
  document_review: "You flagged 3 of 4 — Clause 2 (the 7-year non-compete) is the big miss. Want to walk through S.27 ICA?",
  brief_builder: "Your structure is mostly right, but the duty/breach order matters in Klaus-style briefs. Want me to walk it?",
  ethics: "You picked the right Stage-1 call (counsel + refuse). Stage 2 is where most candidates flinch. Want to drill the crime-fraud exception?",
  client_counseling: "You hit 4/5 turns. Turn 1 is the one to revisit — counselling order matters as much as the answer.",
};

function PreviewShell({
  type,
  sample,
  children,
}: {
  type: string;
  sample: { title: string; difficulty: "easy" | "medium" | "hard"; area: string; points: number; prompt: string; explanation?: string };
  children: (mode: "answer" | "review") => React.ReactNode;
}) {
  const [mode, setMode] = useState<"answer" | "review">("answer");
  const label = QUESTION_TYPE_LABELS[type as keyof typeof QUESTION_TYPE_LABELS] ?? type;
  const premium = isPremiumType(type);

  return (
    <Card
      className={`border-2 border-border p-6 space-y-5 ${premium ? "locus-plus bg-[hsl(var(--premium-bg))]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{label}</Badge>
          <Badge variant="outline" className={`text-xs capitalize ${DIFF_STYLES[sample.difficulty]}`}>
            {sample.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs">{sample.area}</Badge>
          <Badge variant="outline" className="text-xs text-accent border-accent/40">
            {sample.points} pts
          </Badge>
          {premium && <PremiumBadge size="sm" />}
        </div>
        <div className="flex gap-1 rounded-md border-2 border-border p-1">
          <Button size="sm" variant={mode === "answer" ? "default" : "ghost"} onClick={() => setMode("answer")} className="gap-1.5 h-7 px-2.5 text-xs">
            <Eye size={12} /> Answer
          </Button>
          <Button size="sm" variant={mode === "review" ? "default" : "ghost"} onClick={() => setMode("review")} className="gap-1.5 h-7 px-2.5 text-xs">
            <CheckCircle2 size={12} /> Review
          </Button>
        </div>
      </div>

      <div>
        <h2
          className={
            premium
              ? "text-2xl md:text-3xl mb-2 text-[hsl(var(--premium-ink))] tracking-tight"
              : "text-xl font-extrabold font-heading mb-2"
          }
          style={premium ? { fontFamily: "'Instrument Serif', serif" } : undefined}
        >
          {sample.title}
        </h2>
        <p className={`text-sm leading-relaxed ${premium ? "text-[hsl(var(--premium-muted))]" : "text-foreground"}`}>
          {sample.prompt}
        </p>
      </div>

      <div className={`pt-2 ${premium ? "border-t border-[hsl(var(--premium-border))]" : "border-t border-border"}`}>
        {children(mode)}
      </div>

      {mode === "review" && sample.explanation && (
        <div
          className={
            premium
              ? "p-4 bg-white border border-[hsl(var(--premium-border))] rounded-lg"
              : "p-4 bg-accent/5 border-2 border-accent/30 rounded-lg"
          }
        >
          <div
            className={
              premium
                ? "text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--premium-muted))] font-medium mb-1"
                : "text-xs uppercase tracking-wider text-accent font-bold mb-1"
            }
          >
            Explanation
          </div>
          <p className={`text-sm leading-relaxed ${premium ? "text-[hsl(var(--premium-ink))]" : "text-foreground"}`}>
            {sample.explanation}
          </p>
        </div>
      )}

      {mode === "review" && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground italic">
            Demo mode — replies are canned. The real tutor uses your actual attempt.
          </p>
          <RitChatPanel
            demoMode
            attemptId="preview"
            challenge={{ title: sample.title, question_type: type as any }}
            greeting={DEMO_GREETINGS[type] ?? ""}
            demoReplies={DEMO_REPLIES[type] ?? {}}
          />
        </div>
      )}
    </Card>
  );
}

function McqPreview() {
  const s = SAMPLES.mcq;
  const [val, setVal] = useState("");
  return (
    <PreviewShell type="mcq" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <McqRenderer mode="answer" payload={s.payload} value={val} onChange={setVal} />
        ) : (
          <McqRenderer mode="review" payload={s.payload} submittedId="a" correctId={s.correctId} />
        )
      }
    </PreviewShell>
  );
}

function IssueSpotterPreview() {
  const s = SAMPLES.issue_spotter;
  const [sel, setSel] = useState<string[]>([]);
  return (
    <PreviewShell type="issue_spotter" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <IssueSpotterRenderer mode="answer" payload={s.payload} selected={sel} onChange={setSel} />
        ) : (
          <IssueSpotterRenderer mode="review" payload={s.payload} submittedIds={["i1", "i2", "i3"]} correctIds={s.correctIds as unknown as string[]} />
        )
      }
    </PreviewShell>
  );
}

function JurisdictionPreview() {
  const s = SAMPLES.jurisdiction;
  const [val, setVal] = useState("");
  return (
    <PreviewShell type="jurisdiction" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <JurisdictionRenderer mode="answer" payload={s.payload} value={val} onChange={setVal} />
        ) : (
          <JurisdictionRenderer mode="review" payload={s.payload} submittedId="d" correctId={s.correctId} />
        )
      }
    </PreviewShell>
  );
}

function SpeedRoundPreview() {
  const s = SAMPLES.speed_round;
  const [done, setDone] = useState(false);
  return (
    <PreviewShell type="speed_round" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          done ? (
            <div className="p-6 text-center border-2 border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Demo round complete. Switch to <strong>Review</strong> to see results.
              </p>
              <Button size="sm" variant="outline" onClick={() => setDone(false)}>Reset demo</Button>
            </div>
          ) : (
            <SpeedRoundRenderer mode="answer" payload={s.payload} onComplete={() => setDone(true)} />
          )
        ) : (
          <SpeedRoundRenderer
            mode="review"
            perQuestion={s.payload.questions.map((q, i) => ({
              id: q.id,
              prompt: q.prompt,
              submitted: i === 1 ? "104" : i === 4 ? "" : q.answer,
              correct: q.answer,
              got_right: i !== 1 && i !== 4,
            }))}
          />
        )
      }
    </PreviewShell>
  );
}

function DocReviewPreview() {
  const s = DOC_REVIEW_SAMPLE;
  const [val, setVal] = useState<DocReviewAnswerState>({ flagged: [] });
  return (
    <PreviewShell type="document_review" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <PremiumDocumentReview mode="answer" payload={s.payload} value={val} onChange={setVal} />
        ) : (
          <PremiumDocumentReview
            mode="review"
            payload={s.payload}
            submitted={{
              flagged: [
                { span_id: "s1", category_id: "c1" },
                { span_id: "s3", category_id: "c3" },
                { span_id: "s4", category_id: "c4" },
              ],
            }}
            correct_flags={s.payload.correct_flags}
          />
        )
      }
    </PreviewShell>
  );
}

function BriefBuilderPreview() {
  const s = BRIEF_SAMPLE;
  const [val, setVal] = useState<BriefAnswerState>({ step_answers: [] });
  const [step, setStep] = useState(0);
  const isLast = step === s.payload.steps.length - 1;
  return (
    <PreviewShell type="brief_builder" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <div className="space-y-3">
            <PremiumBriefBuilder mode="answer" payload={s.payload} currentStep={step} value={val} onChange={setVal} onAdvance={() => !isLast && setStep(step + 1)} />
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Prev step</Button>
              <span className="text-xs text-[hsl(var(--premium-muted))]">Step {step + 1} of {s.payload.steps.length}</span>
              <Button size="sm" variant="default" disabled={isLast} onClick={() => setStep(step + 1)}>Next step →</Button>
            </div>
          </div>
        ) : (
          <PremiumBriefBuilder
            mode="review"
            payload={s.payload}
            currentStep={s.payload.steps.length - 1}
            submitted={{
              step_answers: [
                { step_index: 0, selected_option_id: "c" },
                { step_index: 1, selected_option_id: "a" },
                { step_index: 2, ordered_block_ids: ["b2", "b1", "b3", "b4", "b5"] },
                { step_index: 3, selected_option_id: "d" },
              ],
            }}
          />
        )
      }
    </PreviewShell>
  );
}

function EthicsPreview() {
  const s = ETHICS_SAMPLE;
  const [val, setVal] = useState<Partial<EthicsAnswerState>>({});
  const [stage, setStage] = useState<EthicsStage>("decision");
  return (
    <PreviewShell type="ethics" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <div className="space-y-3">
            <PremiumEthics mode="answer" payload={s.payload} stage={stage} value={val} onChange={setVal} />
            <div className="flex items-center justify-end gap-2">
              {stage === "decision" && (
                <Button size="sm" disabled={!val.selected_decision_id} onClick={() => setStage("consequence")}>
                  Continue to consequence →
                </Button>
              )}
              {stage === "consequence" && (
                <Button size="sm" variant="outline" onClick={() => setStage("decision")}>← Back to decision</Button>
              )}
            </div>
          </div>
        ) : (
          <PremiumEthics
            mode="review"
            payload={s.payload}
            stage="reveal"
            submitted={{ selected_decision_id: "c", selected_followup_id: "a" }}
          />
        )
      }
    </PreviewShell>
  );
}

function ClientCounselingPreview() {
  const s = COUNSELING_SAMPLE;
  const [val, setVal] = useState<CounselingAnswerState>({ turn_picks: [] });
  const [turn, setTurn] = useState(1);
  const total = s.payload.decision_turns.length;
  return (
    <PreviewShell type="client_counseling" sample={s}>
      {(mode) =>
        mode === "answer" ? (
          <div className="space-y-3">
            <PremiumClientCounseling mode="answer" payload={s.payload} currentTurn={turn} value={val} onChange={setVal} />
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" disabled={turn === 1} onClick={() => setTurn(turn - 1)}>← Prev turn</Button>
              <span className="text-xs text-[hsl(var(--premium-muted))]">Turn {turn} of {total}</span>
              <Button size="sm" variant="default" disabled={turn >= total} onClick={() => setTurn(turn + 1)}>Next turn →</Button>
            </div>
          </div>
        ) : (
          <PremiumClientCounseling
            mode="review"
            payload={s.payload}
            submitted={{
              turn_picks: [
                { turn: 1, selected_option_id: "c" },
                { turn: 2, selected_option_id: "a" },
                { turn: 3, selected_option_id: "b" },
                { turn: 4, selected_option_id: "a" },
                { turn: 5, selected_option_id: "b" },
              ],
            }}
          />
        )
      }
    </PreviewShell>
  );
}

export default function TheBarPreview() {
  usePageMeta({
    title: "Question Type Preview — The Bar",
    description: "Preview every question format on The Bar: MCQ, Issue Spotter, Jurisdiction, Speed Round, Document Review, Brief Builder, Ethics, and Client Counseling.",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/the-bar" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back to The Bar
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold font-heading tracking-tight mb-3">
            Question Type <span className="text-accent">Preview</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            A live tour of every question format on The Bar. Toggle between{" "}
            <strong className="text-foreground">Answer</strong> and{" "}
            <strong className="text-foreground">Review</strong> modes to see how
            a student attempts each type — and how feedback is shown after submission.
          </p>
        </div>

        <Tabs defaultValue="mcq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto gap-1">
            <TabsTrigger value="mcq" className="text-[11px] md:text-xs py-2">MCQ</TabsTrigger>
            <TabsTrigger value="issue_spotter" className="text-[11px] md:text-xs py-2">Issues</TabsTrigger>
            <TabsTrigger value="jurisdiction" className="text-[11px] md:text-xs py-2">Jurisd.</TabsTrigger>
            <TabsTrigger value="speed_round" className="text-[11px] md:text-xs py-2">Speed</TabsTrigger>
            <TabsTrigger value="document_review" className="text-[11px] md:text-xs py-2">Doc Rev.</TabsTrigger>
            <TabsTrigger value="brief_builder" className="text-[11px] md:text-xs py-2">Brief</TabsTrigger>
            <TabsTrigger value="ethics" className="text-[11px] md:text-xs py-2">Ethics</TabsTrigger>
            <TabsTrigger value="client_counseling" className="text-[11px] md:text-xs py-2">Counsel</TabsTrigger>
          </TabsList>

          <TabsContent value="mcq"><McqPreview /></TabsContent>
          <TabsContent value="issue_spotter"><IssueSpotterPreview /></TabsContent>
          <TabsContent value="jurisdiction"><JurisdictionPreview /></TabsContent>
          <TabsContent value="speed_round"><SpeedRoundPreview /></TabsContent>
          <TabsContent value="document_review"><DocReviewPreview /></TabsContent>
          <TabsContent value="brief_builder"><BriefBuilderPreview /></TabsContent>
          <TabsContent value="ethics"><EthicsPreview /></TabsContent>
          <TabsContent value="client_counseling"><ClientCounselingPreview /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
