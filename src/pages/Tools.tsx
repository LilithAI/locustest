import { useState, useCallback } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFeatureVotes } from "@/hooks/useFeatureVotes";
import { FeatureVoteButton } from "@/components/FeatureVoteButton";
import { TOOL_CATALOG, type ToolType, type CategoryType } from "@/data/tools";
import { WATERMARK_DOC, shareOrCopy, withRef } from "@/lib/share";
import { ShareIconButton } from "@/components/ShareIconButton";

const TABS: { id: ToolType; num: string; label: string }[] = [
  { id: "nda", num: "01", label: "NDA Generator" },
  { id: "checklist", num: "02", label: "Data Protection Checklist" },
  { id: "dpa", num: "03", label: "DPA Template" },
  { id: "internship", num: "04", label: "Internship Agreement" },
  { id: "freelancer", num: "05", label: "Freelancer Contract" },
  { id: "tos", num: "06", label: "Terms of Service" },
];

const CATEGORIES: { id: CategoryType; label: string; count: number }[] = [
  { id: "All", label: "All Tools", count: 11 },
  { id: "Firms", label: "Firms & Chambers", count: 4 },
  { id: "Startups", label: "Startups & Founders", count: 3 },
  { id: "Creators", label: "Artists & Musicians", count: 2 },
  { id: "Students", label: "Students & Schools", count: 3 },
  { id: "SMBs", label: "Small Companies", count: 3 },
];

const JURISDICTIONS = [
  { label: "India — DPDPA 2023", active: true },
  { label: "EU — GDPR", active: true },
  { label: "Singapore — PDPA", active: true },
  { label: "Malaysia — PDPA 2010", active: true },
  { label: "Australia — Privacy Act", active: true },
  { label: "HK — PDPO", active: true },
  { label: "China — PIPL", active: false },
];

const ENTITY_TYPES = ["Private Limited", "Public Limited", "LLP", "Partnership", "Individual", "Foreign Company"];
const JURISDICTIONS_LIST = ["India", "Singapore", "Malaysia", "EU", "United Kingdom", "Australia", "Hong Kong", "UAE"];
const NDA_TYPES = ["Mutual", "One-Way (Disclosing → Receiving)"];
const DURATIONS = ["1 Year", "2 Years", "3 Years", "5 Years", "Indefinite"];
const GOV_LAWS = ["India (Indian Contract Act, 1872)", "Singapore (Contract Law)", "Malaysia (Contracts Act, 1950)", "England & Wales", "New York", "UAE (DIFC Law)"];
const DISPUTES = ["Arbitration (SIAC)", "Arbitration (ICC)", "Arbitration (LCIA)", "Courts of Governing Jurisdiction", "DIAC (Dubai)"];

const CL_TYPES = ["Law Firm", "Corporate Legal Department", "Legal Tech Startup", "Financial Institution", "Healthcare Provider", "E-commerce / Tech Company", "Educational Institution", "NGO / Non-Profit"];
const CL_JURS = [
  { value: "India (DPDPA 2023)", label: "India / DPDPA" },
  { value: "EU (GDPR)", label: "EU / GDPR" },
  { value: "Singapore (PDPA)", label: "SG / PDPA" },
  { value: "Malaysia (PDPA 2010)", label: "MY / PDPA" },
  { value: "Australia (Privacy Act 1988)", label: "AU / Privacy Act" },
  { value: "Hong Kong (PDPO)", label: "HK / PDPO" },
  { value: "China (PIPL)", label: "CN / PIPL" },
];
const CL_ACTIVITIES = ["Client data management (CRM, case files)", "Employee data processing (HR, payroll)", "Cross-border data transfers", "Third-party vendor data sharing", "Website analytics and cookies", "Cloud storage and SaaS tools", "All of the above"];
const CL_SENSITIVE = ["Yes — health, financial, biometric, or legal data", "Yes — employee or HR data", "No — general business data only", "Unsure"];
const CL_MATURITY = ["Starting from scratch — no policies in place", "Basic — privacy policy exists but no DPO / procedures", "Intermediate — some policies, partial implementation", "Advanced — looking for gaps and fine-tuning"];

const DPA_JURS = ["India", "EU / EEA", "Singapore", "Malaysia", "Australia", "United Kingdom", "Hong Kong"];
const DPA_XBORDER = ["No", "Yes — within APAC", "Yes — to EU/EEA", "Yes — to USA", "Yes — multiple regions"];
const DPA_SUBPROC = ["Yes — with prior written consent", "Yes — with notice only", "No — prohibited"];
const DPA_GOVLAW = ["India (DPDPA 2023 + IT Act)", "EU (GDPR)", "Singapore (PDPA)", "Malaysia (PDPA 2010)", "England & Wales", "Australia (Privacy Act)"];
const DPA_BREACH = ["72 hours (GDPR standard)", "Without undue delay", "24 hours", "48 hours", "As required by applicable law"];

const IA_CITIES = ["New Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"];
const IA_FIRM_TYPES = ["Law Firm (Partnership)", "Chamber of Advocates", "Corporate Legal Department", "LLP", "Solo Practitioner"];
const IA_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "LLM Student", "Recent Graduate"];
const IA_AREAS = ["General Litigation", "Corporate & M&A", "Intellectual Property", "Criminal Law", "Arbitration & Dispute Resolution", "Employment & Labour", "Real Estate & Property", "Tax Law", "Technology & Data Privacy", "Banking & Finance", "General / Mixed"];
const IA_STIPENDS = ["Unpaid (Academic Credit)", "₹5,000/month", "₹7,500/month", "₹10,000/month", "₹15,000/month", "₹20,000/month", "As mutually agreed"];
const IA_DAYS = ["Monday–Friday", "Monday–Saturday", "Flexible / Remote", "Hybrid (3 days/week)"];
const IA_CERTS = ["Yes — Internship Certificate issued", "Yes — Certificate + Letter of Recommendation", "No certificate"];

// Freelancer Contract
const FL_SERVICE_TYPES = ["Software Development", "Design / Creative", "Content & Copywriting", "Marketing / SEO", "Consulting / Advisory", "Photography / Videography", "Legal / Paralegal Services", "Other Professional Services"];
const FL_FEE_TYPES = ["Fixed Fee (lump sum)", "Hourly Rate", "Milestone-based payments", "Monthly Retainer"];
const FL_PAYMENT_TERMS = ["50% advance, 50% on delivery", "100% advance", "Net 15 days from invoice", "Net 30 days from invoice", "On milestone completion"];
const FL_IP_OWNERSHIP = ["Client owns all IP on full payment", "Freelancer retains IP, grants client a licence", "Joint ownership", "Work-for-hire (Client owns from creation)"];
const FL_LIABILITY = ["Capped at total fees paid", "Capped at 2x total fees paid", "No cap (unlimited)", "Mutually agreed cap"];
const FL_TERMINATION = ["7 days written notice", "14 days written notice", "30 days written notice", "Immediate on material breach"];
const FL_GOV_LAWS = ["India (Indian Contract Act, 1872)", "Singapore", "United Kingdom", "United States (Delaware)", "UAE (DIFC)", "Australia"];

// Terms of Service
const TOS_SERVICE_TYPES = ["SaaS Platform", "Mobile App", "E-commerce / Marketplace", "Content Platform / Media", "Fintech / Payments", "EdTech / Online Learning", "Social Network / Community", "Booking / Marketplace"];
const TOS_USER_TYPES = ["Consumers (B2C)", "Businesses (B2B)", "Both consumers and businesses"];
const TOS_AGE = ["13+ (with parental consent under 18)", "16+", "18+ only", "No age restriction"];
const TOS_PAYMENT = ["Free service", "One-time purchase", "Subscription (recurring)", "Freemium with paid tiers", "Marketplace (commission-based)"];
const TOS_REFUND = ["No refunds", "7-day refund window", "14-day refund window (EU consumer rights)", "30-day money-back guarantee", "Pro-rated for subscriptions"];
const TOS_UGC = ["Yes — users post content publicly", "Yes — users share content privately", "No user-generated content"];
const TOS_DISPUTE = ["Arbitration (binding)", "Courts of governing jurisdiction", "Mediation followed by arbitration"];
const TOS_GOV_LAWS = ["India (DPDPA 2023 + IT Act, 2000)", "EU (GDPR)", "United States (Delaware / California)", "United Kingdom", "Singapore", "Australia"];

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHTML(text: string) {
  const lines = text.split("\n");
  let html = '<div class="lt-doc-output">';
  for (const line of lines) {
    const t = line.trim();
    if (!t) { html += "<br/>"; continue; }
    const safe = escapeHTML(t);
    if (t === t.toUpperCase() && t.length > 4 && !t.includes(".") && !t.startsWith("(")) {
      html += `<h2>${safe}</h2>`;
    } else if (t.match(/^\d+\.\s+[A-Z]/) && !t.match(/^\d+\.\d+/)) {
      html += `<h3>${safe}</h3>`;
    } else if (t.startsWith("DISCLAIMER")) {
      html += `<p class="lt-disclaimer">${safe}</p>`;
    } else {
      html += `<p>${safe}</p>`;
    }
  }
  html += "</div>";
  return html;
}

interface ChecklistItem {
  text: string;
  risk: "high" | "med" | "low";
  checked: boolean;
}
interface ChecklistSection {
  title: string;
  description: string;
  items: ChecklistItem[];
}

function parseChecklist(text: string): ChecklistSection[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const sections: ChecklistSection[] = [];
  let current: ChecklistSection | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const riskMatch = t.match(/^\[RISK:(HIGH|MED|LOW)\]\s*(.+)/);
    if (riskMatch) {
      if (current) {
        current.items.push({ text: riskMatch[2], risk: riskMatch[1].toLowerCase() as "high" | "med" | "low", checked: false });
      }
    } else if (t === t.toUpperCase() && t.length > 5 && !t.startsWith("[")) {
      current = { title: t, description: "", items: [] };
      sections.push(current);
    } else if (current && current.items.length === 0 && !t.startsWith("[")) {
      current.description = t;
    }
  }
  return sections;
}

export default function Tools() {
  usePageMeta({ title: "Legal Tools", description: "Free legal document generators — NDA, DPA, internship agreements, and compliance checklists for Indian law.", path: "/tools" });
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("nda");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("All");
  const { voteCounts, hasVoted, toggleVote } = useFeatureVotes();
  const [loading, setLoading] = useState<Record<ToolType, boolean>>({ nda: false, checklist: false, dpa: false, internship: false, freelancer: false, tos: false });
  const [outputs, setOutputs] = useState<Record<ToolType, string>>({ nda: "", checklist: "", dpa: "", internship: "", freelancer: "", tos: "" });
  const [rawText, setRawText] = useState<Record<ToolType, string>>({ nda: "", checklist: "", dpa: "", internship: "", freelancer: "", tos: "" });
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);

  // NDA state
  const [ndaP1Name, setNdaP1Name] = useState("");
  const [ndaP1Type, setNdaP1Type] = useState(ENTITY_TYPES[0]);
  const [ndaP1Jur, setNdaP1Jur] = useState(JURISDICTIONS_LIST[0]);
  const [ndaP2Name, setNdaP2Name] = useState("");
  const [ndaP2Type, setNdaP2Type] = useState(ENTITY_TYPES[0]);
  const [ndaP2Jur, setNdaP2Jur] = useState(JURISDICTIONS_LIST[0]);
  const [ndaPurpose, setNdaPurpose] = useState("");
  const [ndaType, setNdaType] = useState(NDA_TYPES[0]);
  const [ndaDuration, setNdaDuration] = useState(DURATIONS[0]);
  const [ndaGovLaw, setNdaGovLaw] = useState(GOV_LAWS[0]);
  const [ndaDispute, setNdaDispute] = useState(DISPUTES[0]);
  const [ndaNotes, setNdaNotes] = useState("");

  // Checklist state
  const [clOrg, setClOrg] = useState("");
  const [clType, setClType] = useState(CL_TYPES[0]);
  const [clJurs, setClJurs] = useState<string[]>(["India (DPDPA 2023)", "EU (GDPR)"]);
  const [clActivity, setClActivity] = useState(CL_ACTIVITIES[0]);
  const [clSensitive, setClSensitive] = useState(CL_SENSITIVE[0]);
  const [clMaturity, setClMaturity] = useState(CL_MATURITY[0]);

  // DPA state
  const [dpaCtrlName, setDpaCtrlName] = useState("");
  const [dpaCtrlJur, setDpaCtrlJur] = useState(DPA_JURS[0]);
  const [dpaCtrlEmail, setDpaCtrlEmail] = useState("");
  const [dpaProcName, setDpaProcName] = useState("");
  const [dpaProcJur, setDpaProcJur] = useState(DPA_JURS[0]);
  const [dpaProcEmail, setDpaProcEmail] = useState("");
  const [dpaPurpose, setDpaPurpose] = useState("");
  const [dpaDataCats, setDpaDataCats] = useState("");
  const [dpaSubjects, setDpaSubjects] = useState("");
  const [dpaXborder, setDpaXborder] = useState(DPA_XBORDER[0]);
  const [dpaSubproc, setDpaSubproc] = useState(DPA_SUBPROC[0]);
  const [dpaGovLaw, setDpaGovLaw] = useState(DPA_GOVLAW[0]);
  const [dpaBreach, setDpaBreach] = useState(DPA_BREACH[0]);

  // Internship state
  const [iaFirm, setIaFirm] = useState("");
  const [iaCity, setIaCity] = useState(IA_CITIES[0]);
  const [iaFirmType, setIaFirmType] = useState(IA_FIRM_TYPES[0]);
  const [iaSupervisor, setIaSupervisor] = useState("");
  const [iaIntern, setIaIntern] = useState("");
  const [iaYear, setIaYear] = useState(IA_YEARS[0]);
  const [iaCollege, setIaCollege] = useState("");
  const [iaStart, setIaStart] = useState("");
  const [iaEnd, setIaEnd] = useState("");
  const [iaArea, setIaArea] = useState(IA_AREAS[0]);
  const [iaStipend, setIaStipend] = useState(IA_STIPENDS[0]);
  const [iaDays, setIaDays] = useState(IA_DAYS[0]);
  const [iaCert, setIaCert] = useState(IA_CERTS[0]);

  // Freelancer state
  const [flClientName, setFlClientName] = useState("");
  const [flClientType, setFlClientType] = useState(ENTITY_TYPES[0]);
  const [flFreelancerName, setFlFreelancerName] = useState("");
  const [flServiceType, setFlServiceType] = useState(FL_SERVICE_TYPES[0]);
  const [flScope, setFlScope] = useState("");
  const [flDeliverables, setFlDeliverables] = useState("");
  const [flStart, setFlStart] = useState("");
  const [flEnd, setFlEnd] = useState("");
  const [flFeeType, setFlFeeType] = useState(FL_FEE_TYPES[0]);
  const [flFeeAmount, setFlFeeAmount] = useState("");
  const [flPaymentTerms, setFlPaymentTerms] = useState(FL_PAYMENT_TERMS[0]);
  const [flIp, setFlIp] = useState(FL_IP_OWNERSHIP[0]);
  const [flLiability, setFlLiability] = useState(FL_LIABILITY[0]);
  const [flTermination, setFlTermination] = useState(FL_TERMINATION[2]);
  const [flGovLaw, setFlGovLaw] = useState(FL_GOV_LAWS[0]);
  const [flNotes, setFlNotes] = useState("");

  // ToS state
  const [tosCompany, setTosCompany] = useState("");
  const [tosWebsite, setTosWebsite] = useState("");
  const [tosServiceType, setTosServiceType] = useState(TOS_SERVICE_TYPES[0]);
  const [tosDescription, setTosDescription] = useState("");
  const [tosUserType, setTosUserType] = useState(TOS_USER_TYPES[0]);
  const [tosAge, setTosAge] = useState(TOS_AGE[2]);
  const [tosPayment, setTosPayment] = useState(TOS_PAYMENT[0]);
  const [tosRefund, setTosRefund] = useState(TOS_REFUND[0]);
  const [tosUgc, setTosUgc] = useState(TOS_UGC[2]);
  const [tosDispute, setTosDispute] = useState(TOS_DISPUTE[0]);
  const [tosGovLaw, setTosGovLaw] = useState(TOS_GOV_LAWS[0]);
  const [tosCompliance, setTosCompliance] = useState<string[]>(["DPDPA 2023"]);
  const [tosNotes, setTosNotes] = useState("");

  const callAI = useCallback(async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("chat-legal", {
      body: { prompt },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.text || "Error generating document.";
  }, []);

  const generate = useCallback(async (tool: ToolType, prompt: string) => {
    setLoading((p) => ({ ...p, [tool]: true }));
    try {
      const text = await callAI(prompt);
      setRawText((p) => ({ ...p, [tool]: text }));
      if (tool === "checklist") {
        setChecklistSections(parseChecklist(text));
      } else {
        setOutputs((p) => ({ ...p, [tool]: textToHTML(text) }));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate document");
    } finally {
      setLoading((p) => ({ ...p, [tool]: false }));
    }
  }, [callAI]);

  const generateNDA = () => {
    const prompt = `Draft a complete and professional ${ndaType} Non-Disclosure Agreement with the following details:

DISCLOSING PARTY: ${ndaP1Name || "Party A"} (${ndaP1Type}, incorporated/registered in ${ndaP1Jur})
RECEIVING PARTY: ${ndaP2Name || "Party B"} (${ndaP2Type}, incorporated/registered in ${ndaP2Jur})
PURPOSE: ${ndaPurpose || "evaluation of a potential business partnership"}
NDA TYPE: ${ndaType}
DURATION OF CONFIDENTIALITY OBLIGATIONS: ${ndaDuration}
GOVERNING LAW: ${ndaGovLaw}
DISPUTE RESOLUTION: ${ndaDispute}
${ndaNotes ? `SPECIAL INSTRUCTIONS: ${ndaNotes}` : ""}

Include the following sections: Parties, Recitals, Definitions (Confidential Information, Permitted Purpose, Representatives), Confidentiality Obligations, Exclusions from Confidential Information, Permitted Disclosures, Return/Destruction of Information, Term and Termination, Remedies, General Provisions (governing law, entire agreement, severability, waiver, notices), and Signature Block.

Make it jurisdiction-appropriate for the governing law specified. Include specific legal references where applicable.`;
    generate("nda", prompt);
  };

  const generateChecklist = () => {
    if (!clJurs.length) { toast.error("Please select at least one jurisdiction."); return; }
    const prompt = `Generate a comprehensive data protection compliance checklist for:

ORGANISATION: ${clOrg || "Your Organisation"}
TYPE: ${clType}
JURISDICTIONS: ${clJurs.join(", ")}
DATA PROCESSING ACTIVITIES: ${clActivity}
SENSITIVE DATA: ${clSensitive}
CURRENT MATURITY: ${clMaturity}

Format each section as:
SECTION NAME
[Brief description of why this section matters]

Then list checklist items in this exact format for each item:
[RISK:HIGH/MED/LOW] Checklist item description here.

Include sections for:
1. Legal Basis for Processing
2. Privacy Notices & Consent
3. Data Subject Rights
4. Data Retention & Deletion
5. Technical Security Measures
6. Organisational Measures & Policies
7. Third-Party & Vendor Management
8. Data Breach Response
9. Cross-Border Transfer Mechanisms
10. Regulatory Registration & DPO Requirements

Risk-rate each item: HIGH = regulatory penalty risk, MED = operational risk, LOW = good practice. Aim for 5-8 items per section.`;
    generate("checklist", prompt);
  };

  const generateDPA = () => {
    const prompt = `Draft a complete and professional Data Processing Addendum (DPA) with the following details:

DATA CONTROLLER: ${dpaCtrlName || "Data Controller"} (${dpaCtrlJur}) — Contact: ${dpaCtrlEmail || "to be specified"}
DATA PROCESSOR: ${dpaProcName || "Data Processor"} (${dpaProcJur}) — Contact: ${dpaProcEmail || "to be specified"}
NATURE AND PURPOSE OF PROCESSING: ${dpaPurpose || "cloud storage and data processing services"}
CATEGORIES OF PERSONAL DATA: ${dpaDataCats || "personal data as described in the agreement"}
CATEGORIES OF DATA SUBJECTS: ${dpaSubjects || "individuals as described by the controller"}
CROSS-BORDER TRANSFERS: ${dpaXborder}
SUB-PROCESSORS: ${dpaSubproc}
APPLICABLE LAW: ${dpaGovLaw}
BREACH NOTIFICATION TIMELINE: ${dpaBreach}

Include all standard DPA sections: Background/Recitals, Definitions, Subject Matter and Duration, Nature/Purpose/Categories of Processing, Controller's Obligations, Processor's Obligations, Sub-processing, Data Subject Rights Assistance, Security Measures, Data Breach Notification, Audit Rights, Return/Deletion of Data, Cross-Border Transfer Mechanisms, Liability, and Signature Block.

Make it jurisdiction-appropriate. Reference specific legal provisions where applicable.`;
    generate("dpa", prompt);
  };

  const generateInternship = () => {
    const dateStr = iaStart && iaEnd
      ? `from ${new Date(iaStart).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} to ${new Date(iaEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`
      : "for the agreed period";

    const prompt = `Draft a complete legal internship agreement under Indian law with the following details:

FIRM/ORGANISATION: ${iaFirm || "Law Firm"} (${iaFirmType}), ${iaCity}, India
SUPERVISING ADVOCATE/POC: ${iaSupervisor || "Supervising Advocate"}
INTERN: ${iaIntern || "Intern"}, ${iaYear}, ${iaCollege || "Law University"}
DURATION: ${dateStr}
PRACTICE AREA: ${iaArea}
STIPEND/REMUNERATION: ${iaStipend}
WORKING SCHEDULE: ${iaDays}
CERTIFICATE ON COMPLETION: ${iaCert}

Under Indian law (Indian Contract Act 1872, Advocates Act 1961, applicable Bar Council rules).

Include sections: Parties, Recitals, Term of Internship, Scope of Work, Supervision, Working Hours, Remuneration, Confidentiality, Intellectual Property, Code of Conduct, Compliance with Bar Council Rules, Social Media, Termination, Certificate of Completion, Indemnity, Governing Law and Jurisdiction (${iaCity}), General Provisions, and Signature Block.`;
    generate("internship", prompt);
  };

  const generateFreelancer = () => {
    const dateStr = flStart && flEnd
      ? `from ${new Date(flStart).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} to ${new Date(flEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`
      : flStart
      ? `commencing ${new Date(flStart).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} and continuing until services are completed`
      : "for the period mutually agreed by the parties";

    const prompt = `Draft a complete and professional Freelance Services Agreement with the following details:

CLIENT: ${flClientName || "Client"} (${flClientType})
FREELANCER / SERVICE PROVIDER: ${flFreelancerName || "Freelancer"} (Independent Contractor)
SERVICE TYPE: ${flServiceType}
SCOPE OF SERVICES: ${flScope || "as detailed in Schedule A / Statement of Work"}
DELIVERABLES: ${flDeliverables || "as mutually agreed and documented in writing"}
TERM: ${dateStr}
FEE STRUCTURE: ${flFeeType}${flFeeAmount ? ` — ${flFeeAmount}` : ""}
PAYMENT TERMS: ${flPaymentTerms}
INTELLECTUAL PROPERTY: ${flIp}
LIABILITY CAP: ${flLiability}
TERMINATION: ${flTermination}
GOVERNING LAW: ${flGovLaw}
${flNotes ? `SPECIAL TERMS: ${flNotes}` : ""}

Include the following sections in the agreement: Parties, Recitals, Definitions, Scope of Services, Deliverables and Acceptance, Term and Renewal, Fees and Payment Terms (including late payment interest, taxes such as GST/VAT where applicable, and invoicing), Independent Contractor Status (no employer-employee relationship), Intellectual Property Rights and Licences, Confidentiality and Non-Disclosure, Data Protection (referencing DPDPA 2023 / GDPR where applicable to the governing law), Warranties and Representations, Limitation of Liability, Indemnification, Termination and Effects of Termination, Force Majeure, Dispute Resolution, Governing Law and Jurisdiction, Notices, Assignment, Severability, Entire Agreement, Amendments, and Signature Block.

Make it jurisdiction-appropriate for the governing law specified. Include specific statutory references (e.g., Indian Contract Act 1872, Copyright Act 1957 for IP under Indian law) where applicable. Use enforceable, modern contract drafting language.`;
    generate("freelancer", prompt);
  };

  const generateTos = () => {
    const compliance = tosCompliance.length ? tosCompliance.join(", ") : "general data protection principles";
    const prompt = `Draft a complete and professional Terms of Service (Terms and Conditions) for a website / application with the following details:

COMPANY / SERVICE OWNER: ${tosCompany || "Company"}
WEBSITE / APP URL: ${tosWebsite || "[website URL]"}
SERVICE TYPE: ${tosServiceType}
SERVICE DESCRIPTION: ${tosDescription || "online platform providing the services described in the agreement"}
TARGET USERS: ${tosUserType}
MINIMUM AGE: ${tosAge}
PAYMENT MODEL: ${tosPayment}
REFUND POLICY: ${tosRefund}
USER-GENERATED CONTENT: ${tosUgc}
DISPUTE RESOLUTION: ${tosDispute}
GOVERNING LAW: ${tosGovLaw}
COMPLIANCE FRAMEWORKS: ${compliance}
${tosNotes ? `SPECIAL CLAUSES: ${tosNotes}` : ""}

Include the following sections: Acceptance of Terms, Definitions, Eligibility (including age and capacity), Account Registration and Security, Description of Services, User Conduct and Acceptable Use Policy, ${tosUgc.startsWith("Yes") ? "User-Generated Content (Licence Grant, Content Standards, Removal Rights, DMCA / takedown procedure)" : "Content Ownership"}, Payments, Pricing and Taxes, Refunds and Cancellations, Subscription Auto-Renewal (where applicable), Intellectual Property Rights, Third-Party Services and Links, Privacy and Data Protection (referencing the listed compliance frameworks), Cookies and Tracking, Disclaimers and Warranties, Limitation of Liability, Indemnification, Termination and Suspension of Accounts, Modifications to Service and Terms, Force Majeure, Dispute Resolution and Governing Law, Class Action Waiver (where enforceable), Severability, Entire Agreement, Contact Information, and Effective Date.

Make it jurisdiction-appropriate. Reference specific statutory provisions where applicable (e.g., DPDPA 2023, IT Act 2000 and Intermediary Guidelines 2021 for India; GDPR Articles for EU; Section 230 for US platforms). Use clear, plain-English drafting that remains legally enforceable.`;
    generate("tos", prompt);
  };


  const copyOutput = (tool: ToolType) => {
    const text = rawText[tool];
    if (!text) return;
    navigator.clipboard.writeText(text + WATERMARK_DOC).then(() => toast.success("Copied to clipboard!"));
  };

  const downloadOutput = (tool: ToolType) => {
    const text = rawText[tool];
    if (!text) return;
    const fname = { nda: "NDA_Agreement", checklist: "Data_Protection_Checklist", dpa: "Data_Processing_Addendum", internship: "Internship_Agreement", freelancer: "Freelancer_Contract", tos: "Terms_of_Service" }[tool];
    const blob = new Blob([text + WATERMARK_DOC], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fname}_Locus_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const toggleChecklistItem = (sIdx: number, iIdx: number) => {
    setChecklistSections((prev) =>
      prev.map((s, si) =>
        si === sIdx ? { ...s, items: s.items.map((it, ii) => (ii === iIdx ? { ...it, checked: !it.checked } : it)) } : s
      )
    );
  };

  const totalItems = checklistSections.reduce((a, s) => a + s.items.length, 0);
  const checkedItems = checklistSections.reduce((a, s) => a + s.items.filter((i) => i.checked).length, 0);
  const progressPct = totalItems ? Math.round((checkedItems / totalItems) * 100) : 0;

  const hasOutput = (tool: ToolType) => tool === "checklist" ? checklistSections.length > 0 : !!outputs[tool];

  const openTool = (tool: ToolType) => {
    setSelectedTool(tool);
    setActiveTool(tool);
  };

  return (
    <>
      <style>{`
        .lt-page { background: linear-gradient(180deg, hsl(0,0%,3%) 0%, hsl(40,8%,8%) 50%, hsl(0,0%,3%) 100%); min-height: 100vh; font-family: 'Inter', sans-serif; font-weight: 400; font-size: 14px; line-height: 1.65; color: hsl(0,0%,98%); }
        .lt-hero { padding: 120px 40px 56px; border-bottom: 3px solid hsl(0,0%,0%); position: relative; overflow: hidden; background: linear-gradient(135deg, hsl(0,0%,3%) 0%, hsl(40,10%,7%) 40%, hsl(0,0%,5%) 100%); }
        .lt-hero::before { content: ''; position: absolute; top: -100px; right: -100px; width: 600px; height: 600px; background: radial-gradient(circle, hsla(45,100%,51%,0.12) 0%, hsla(45,80%,40%,0.04) 40%, transparent 70%); pointer-events: none; }
        .lt-hero::after { content: ''; position: absolute; bottom: -80px; left: -80px; width: 400px; height: 400px; background: radial-gradient(circle, hsla(45,100%,51%,0.06) 0%, transparent 60%); pointer-events: none; }
        .lt-eyebrow { font-family: 'Sora', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.18em; color: hsl(45,100%,51%); text-transform: uppercase; margin-bottom: 20px; padding: 6px 16px; border: 2px solid hsl(45,100%,51%); display: inline-block; box-shadow: 3px 3px 0px 0px hsl(45,100%,51%); }
        .lt-hero h1 { font-family: 'Sora', sans-serif; font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 800; color: hsl(0,0%,98%); line-height: 1.1; margin-bottom: 18px; letter-spacing: -0.02em; }
        .lt-hero h1 em { font-style: normal; color: hsl(45,100%,51%); }
        .lt-hero p { color: hsl(0,0%,60%); max-width: 560px; font-size: 0.95rem; line-height: 1.7; }
        .lt-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
        .lt-pill { font-family: 'Sora', sans-serif; font-size: 0.6rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 5px 14px; border: 2px solid hsl(0,0%,18%); color: hsl(0,0%,60%); background: hsl(0,0%,8%); }
        .lt-pill.active { border-color: hsl(45,100%,51%); color: hsl(0,0%,0%); background: hsl(45,100%,51%); font-weight: 700; }

        /* Catalogue */
        .lt-catalogue { padding: 60px 40px 80px; max-width: 1100px; margin: 0 auto; position: relative; }
        .lt-catalogue::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 80%; height: 1px; background: linear-gradient(90deg, transparent, hsla(45,100%,51%,0.3), transparent); }
        .lt-catalogue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .lt-cat-card { background: linear-gradient(160deg, hsl(0,0%,10%) 0%, hsl(40,6%,8%) 50%, hsl(0,0%,6%) 100%); border: 2px solid hsl(0,0%,20%); padding: 32px 28px; cursor: pointer; transition: all 0.2s; position: relative; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
        .lt-cat-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 120px; height: 120px; background: radial-gradient(circle, hsla(0,0%,100%,0.04) 0%, transparent 70%); pointer-events: none; transition: all 0.3s; }
        .lt-cat-card:hover::before { width: 200px; height: 200px; background: radial-gradient(circle, hsla(45,100%,51%,0.12) 0%, transparent 70%); }
        .lt-cat-card:hover { border-color: hsl(45,100%,51%); transform: translate(-3px, -3px); box-shadow: 6px 6px 0px 0px hsl(45,100%,51%); }
        .lt-cat-card:active { transform: translate(1px, 1px); box-shadow: 2px 2px 0px 0px hsl(45,100%,51%); }
        .lt-cat-top { display: flex; align-items: center; justify-content: space-between; }
        .lt-cat-num { font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: hsl(0,0%,0%); padding: 5px 14px; border: none; background: hsl(0,0%,98%); }
        .lt-cat-title { font-family: 'Sora', sans-serif; font-size: 1.25rem; font-weight: 800; color: hsl(0,0%,100%); letter-spacing: -0.01em; }
        .lt-cat-desc { font-size: 0.85rem; color: hsl(0,0%,65%); line-height: 1.6; }
        .lt-cat-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
        .lt-cat-tag { font-family: 'Sora', sans-serif; font-size: 0.55rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border: 1px solid hsl(0,0%,30%); color: hsl(0,0%,70%); background: hsla(0,0%,100%,0.04); }
        .lt-cat-card:hover .lt-cat-tag { border-color: hsl(0,0%,45%); color: hsl(0,0%,85%); }
        .lt-cat-arrow { display: flex; align-items: center; gap: 6px; font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(45,100%,51%); margin-top: 8px; }
        .lt-cat-card:hover .lt-cat-arrow { text-decoration: underline; }

        /* Coming Soon */
        .lt-cat-card.coming-soon { opacity: 0.55; cursor: default; }
        .lt-cat-card.coming-soon:hover { border-color: hsl(0,0%,20%); transform: none; box-shadow: none; }
        .lt-cat-card.coming-soon:hover::before { width: 120px; height: 120px; background: radial-gradient(circle, hsla(0,0%,100%,0.04) 0%, transparent 70%); }
        .lt-cat-card.coming-soon:active { transform: none; box-shadow: none; }
        .lt-cat-card.coming-soon:hover .lt-cat-tag { border-color: hsl(0,0%,30%); color: hsl(0,0%,70%); }
        .lt-cat-card.coming-soon:hover .lt-cat-arrow { text-decoration: none; }
        .lt-coming-badge { position: absolute; top: 16px; right: 16px; font-family: 'Sora', sans-serif; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; background: hsl(45,100%,51%); color: hsl(0,0%,0%); }

        /* Back button */
        .lt-back { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; margin: 20px 40px 0; font-family: 'Sora', sans-serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: hsl(0,0%,60%); background: none; border: 2px solid hsl(0,0%,18%); cursor: pointer; transition: all 0.15s; }
        .lt-back:hover { border-color: hsl(45,100%,51%); color: hsl(45,100%,51%); box-shadow: 2px 2px 0px 0px hsl(45,100%,51%); }

        .lt-tabs { display: flex; border-bottom: 3px solid hsl(0,0%,0%); overflow-x: auto; scrollbar-width: none; background: hsl(0,0%,8%); }
        .lt-tab { flex-shrink: 0; padding: 16px 28px; font-family: 'Sora', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: hsl(0,0%,50%); background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; margin-bottom: -3px; }
        .lt-tab:hover { color: hsl(0,0%,98%); background: hsl(0,0%,12%); }
        .lt-tab.active { color: hsl(0,0%,0%); border-bottom-color: hsl(45,100%,51%); background: hsl(45,100%,51%); font-weight: 700; }
        .lt-tab-num { width: 20px; height: 20px; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; }
        .lt-layout { display: grid; grid-template-columns: 400px 1fr; min-height: calc(100vh - 210px); }
        .lt-form { padding: 36px 32px; border-right: 3px solid hsl(0,0%,0%); background: hsl(0,0%,8%); overflow-y: auto; }
        .lt-panel-title { font-family: 'Sora', sans-serif; font-size: 1.4rem; font-weight: 800; color: hsl(0,0%,98%); margin-bottom: 6px; }
        .lt-panel-desc { font-size: 0.82rem; color: hsl(0,0%,60%); margin-bottom: 28px; line-height: 1.6; }
        .lt-field { margin-bottom: 20px; }
        .lt-label { display: block; font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: hsl(0,0%,50%); margin-bottom: 7px; }
        .lt-input, .lt-select, .lt-textarea { width: 100%; background: hsl(0,0%,3%); border: 2px solid hsl(0,0%,18%); color: hsl(0,0%,98%); font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 400; padding: 10px 14px; outline: none; transition: all 0.2s; -webkit-appearance: none; }
        .lt-input:focus, .lt-select:focus, .lt-textarea:focus { border-color: hsl(45,100%,51%); box-shadow: 3px 3px 0px 0px hsl(45,100%,51%); }
        .lt-select option { background: hsl(0,0%,8%); }
        .lt-textarea { resize: vertical; min-height: 80px; line-height: 1.6; }
        .lt-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lt-divider { font-family: 'Sora', sans-serif; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: hsl(45,100%,51%); margin: 28px 0 16px; display: flex; align-items: center; gap: 12px; }
        .lt-divider::after { content: ''; flex: 1; height: 2px; background: hsl(0,0%,18%); }
        .lt-gen-btn { width: 100%; padding: 14px; background: hsl(45,100%,51%); color: hsl(0,0%,0%); font-family: 'Sora', sans-serif; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; border: 3px solid hsl(0,0%,0%); cursor: pointer; margin-top: 12px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 4px 4px 0px 0px hsl(0,0%,0%); }
        .lt-gen-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px hsl(0,0%,0%); }
        .lt-gen-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0px 0px hsl(0,0%,0%); }
        .lt-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 4px 4px 0px 0px hsl(0,0%,0%); }
        .lt-output { display: flex; flex-direction: column; background: hsl(0,0%,3%); }
        .lt-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 28px; border-bottom: 3px solid hsl(0,0%,0%); background: hsl(0,0%,8%); flex-shrink: 0; }
        .lt-out-label { font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: hsl(0,0%,50%); display: flex; align-items: center; gap: 8px; }
        .lt-dot { width: 8px; height: 8px; border: 2px solid hsl(0,0%,30%); }
        .lt-dot.ready { background: hsl(45,100%,51%); border-color: hsl(45,100%,51%); box-shadow: 0 0 8px hsl(45,100%,51%); }
        .lt-dot.loading { background: hsl(45,100%,51%); border-color: hsl(45,100%,51%); animation: lt-pulse 1s ease infinite; }
        @keyframes lt-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .lt-actions { display: flex; gap: 8px; }
        .lt-act-btn { padding: 7px 16px; font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; border: 2px solid hsl(0,0%,18%); background: none; color: hsl(0,0%,60%); }
        .lt-act-btn:hover { border-color: hsl(45,100%,51%); color: hsl(45,100%,51%); box-shadow: 2px 2px 0px 0px hsl(45,100%,51%); }
        .lt-act-btn.primary { background: hsl(45,100%,51%); border-color: hsl(0,0%,0%); color: hsl(0,0%,0%); font-weight: 700; box-shadow: 2px 2px 0px 0px hsl(0,0%,0%); }
        .lt-act-btn.primary:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0px 0px hsl(0,0%,0%); }
        .lt-act-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .lt-body { flex: 1; overflow-y: auto; padding: 40px 48px; }
        .lt-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: hsl(0,0%,40%); text-align: center; }
        .lt-placeholder .lt-big { font-size: 3.5rem; opacity: 0.25; }
        .lt-placeholder p { font-size: 0.85rem; max-width: 300px; line-height: 1.6; font-family: 'Sora', sans-serif; font-weight: 500; }
        .lt-spinner { width: 16px; height: 16px; border: 3px solid rgba(0,0,0,0.2); border-top-color: hsl(0,0%,0%); border-radius: 50%; animation: lt-spin 0.6s linear infinite; }
        @keyframes lt-spin { to { transform: rotate(360deg); } }
        .lt-streaming { display: inline-flex; align-items: center; gap: 8px; font-family: 'Sora', sans-serif; font-size: 0.72rem; font-weight: 600; color: hsl(45,100%,51%); text-transform: uppercase; letter-spacing: 0.1em; }
        .lt-streaming-dots span { animation: lt-blink 1.2s infinite; font-size: 1.4em; }
        .lt-streaming-dots span:nth-child(2) { animation-delay: 0.2s; }
        .lt-streaming-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes lt-blink { 0%,80%,100%{opacity:0.15} 40%{opacity:1} }
        .lt-doc-output { font-family: 'Inter', sans-serif; font-size: 0.88rem; line-height: 1.85; color: hsl(0,0%,80%); max-width: 740px; margin: 0 auto; }
        .lt-doc-output h2 { font-family: 'Sora', sans-serif; font-size: 1.1rem; font-weight: 800; color: hsl(0,0%,98%); margin: 32px 0 12px; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 2px solid hsl(45,100%,51%); }
        .lt-doc-output h3 { font-size: 0.85rem; font-weight: 700; color: hsl(45,100%,51%); margin: 20px 0 8px; font-family: 'Sora', sans-serif; letter-spacing: 0.03em; }
        .lt-doc-output p { margin-bottom: 12px; }
        .lt-doc-output ul { padding-left: 20px; margin-bottom: 14px; }
        .lt-doc-output li { margin-bottom: 6px; }
        .lt-doc-output strong { color: hsl(0,0%,98%); font-weight: 600; }
        .lt-disclaimer { margin-top: 36px; padding: 16px; border: 2px solid hsl(0,0%,18%); font-size: 0.75rem; color: hsl(0,0%,50%); font-style: italic; background: hsl(0,0%,8%); }
        .lt-cl-header { margin-bottom: 28px; padding: 20px 24px; background: hsl(0,0%,8%); border: 3px solid hsl(0,0%,0%); box-shadow: 4px 4px 0px 0px hsl(45,100%,51%); }
        .lt-cl-header h2 { font-family: 'Sora', sans-serif; font-size: 1.5rem; font-weight: 800; color: hsl(0,0%,98%); margin-bottom: 6px; }
        .lt-cl-meta { font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 600; color: hsl(45,100%,51%); letter-spacing: 0.1em; text-transform: uppercase; }
        .lt-progress-wrap { background: hsl(0,0%,12%); border: 2px solid hsl(0,0%,18%); height: 8px; overflow: hidden; margin-bottom: 6px; }
        .lt-progress-fill { height: 100%; background: hsl(45,100%,51%); transition: width 0.4s ease; }
        .lt-progress-label { font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 600; color: hsl(0,0%,50%); letter-spacing: 0.08em; margin-bottom: 24px; }
        .lt-cl-section { margin-bottom: 32px; }
        .lt-cl-title { font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 800; color: hsl(0,0%,98%); margin-bottom: 6px; display: flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
        .lt-cl-title::after { content: ''; flex: 1; height: 2px; background: hsl(0,0%,18%); }
        .lt-cl-sub { font-size: 0.78rem; color: hsl(0,0%,50%); margin-bottom: 14px; font-style: italic; }
        .lt-cl-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border: 2px solid hsl(0,0%,15%); margin-bottom: 8px; transition: all 0.15s; cursor: pointer; background: hsl(0,0%,5%); }
        .lt-cl-item:hover { border-color: hsl(0,0%,25%); transform: translate(-1px, -1px); box-shadow: 2px 2px 0px 0px hsl(0,0%,25%); }
        .lt-cl-item.checked { background: hsla(45,100%,51%,0.05); border-color: hsl(45,100%,51%); box-shadow: 2px 2px 0px 0px hsl(45,100%,51%); }
        .lt-cl-item.checked .lt-ci-text { color: hsl(0,0%,40%); text-decoration: line-through; }
        .lt-ci-box { width: 18px; height: 18px; min-width: 18px; border: 2px solid hsl(0,0%,25%); margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: hsl(45,100%,51%); transition: all 0.15s; }
        .lt-cl-item.checked .lt-ci-box { background: hsl(45,100%,51%); border-color: hsl(45,100%,51%); color: hsl(0,0%,0%); }
        .lt-ci-text { font-size: 0.82rem; line-height: 1.6; }
        .lt-ci-risk { margin-left: auto; font-family: 'Sora', sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 10px; white-space: nowrap; align-self: flex-start; margin-top: 2px; border: 2px solid; }
        .lt-ci-risk.high { color: hsl(0,84%,60%); border-color: hsl(0,84%,60%); background: hsla(0,84%,60%,0.08); }
        .lt-ci-risk.med { color: hsl(45,100%,51%); border-color: hsl(45,100%,51%); background: hsla(45,100%,51%,0.08); }
        .lt-ci-risk.low { color: hsl(145,50%,55%); border-color: hsl(145,50%,55%); background: hsla(145,50%,55%,0.08); }
        .lt-jur-check { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 500; padding: 7px 14px; border: 2px solid hsl(0,0%,18%); background: hsl(0,0%,5%); }
        .lt-jur-check:hover { border-color: hsl(45,100%,51%); }
        .lt-jur-check input { accent-color: hsl(45,100%,51%); }
        /* Category Filter */
        .lt-cat-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
        .lt-cat-chip { font-family: 'Sora', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 8px 18px; border: 2px solid hsl(0,0%,20%); color: hsl(0,0%,55%); background: hsl(0,0%,6%); cursor: pointer; transition: all 0.2s; }
        .lt-cat-chip:hover { border-color: hsl(0,0%,40%); color: hsl(0,0%,80%); }
        .lt-cat-chip.active { border-color: hsl(45,100%,51%); color: hsl(0,0%,0%); background: hsl(45,100%,51%); font-weight: 800; box-shadow: 3px 3px 0px 0px hsl(0,0%,0%); }
        .lt-cat-chip .lt-chip-count { margin-left: 6px; font-size: 0.55rem; opacity: 0.7; }

        @media (max-width: 900px) {
          .lt-layout { grid-template-columns: 1fr; }
          .lt-output { min-height: 60vh; }
          .lt-hero { padding: 100px 20px 40px; }
          .lt-form { padding: 28px 20px; }
          .lt-body { padding: 28px 20px; }
          .lt-catalogue { padding: 40px 20px 60px; }
          .lt-catalogue-grid { grid-template-columns: 1fr; }
          .lt-back { margin: 16px 20px 0; }
          }
        }
      `}</style>
      <div className="lt-page">
        {/* Hero */}
        <div className="lt-hero">
          <div className="lt-eyebrow">Locus Tools</div>
          <h1>AI-powered <em>legal document</em><br />tools for the modern practice.</h1>
          <p>Generate jurisdiction-aware NDAs, data protection checklists, DPA templates, and internship agreements — instantly, without the billing clock running.</p>
          {!selectedTool && (
            <div className="lt-pills">
              {JURISDICTIONS.map((j) => (
                <div key={j.label} className={`lt-pill${j.active ? " active" : ""}`}>{j.label}</div>
              ))}
            </div>
          )}
        </div>

        {/* Catalogue View */}
        {!selectedTool && (
          <div className="lt-catalogue">
            <div className="lt-cat-filter">
              {CATEGORIES.map((cat) => (
                <button key={cat.id} className={`lt-cat-chip${activeCategory === cat.id ? " active" : ""}`} onClick={() => setActiveCategory(cat.id)}>
                  {cat.label}<span className="lt-chip-count">({cat.count})</span>
                </button>
              ))}
            </div>
            <div className="lt-catalogue-grid">
              {TOOL_CATALOG.filter((t) => activeCategory === "All" || t.categories.includes(activeCategory)).map((tool) => (
                <div
                  key={tool.num}
                  className={`lt-cat-card${tool.comingSoon ? " coming-soon" : ""}`}
                  onClick={() => { if (tool.comingSoon) return; if (tool.href) { window.location.href = tool.href; } else { openTool(tool.id); } }}
                  style={tool.featured ? { borderColor: "hsl(var(--accent))", boxShadow: "4px 4px 0 0 hsl(var(--accent))" } : undefined}
                >
                  {tool.comingSoon && <span className="lt-coming-badge">Coming Soon</span>}
                  {tool.featured && (
                    <span
                      className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-sm border-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        borderColor: "hsl(var(--accent))",
                        background: "hsl(var(--accent) / 0.15)",
                        color: "hsl(var(--accent))",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-[1px] bg-accent" />
                      Locus+ · Featured
                    </span>
                  )}
                  <div className="lt-cat-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="lt-cat-num">{tool.num}</span>
                    {!tool.comingSoon && (
                      <ShareIconButton
                        size="sm"
                        label={`Share ${tool.label}`}
                        onShare={async () => {
                          const url = withRef(
                            tool.href ? `${window.location.origin}${tool.href}` : `${window.location.origin}/tools`,
                            "tool-share",
                          );
                          const text = `${tool.label} — free legal tool on Locus`;
                          const r = await shareOrCopy({ title: "Locus — Legal Tools", text, url });
                          if (r === "copied") toast.success("Link copied");
                        }}
                      />
                    )}
                  </div>
                  <div className="lt-cat-title">{tool.label}</div>
                  <div className="lt-cat-desc">{tool.description}</div>
                  <div className="lt-cat-tags">
                    {tool.tags.map((tag) => (
                      <span key={tag} className="lt-cat-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="lt-cat-arrow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>{tool.comingSoon ? "Coming Soon" : "Open Tool →"}</span>
                    {tool.comingSoon && (
                      <FeatureVoteButton
                        featureKey={`tool-${tool.num}`}
                        count={voteCounts[`tool-${tool.num}`] || 0}
                        voted={hasVoted(`tool-${tool.num}`)}
                        onToggle={toggleVote}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail View */}
        {selectedTool && (
          <>
            <button className="lt-back" onClick={() => setSelectedTool(null)}>← All Tools</button>

            {/* Tabs */}
            <div className="lt-tabs">
              {TABS.map((tab) => (
                <button key={tab.id} className={`lt-tab${activeTool === tab.id ? " active" : ""}`} onClick={() => setActiveTool(tab.id)}>
                  <span className="lt-tab-num">{tab.num}</span> {tab.label}
                </button>
              ))}
            </div>

        {/* NDA */}
        {activeTool === "nda" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">NDA Generator</div>
              <div className="lt-panel-desc">Generate a jurisdiction-specific Non-Disclosure Agreement with governing law, dispute resolution, and relevant exceptions.</div>
              <div className="lt-divider">Disclosing Party</div>
              <div className="lt-field"><label className="lt-label">Full Legal Name</label><input className="lt-input" value={ndaP1Name} onChange={(e) => setNdaP1Name(e.target.value)} placeholder="e.g. Apex Technologies Pvt. Ltd." /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Entity Type</label><select className="lt-select" value={ndaP1Type} onChange={(e) => setNdaP1Type(e.target.value)}>{ENTITY_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Jurisdiction</label><select className="lt-select" value={ndaP1Jur} onChange={(e) => setNdaP1Jur(e.target.value)}>{JURISDICTIONS_LIST.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-divider">Receiving Party</div>
              <div className="lt-field"><label className="lt-label">Full Legal Name</label><input className="lt-input" value={ndaP2Name} onChange={(e) => setNdaP2Name(e.target.value)} placeholder="e.g. Meridian Consulting Ltd." /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Entity Type</label><select className="lt-select" value={ndaP2Type} onChange={(e) => setNdaP2Type(e.target.value)}>{ENTITY_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Jurisdiction</label><select className="lt-select" value={ndaP2Jur} onChange={(e) => setNdaP2Jur(e.target.value)}>{JURISDICTIONS_LIST.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-divider">NDA Parameters</div>
              <div className="lt-field"><label className="lt-label">Purpose / Context</label><input className="lt-input" value={ndaPurpose} onChange={(e) => setNdaPurpose(e.target.value)} placeholder="e.g. Evaluation of a potential business partnership" /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">NDA Type</label><select className="lt-select" value={ndaType} onChange={(e) => setNdaType(e.target.value)}>{NDA_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Duration</label><select className="lt-select" value={ndaDuration} onChange={(e) => setNdaDuration(e.target.value)}>{DURATIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Governing Law</label><select className="lt-select" value={ndaGovLaw} onChange={(e) => setNdaGovLaw(e.target.value)}>{GOV_LAWS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Dispute Resolution</label><select className="lt-select" value={ndaDispute} onChange={(e) => setNdaDispute(e.target.value)}>{DISPUTES.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field"><label className="lt-label">Special Carve-outs or Notes (optional)</label><textarea className="lt-textarea" value={ndaNotes} onChange={(e) => setNdaNotes(e.target.value)} placeholder="e.g. Exclude financial data from confidentiality obligations..." /></div>
              <button className="lt-gen-btn" disabled={loading.nda} onClick={generateNDA}>
                {loading.nda ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate NDA</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.nda ? " loading" : hasOutput("nda") ? " ready" : ""}`} /><span>{loading.nda ? "Generating document…" : hasOutput("nda") ? "Document ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("nda")} onClick={() => copyOutput("nda")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("nda")} onClick={() => downloadOutput("nda")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.nda ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Drafting NDA <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : outputs.nda ? (
                  <div dangerouslySetInnerHTML={{ __html: outputs.nda }} />
                ) : (
                  <div className="lt-placeholder"><p>Fill in the party details and parameters, then click Generate NDA.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Checklist */}
        {activeTool === "checklist" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">Data Protection Checklist</div>
              <div className="lt-panel-desc">Get a tailored compliance checklist for your jurisdiction(s) with risk-rated action items.</div>
              <div className="lt-divider">Organisation Profile</div>
              <div className="lt-field"><label className="lt-label">Organisation Name</label><input className="lt-input" value={clOrg} onChange={(e) => setClOrg(e.target.value)} placeholder="e.g. Meridian Law Associates" /></div>
              <div className="lt-field"><label className="lt-label">Organisation Type</label><select className="lt-select" value={clType} onChange={(e) => setClType(e.target.value)}>{CL_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field">
                <label className="lt-label">Jurisdictions to Cover</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {CL_JURS.map((j) => (
                    <label key={j.value} className="lt-jur-check">
                      <input type="checkbox" checked={clJurs.includes(j.value)} onChange={(e) => setClJurs((p) => e.target.checked ? [...p, j.value] : p.filter((v) => v !== j.value))} /> {j.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="lt-field"><label className="lt-label">Data Processing Activities</label><select className="lt-select" value={clActivity} onChange={(e) => setClActivity(e.target.value)}>{CL_ACTIVITIES.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Process sensitive personal data?</label><select className="lt-select" value={clSensitive} onChange={(e) => setClSensitive(e.target.value)}>{CL_SENSITIVE.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Current Compliance Maturity</label><select className="lt-select" value={clMaturity} onChange={(e) => setClMaturity(e.target.value)}>{CL_MATURITY.map((o) => <option key={o}>{o}</option>)}</select></div>
              <button className="lt-gen-btn" disabled={loading.checklist} onClick={generateChecklist}>
                {loading.checklist ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate Checklist</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.checklist ? " loading" : hasOutput("checklist") ? " ready" : ""}`} /><span>{loading.checklist ? "Building checklist…" : hasOutput("checklist") ? "Checklist ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("checklist")} onClick={() => copyOutput("checklist")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("checklist")} onClick={() => downloadOutput("checklist")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.checklist ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Building compliance checklist <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : checklistSections.length > 0 ? (
                  <div style={{ maxWidth: 740, margin: "0 auto" }}>
                    <div className="lt-cl-header">
                      <h2>Data Protection Compliance Checklist</h2>
                      <div className="lt-cl-meta">{clOrg || "Your Organisation"} · {clJurs.join(" · ")} · Generated {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                    <div className="lt-progress-wrap"><div className="lt-progress-fill" style={{ width: `${progressPct}%` }} /></div>
                    <div className="lt-progress-label">{checkedItems} / {totalItems} items completed — {progressPct}% compliant</div>
                    {checklistSections.map((section, sIdx) => (
                      <div key={sIdx} className="lt-cl-section">
                        <div className="lt-cl-title">{section.title}</div>
                        {section.description && <div className="lt-cl-sub">{section.description}</div>}
                        {section.items.map((item, iIdx) => (
                          <div key={iIdx} className={`lt-cl-item${item.checked ? " checked" : ""}`} onClick={() => toggleChecklistItem(sIdx, iIdx)}>
                            <div className="lt-ci-box">{item.checked ? "✓" : ""}</div>
                            <div className="lt-ci-text">{item.text}</div>
                            <div className={`lt-ci-risk ${item.risk}`}>{item.risk.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="lt-placeholder"><p>Select your jurisdictions and organisation profile, then generate your checklist.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DPA */}
        {activeTool === "dpa" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">Data Processing Addendum</div>
              <div className="lt-panel-desc">Generate a GDPR/DPDPA-compliant Data Processing Addendum between a controller and processor.</div>
              <div className="lt-divider">Data Controller</div>
              <div className="lt-field"><label className="lt-label">Controller Name</label><input className="lt-input" value={dpaCtrlName} onChange={(e) => setDpaCtrlName(e.target.value)} placeholder="e.g. Apex Law LLP" /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Jurisdiction</label><select className="lt-select" value={dpaCtrlJur} onChange={(e) => setDpaCtrlJur(e.target.value)}>{DPA_JURS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Contact Email</label><input className="lt-input" value={dpaCtrlEmail} onChange={(e) => setDpaCtrlEmail(e.target.value)} placeholder="legal@example.com" /></div>
              </div>
              <div className="lt-divider">Data Processor</div>
              <div className="lt-field"><label className="lt-label">Processor Name</label><input className="lt-input" value={dpaProcName} onChange={(e) => setDpaProcName(e.target.value)} placeholder="e.g. CloudStore Technologies Pvt. Ltd." /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Jurisdiction</label><select className="lt-select" value={dpaProcJur} onChange={(e) => setDpaProcJur(e.target.value)}>{DPA_JURS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Contact Email</label><input className="lt-input" value={dpaProcEmail} onChange={(e) => setDpaProcEmail(e.target.value)} placeholder="dpo@vendor.com" /></div>
              </div>
              <div className="lt-divider">Processing Details</div>
              <div className="lt-field"><label className="lt-label">Nature / Purpose of Processing</label><textarea className="lt-textarea" value={dpaPurpose} onChange={(e) => setDpaPurpose(e.target.value)} placeholder="e.g. Cloud storage and backup of client legal documents..." /></div>
              <div className="lt-field"><label className="lt-label">Categories of Personal Data</label><input className="lt-input" value={dpaDataCats} onChange={(e) => setDpaDataCats(e.target.value)} placeholder="e.g. Names, email addresses, financial records" /></div>
              <div className="lt-field"><label className="lt-label">Data Subjects</label><input className="lt-input" value={dpaSubjects} onChange={(e) => setDpaSubjects(e.target.value)} placeholder="e.g. Clients, employees, opposing party contacts" /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Cross-border Transfers?</label><select className="lt-select" value={dpaXborder} onChange={(e) => setDpaXborder(e.target.value)}>{DPA_XBORDER.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Sub-processors Allowed?</label><select className="lt-select" value={dpaSubproc} onChange={(e) => setDpaSubproc(e.target.value)}>{DPA_SUBPROC.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Applicable Law</label><select className="lt-select" value={dpaGovLaw} onChange={(e) => setDpaGovLaw(e.target.value)}>{DPA_GOVLAW.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Breach Notification</label><select className="lt-select" value={dpaBreach} onChange={(e) => setDpaBreach(e.target.value)}>{DPA_BREACH.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <button className="lt-gen-btn" disabled={loading.dpa} onClick={generateDPA}>
                {loading.dpa ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate DPA Template</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.dpa ? " loading" : hasOutput("dpa") ? " ready" : ""}`} /><span>{loading.dpa ? "Generating document…" : hasOutput("dpa") ? "Document ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("dpa")} onClick={() => copyOutput("dpa")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("dpa")} onClick={() => downloadOutput("dpa")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.dpa ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Drafting DPA <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : outputs.dpa ? (
                  <div dangerouslySetInnerHTML={{ __html: outputs.dpa }} />
                ) : (
                  <div className="lt-placeholder"><p>Enter controller and processor details to generate a compliant DPA template.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Internship */}
        {activeTool === "internship" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">Internship Agreement</div>
              <div className="lt-panel-desc">Generate a structured internship agreement for Indian law firms, chambers, and legal departments.</div>
              <div className="lt-divider">Firm / Organisation</div>
              <div className="lt-field"><label className="lt-label">Firm / Organisation Name</label><input className="lt-input" value={iaFirm} onChange={(e) => setIaFirm(e.target.value)} placeholder="e.g. Veritas & Associates, Advocates" /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">City</label><select className="lt-select" value={iaCity} onChange={(e) => setIaCity(e.target.value)}>{IA_CITIES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Firm Type</label><select className="lt-select" value={iaFirmType} onChange={(e) => setIaFirmType(e.target.value)}>{IA_FIRM_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field"><label className="lt-label">Supervising Advocate / POC</label><input className="lt-input" value={iaSupervisor} onChange={(e) => setIaSupervisor(e.target.value)} placeholder="e.g. Adv. Priya Mehta" /></div>
              <div className="lt-divider">Intern Details</div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Intern Full Name</label><input className="lt-input" value={iaIntern} onChange={(e) => setIaIntern(e.target.value)} placeholder="e.g. Rahul Nair" /></div>
                <div className="lt-field"><label className="lt-label">Year of Study</label><select className="lt-select" value={iaYear} onChange={(e) => setIaYear(e.target.value)}>{IA_YEARS.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field"><label className="lt-label">Law College / University</label><input className="lt-input" value={iaCollege} onChange={(e) => setIaCollege(e.target.value)} placeholder="e.g. Amity Law School, Delhi" /></div>
              <div className="lt-divider">Internship Parameters</div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Start Date</label><input className="lt-input" type="date" value={iaStart} onChange={(e) => setIaStart(e.target.value)} /></div>
                <div className="lt-field"><label className="lt-label">End Date</label><input className="lt-input" type="date" value={iaEnd} onChange={(e) => setIaEnd(e.target.value)} /></div>
              </div>
              <div className="lt-field"><label className="lt-label">Practice Area</label><select className="lt-select" value={iaArea} onChange={(e) => setIaArea(e.target.value)}>{IA_AREAS.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Stipend</label><select className="lt-select" value={iaStipend} onChange={(e) => setIaStipend(e.target.value)}>{IA_STIPENDS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Working Days</label><select className="lt-select" value={iaDays} onChange={(e) => setIaDays(e.target.value)}>{IA_DAYS.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field"><label className="lt-label">Certificate on Completion?</label><select className="lt-select" value={iaCert} onChange={(e) => setIaCert(e.target.value)}>{IA_CERTS.map((o) => <option key={o}>{o}</option>)}</select></div>
              <button className="lt-gen-btn" disabled={loading.internship} onClick={generateInternship}>
                {loading.internship ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate Agreement</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.internship ? " loading" : hasOutput("internship") ? " ready" : ""}`} /><span>{loading.internship ? "Generating document…" : hasOutput("internship") ? "Document ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("internship")} onClick={() => copyOutput("internship")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("internship")} onClick={() => downloadOutput("internship")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.internship ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Drafting Internship Agreement <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : outputs.internship ? (
                  <div dangerouslySetInnerHTML={{ __html: outputs.internship }} />
                ) : (
                  <div className="lt-placeholder"><p>Enter the firm and intern details to generate a complete internship agreement.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Freelancer */}
        {activeTool === "freelancer" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">Freelancer Contract</div>
              <div className="lt-panel-desc">Generate a service agreement with payment terms, IP ownership, liability caps and clean termination clauses.</div>
              <div className="lt-divider">Parties</div>
              <div className="lt-field"><label className="lt-label">Client Name</label><input className="lt-input" value={flClientName} onChange={(e) => setFlClientName(e.target.value)} placeholder="e.g. Apex Technologies Pvt. Ltd." /></div>
              <div className="lt-field"><label className="lt-label">Client Entity Type</label><select className="lt-select" value={flClientType} onChange={(e) => setFlClientType(e.target.value)}>{ENTITY_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Freelancer Full Name</label><input className="lt-input" value={flFreelancerName} onChange={(e) => setFlFreelancerName(e.target.value)} placeholder="e.g. Rahul Nair" /></div>
              <div className="lt-divider">Scope</div>
              <div className="lt-field"><label className="lt-label">Service Type</label><select className="lt-select" value={flServiceType} onChange={(e) => setFlServiceType(e.target.value)}>{FL_SERVICE_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Scope of Services</label><textarea className="lt-textarea" value={flScope} onChange={(e) => setFlScope(e.target.value)} placeholder="e.g. Design and develop a 5-page marketing website with CMS integration..." /></div>
              <div className="lt-field"><label className="lt-label">Deliverables</label><textarea className="lt-textarea" value={flDeliverables} onChange={(e) => setFlDeliverables(e.target.value)} placeholder="e.g. Final design files (Figma), deployed website, source code, 1-week handover support" /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Start Date</label><input className="lt-input" type="date" value={flStart} onChange={(e) => setFlStart(e.target.value)} /></div>
                <div className="lt-field"><label className="lt-label">End Date</label><input className="lt-input" type="date" value={flEnd} onChange={(e) => setFlEnd(e.target.value)} /></div>
              </div>
              <div className="lt-divider">Commercials</div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Fee Structure</label><select className="lt-select" value={flFeeType} onChange={(e) => setFlFeeType(e.target.value)}>{FL_FEE_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Amount</label><input className="lt-input" value={flFeeAmount} onChange={(e) => setFlFeeAmount(e.target.value)} placeholder="e.g. ₹2,50,000 total" /></div>
              </div>
              <div className="lt-field"><label className="lt-label">Payment Terms</label><select className="lt-select" value={flPaymentTerms} onChange={(e) => setFlPaymentTerms(e.target.value)}>{FL_PAYMENT_TERMS.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-divider">Legal Parameters</div>
              <div className="lt-field"><label className="lt-label">Intellectual Property</label><select className="lt-select" value={flIp} onChange={(e) => setFlIp(e.target.value)}>{FL_IP_OWNERSHIP.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Liability Cap</label><select className="lt-select" value={flLiability} onChange={(e) => setFlLiability(e.target.value)}>{FL_LIABILITY.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Termination</label><select className="lt-select" value={flTermination} onChange={(e) => setFlTermination(e.target.value)}>{FL_TERMINATION.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field"><label className="lt-label">Governing Law</label><select className="lt-select" value={flGovLaw} onChange={(e) => setFlGovLaw(e.target.value)}>{FL_GOV_LAWS.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Special Terms (optional)</label><textarea className="lt-textarea" value={flNotes} onChange={(e) => setFlNotes(e.target.value)} placeholder="e.g. Maximum 2 rounds of revisions per deliverable; kill fee of 25% on early termination..." /></div>
              <button className="lt-gen-btn" disabled={loading.freelancer} onClick={generateFreelancer}>
                {loading.freelancer ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate Contract</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.freelancer ? " loading" : hasOutput("freelancer") ? " ready" : ""}`} /><span>{loading.freelancer ? "Generating document…" : hasOutput("freelancer") ? "Document ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("freelancer")} onClick={() => copyOutput("freelancer")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("freelancer")} onClick={() => downloadOutput("freelancer")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.freelancer ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Drafting Freelancer Contract <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : outputs.freelancer ? (
                  <div dangerouslySetInnerHTML={{ __html: outputs.freelancer }} />
                ) : (
                  <div className="lt-placeholder"><p>Fill in the parties, scope and commercials to generate a complete freelance services agreement.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Terms of Service */}
        {activeTool === "tos" && (
          <div className="lt-layout">
            <div className="lt-form">
              <div className="lt-panel-title">Terms of Service Generator</div>
              <div className="lt-panel-desc">Generate Terms and Conditions for your website or app with liability limits, refund policy and dispute resolution.</div>
              <div className="lt-divider">Service Owner</div>
              <div className="lt-field"><label className="lt-label">Company / Service Name</label><input className="lt-input" value={tosCompany} onChange={(e) => setTosCompany(e.target.value)} placeholder="e.g. Meridian Labs Pvt. Ltd." /></div>
              <div className="lt-field"><label className="lt-label">Website / App URL</label><input className="lt-input" value={tosWebsite} onChange={(e) => setTosWebsite(e.target.value)} placeholder="e.g. https://meridian.app" /></div>
              <div className="lt-divider">Service Profile</div>
              <div className="lt-field"><label className="lt-label">Service Type</label><select className="lt-select" value={tosServiceType} onChange={(e) => setTosServiceType(e.target.value)}>{TOS_SERVICE_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-field"><label className="lt-label">Service Description</label><textarea className="lt-textarea" value={tosDescription} onChange={(e) => setTosDescription(e.target.value)} placeholder="e.g. A SaaS platform that helps small businesses manage invoices and tax filings..." /></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Target Users</label><select className="lt-select" value={tosUserType} onChange={(e) => setTosUserType(e.target.value)}>{TOS_USER_TYPES.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Minimum Age</label><select className="lt-select" value={tosAge} onChange={(e) => setTosAge(e.target.value)}>{TOS_AGE.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-divider">Commercials</div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Payment Model</label><select className="lt-select" value={tosPayment} onChange={(e) => setTosPayment(e.target.value)}>{TOS_PAYMENT.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Refund Policy</label><select className="lt-select" value={tosRefund} onChange={(e) => setTosRefund(e.target.value)}>{TOS_REFUND.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-divider">Legal Parameters</div>
              <div className="lt-field"><label className="lt-label">User-Generated Content</label><select className="lt-select" value={tosUgc} onChange={(e) => setTosUgc(e.target.value)}>{TOS_UGC.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="lt-row">
                <div className="lt-field"><label className="lt-label">Dispute Resolution</label><select className="lt-select" value={tosDispute} onChange={(e) => setTosDispute(e.target.value)}>{TOS_DISPUTE.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="lt-field"><label className="lt-label">Governing Law</label><select className="lt-select" value={tosGovLaw} onChange={(e) => setTosGovLaw(e.target.value)}>{TOS_GOV_LAWS.map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="lt-field">
                <label className="lt-label">Compliance Frameworks</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {["DPDPA 2023", "GDPR", "CCPA", "PIPL", "PDPA (SG/MY)"].map((c) => (
                    <label key={c} className="lt-jur-check">
                      <input type="checkbox" checked={tosCompliance.includes(c)} onChange={(e) => setTosCompliance((p) => e.target.checked ? [...p, c] : p.filter((v) => v !== c))} /> {c}
                    </label>
                  ))}
                </div>
              </div>
              <div className="lt-field"><label className="lt-label">Special Clauses (optional)</label><textarea className="lt-textarea" value={tosNotes} onChange={(e) => setTosNotes(e.target.value)} placeholder="e.g. Include affiliate disclosure; specific cancellation flow for subscriptions..." /></div>
              <button className="lt-gen-btn" disabled={loading.tos} onClick={generateTos}>
                {loading.tos ? <><div className="lt-spinner" /><span>Generating…</span></> : <span>Generate Terms of Service</span>}
              </button>
            </div>
            <div className="lt-output">
              <div className="lt-toolbar">
                <div className="lt-out-label"><div className={`lt-dot${loading.tos ? " loading" : hasOutput("tos") ? " ready" : ""}`} /><span>{loading.tos ? "Generating document…" : hasOutput("tos") ? "Document ready" : "Awaiting input"}</span></div>
                <div className="lt-actions">
                  <button className="lt-act-btn" disabled={!hasOutput("tos")} onClick={() => copyOutput("tos")}>Copy</button>
                  <button className="lt-act-btn primary" disabled={!hasOutput("tos")} onClick={() => downloadOutput("tos")}>Download .txt</button>
                </div>
              </div>
              <div className="lt-body">
                {loading.tos ? (
                  <div className="lt-placeholder"><div className="lt-streaming">Drafting Terms of Service <div className="lt-streaming-dots"><span>.</span><span>.</span><span>.</span></div></div></div>
                ) : outputs.tos ? (
                  <div dangerouslySetInnerHTML={{ __html: outputs.tos }} />
                ) : (
                  <div className="lt-placeholder"><p>Fill in your service profile, payment model and compliance needs to generate complete Terms of Service.</p></div>
                )}
              </div>
            </div>
          </div>
        )}


          </>
        )}
      </div>
    </>
  );
}
