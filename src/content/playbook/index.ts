import type { ComponentType } from "react";

export type Audience = "Students" | "Firms" | "Institutions";

export interface GuideAttachment {
  label: string;
  href: string;
  comingSoon?: boolean;
}

export interface GuideMeta {
  slug: string;
  caseNumber: string;
  title: string;
  audience: Audience;
  stage: string;
  readTime: string;
  sections: string[];
  pdfHref?: string;
  attachments?: GuideAttachment[];
  /** If true, no MDX article exists yet */
  comingSoon?: boolean;
}

export interface PublishedGuide extends GuideMeta {
  Component: ComponentType;
}

// MDX modules — eagerly loaded so we can map slug -> component
const mdxModules = import.meta.glob<{ default: ComponentType }>(
  "./*.mdx",
  { eager: true }
);

const mdxBySlug: Record<string, ComponentType> = {};
for (const [path, mod] of Object.entries(mdxModules)) {
  const slug = path.replace(/^\.\//, "").replace(/\.mdx$/, "");
  mdxBySlug[slug] = mod.default;
}

const baseGuides: GuideMeta[] = [
  {
    slug: "cold-email-law-firm",
    caseNumber: "LX-001",
    title: "How to Cold Email a Law Firm (And Actually Get a Reply)",
    audience: "Students",
    stage: "Before You Apply",
    readTime: "6 min",
    sections: ["Why most cold emails fail", "Finding the right contact", "Writing the subject line", "The email structure", "Following up"],
    pdfHref: "/documents/LX-001-ColdEmail.pdf",
    attachments: [
      { label: "Cold Email Template", href: "/documents/CoverLetterTemplate.docx" },
      { label: "Follow-up Email Template", href: "/documents/FollowupEmailTemplate.docx" },
    ],
  },
  {
    slug: "non-nlu-student-guide",
    caseNumber: "LX-002",
    title: "The Non-NLU Student's Guide to Getting Top Firm Internships",
    audience: "Students",
    stage: "Before You Apply",
    readTime: "8 min",
    sections: ["Reframing the disadvantage", "What firms actually look for", "Building your portfolio", "Direct application strategy", "Making it stick"],
    pdfHref: "/documents/LX-002-NonNLU.pdf",
    attachments: [
      { label: "Internship Application Tracker", href: "/documents/InternshipApplicationTracker.xlsx" },
      { label: "LinkedIn Profile Checklist", href: "/documents/LinkedInProfileChecklist.docx" },
    ],
  },
  {
    slug: "first-legal-internship",
    caseNumber: "LX-003",
    title: "What to Expect in Your First Legal Internship",
    audience: "Students",
    stage: "Once You're In",
    readTime: "5 min",
    sections: ["Day one — what actually happens", "Types of work you'll be given", "How to ask questions properly", "Tracking your work", "End-of-internship checklist"],
    pdfHref: "/documents/LX-003-FirstInternship.pdf",
    attachments: [
      { label: "Monthly Internship Log", href: "/documents/MonthlyInternshipLog.docx" },
      { label: "First Day Checklist", href: "/documents/FirstDayChecklist.docx" },
    ],
  },
  {
    slug: "legal-research-memo",
    caseNumber: "LX-004",
    title: "How to Write a Legal Research Memo",
    audience: "Students",
    stage: "Once You're In",
    readTime: "7 min",
    sections: ["What a memo is and isn't", "Structure: IRAC explained", "Research methodology", "Writing style and tone", "Common mistakes"],
    pdfHref: "/documents/LX-004-ResearchMemo.pdf",
    attachments: [
      { label: "Legal Research Memo Template", href: "/documents/LegalResearchMemoTemplate.docx" },
      { label: "Sample IRAC Memo", href: "/documents/SampleIRACMemo.docx" },
    ],
  },
  {
    slug: "convert-internship-ppo",
    caseNumber: "LX-005",
    title: "How to Convert an Internship into a PPO",
    audience: "Students",
    stage: "After It Ends",
    readTime: "5 min",
    sections: ["What firms look for in interns", "The visibility strategy", "Asking for feedback", "The follow-up timeline", "Writing the PPO request"],
    pdfHref: "/documents/LX-005-ConvertPPO.pdf",
    attachments: [
      { label: "Thank You Email Template", href: "/documents/ThankYouEmailTemplate.docx" },
      { label: "NOC Request Letter Template", href: "/documents/NOCRequestLetterTemplate.docx" },
    ],
  },
  {
    slug: "network-law-student",
    caseNumber: "LX-006",
    title: "How to Network as a Law Student in India",
    audience: "Students",
    stage: "Before You Apply",
    readTime: "9 min",
    sections: ["Why most law students network wrong", "The two-degree rule", "LinkedIn done properly", "Reaching out to seniors", "In-person: where students meet seniors", "The first conversation", "Maintaining relationships", "What to never do", "A 12-month networking plan"],
  },
  {
    slug: "practice-area-guide",
    caseNumber: "LX-007",
    title: "Practice Area Guide: What Each Area Actually Looks Like Day-to-Day",
    audience: "Students",
    stage: "Before You Apply",
    readTime: "6 min",
    sections: ["Corporate", "Litigation", "IP", "Tax", "Employment", "How to choose"],
    comingSoon: true,
  },
  {
    slug: "bar-council-registration",
    caseNumber: "LX-008",
    title: "Bar Council Registration Guide for Final Year Students",
    audience: "Students",
    stage: "After It Ends",
    readTime: "10 min",
    sections: ["Why this matters and when to start", "The legal framework", "Eligibility — Section 24 in plain English", "Documents checklist", "Fees — what it actually costs", "SBC vs BCI vs AIBE timeline", "Picking the right State Bar Council", "Common mistakes that cost months", "What to do while you wait", "Post-enrolment: first 90 days"],
  },
  {
    slug: "evaluate-law-intern",
    caseNumber: "LX-009",
    title: "How to Evaluate a Law Intern",
    audience: "Firms",
    stage: "Firm Resources",
    readTime: "4 min",
    sections: ["Setting clear expectations", "The evaluation rubric", "Mid-internship check-in", "Final assessment criteria", "Giving useful feedback"],
    attachments: [
      { label: "Intern Evaluation Rubric", href: "/documents/InternEvaluationRubric.docx" },
      { label: "Intern Daily Task Sheet", href: "/documents/InternDailyTaskSheet.docx" },
      { label: "Intern Feedback Form", href: "/documents/InternFeedbackForm.docx" },
    ],
    comingSoon: true,
  },
  {
    slug: "build-internship-program",
    caseNumber: "LX-010",
    title: "Building Your Firm's Internship Program from Scratch",
    audience: "Firms",
    stage: "Firm Resources",
    readTime: "6 min",
    sections: ["Why a structured program matters", "Setting intake criteria", "Onboarding checklist", "Assigning work effectively", "Retention and conversion"],
    attachments: [
      { label: "Internship Offer Letter Template", href: "/documents/InternshipOfferLetterTemplate.docx" },
      { label: "Intern NDA Template", href: "/documents/InternNDATemplate.docx" },
      { label: "Internship Certificate Template", href: "/documents/InternshipCertificateTemplate.docx" },
    ],
    comingSoon: true,
  },
  {
    slug: "law-intern-cv",
    caseNumber: "LX-011",
    title: "What to Look for in a Law Intern's CV",
    audience: "Firms",
    stage: "Firm Resources",
    readTime: "4 min",
    sections: ["Red flags vs green flags", "Academic record weight", "Extracurriculars that matter", "Writing samples", "What to ignore"],
    comingSoon: true,
  },
  {
    slug: "post-firm-locus",
    caseNumber: "LX-012",
    title: "How to Post Your Firm on Locus",
    audience: "Firms",
    stage: "Firm Resources",
    readTime: "3 min",
    sections: ["Creating your firm profile", "Adding internship listings", "Setting intake criteria", "Managing applications", "Getting verified"],
    comingSoon: true,
  },
  {
    slug: "setup-placement-cell",
    caseNumber: "LX-013",
    title: "How to Set Up a Placement Cell",
    audience: "Institutions",
    stage: "Institution Resources",
    readTime: "7 min",
    sections: ["What a placement cell actually does", "Core team structure", "Building a firm database", "Student preparation pipeline", "Tracking placements"],
    comingSoon: true,
  },
  {
    slug: "register-institution-locus",
    caseNumber: "LX-014",
    title: "How to Register Your Institution on Locus",
    audience: "Institutions",
    stage: "Institution Resources",
    readTime: "5 min",
    sections: ["Eligibility", "Documents needed", "Verification process", "What you get access to", "Managing your student roster"],
    comingSoon: true,
  },
];

export const guides: GuideMeta[] = baseGuides;

export function getGuideBySlug(slug: string): PublishedGuide | null {
  const meta = guides.find((g) => g.slug === slug);
  if (!meta) return null;
  const Component = mdxBySlug[slug];
  if (!Component) return null;
  return { ...meta, Component };
}

export function getNextGuide(currentSlug: string): GuideMeta | null {
  const idx = guides.findIndex((g) => g.slug === currentSlug);
  if (idx === -1) return null;
  const current = guides[idx];
  // Prefer next published guide in same audience
  for (let i = idx + 1; i < guides.length; i++) {
    if (guides[i].audience === current.audience && !guides[i].comingSoon) {
      return guides[i];
    }
  }
  // Fallback: any next published guide
  for (let i = idx + 1; i < guides.length; i++) {
    if (!guides[i].comingSoon) return guides[i];
  }
  return null;
}
