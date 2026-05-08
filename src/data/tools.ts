export type ToolType = "nda" | "checklist" | "dpa" | "internship" | "freelancer" | "tos";
export type CategoryType = "All" | "Firms" | "Startups" | "Creators" | "Students" | "SMBs";

export type ToolCatalogItem = {
  id: ToolType;
  num: string;
  label: string;
  description: string;
  tags: string[];
  comingSoon?: boolean;
  href?: string;
  categories: CategoryType[];
  featured?: boolean;
};

export const TOOL_CATALOG: ToolCatalogItem[] = [
  { id: "nda", num: "01", label: "NDA Generator", description: "Generate enforceable non-disclosure agreements across multiple jurisdictions", tags: ["APAC", "GDPR", "Multi-party"], categories: ["Firms", "Startups", "SMBs"] },
  { id: "checklist", num: "02", label: "Data Protection Checklist", description: "Interactive compliance audit with risk-rated action items", tags: ["Interactive", "Risk-rated", "Multi-jurisdiction"], categories: ["Firms", "SMBs"] },
  { id: "dpa", num: "03", label: "DPA Template", description: "Draft data processing agreements with cross-border transfer clauses", tags: ["GDPR", "DPDPA", "Cross-border"], categories: ["Firms", "SMBs"] },
  { id: "internship", num: "04", label: "Internship Agreement", description: "Formalize legal internship terms with BCI-compliant templates", tags: ["Indian Law", "BCI Rules", "Structured"], categories: ["Firms", "Students"] },
  { id: "nda", num: "05", label: "Founder Agreement", description: "Co-founder equity splits, vesting schedules, and IP assignment clauses", tags: ["Startups", "Equity", "Vesting"], comingSoon: true, categories: ["Startups"] },
  { id: "freelancer", num: "06", label: "Freelancer Contract", description: "Service agreements with payment terms, IP ownership, and liability caps", tags: ["SMBs", "IP", "Payments"], categories: ["SMBs", "Startups"] },
  { id: "nda", num: "07", label: "Music Licensing Agreement", description: "Sync licensing, royalty splits, and territory-based distribution rights", tags: ["Artists", "Royalties", "Sync"], comingSoon: true, categories: ["Creators"] },
  { id: "nda", num: "08", label: "Artist Commission Contract", description: "Commission scope, revision limits, usage rights, and payment milestones", tags: ["Creators", "IP", "Milestones"], comingSoon: true, categories: ["Creators"] },
  { id: "tos", num: "09", label: "Terms of Service Generator", description: "Website/app ToS with liability limitations and dispute resolution", tags: ["Startups", "SaaS", "E-commerce"], categories: ["Startups", "SMBs"] },
  { id: "nda", num: "10", label: "Equity & ESOP Template", description: "Employee stock option plans with cliff periods and exercise terms", tags: ["Startups", "ESOPs", "Vesting"], comingSoon: true, categories: ["Startups", "Students"] },
];
