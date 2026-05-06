import { Building2, BookOpen, Wrench, Library, FileText, Compass, Rocket, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import startupsData from "@/data/startups.json";
import { guides } from "@/content/playbook";
import { TOOL_CATALOG } from "@/data/tools";
import type { SearchGroup, SearchResult } from "./types";

// ---------- Resources index (lightweight, mirrors src/pages/Resources.tsx) ----------

type ResourceIndex = {
  key: string;
  title: string;
  description: string;
  downloadHref?: string;
  comingSoon?: boolean;
};

const RESOURCES: ResourceIndex[] = [
  { key: "cv", title: "Demo CV", description: "Legal CV template for law students.", downloadHref: "/documents/IdealCVTemplate.docx" },
  { key: "cl", title: "Cold Email Template", description: "Cold email template for law firm outreach.", downloadHref: "/documents/CoverLetterTemplate.docx" },
  { key: "followup", title: "Follow-up Email Template", description: "Stay on their radar without being pushy.", downloadHref: "/documents/FollowupEmailTemplate.docx" },
  { key: "thankyou", title: "Thank You Email Template", description: "Polished thank-you after interviews or internships.", downloadHref: "/documents/ThankYouEmailTemplate.docx" },
  { key: "noc", title: "NOC Request Letter Template", description: "Formal NOC request letter for your college.", downloadHref: "/documents/NOCRequestLetterTemplate.docx" },
  { key: "tracker", title: "Internship Application Tracker", description: "Excel tracker for firms, dates, statuses, follow-ups.", downloadHref: "/documents/InternshipApplicationTracker.xlsx" },
  { key: "log", title: "Monthly Internship Log", description: "Track tasks, learnings, supervisor feedback monthly.", downloadHref: "/documents/MonthlyInternshipLog.docx" },
  { key: "linkedin", title: "LinkedIn Profile Checklist", description: "Optimise your LinkedIn for legal recruiters.", downloadHref: "/documents/LinkedInProfileChecklist.docx" },
  { key: "session", title: "Book Your Session", description: "1-on-1 mentoring session.", comingSoon: true },
];

// ---------- Pages index ----------

const PAGES: { title: string; href: string; description: string; keywords: string[] }[] = [
  { title: "Home", href: "/", description: "Locus landing page.", keywords: ["home", "landing"] },
  { title: "Directory", href: "/directory", description: "Search 3,600+ Indian law firms — 880+ direct emails.", keywords: ["firms", "lawyers", "search"] },
  { title: "Opportunities", href: "/opportunities", description: "Live curated internships, jobs, CFPs, moots & competitions.", keywords: ["vacancies", "openings", "hiring", "jobs", "internship", "cfp", "moot", "competition", "opportunities"] },
  { title: "Playbook", href: "/playbook", description: "Step-by-step guides for law students.", keywords: ["guides", "case files"] },
  { title: "Resources", href: "/resources", description: "Templates, trackers, mentorship.", keywords: ["templates", "downloads"] },
  { title: "Tools", href: "/tools", description: "Legal document generators.", keywords: ["nda", "dpa", "contract"] },
  { title: "The Bar", href: "/the-bar", description: "Legal challenges, leaderboards, RIT chat.", keywords: ["challenges", "leaderboard"] },
  { title: "App Home", href: "/app", description: "Your personal Locus workspace.", keywords: ["dashboard", "workspace"] },
  { title: "Application Tracker", href: "/applications", description: "Log and track firm applications.", keywords: ["log", "applied"] },
  { title: "CV Analyser", href: "/tools/cv-analyser", description: "Partner-voice review across 3 vectors.", keywords: ["cv", "resume", "analyse"] },
  { title: "Waitlist", href: "/waitlist", description: "Join the Locus waitlist.", keywords: ["join", "signup"] },
];

// ---------- Live vacancies (lazy-loaded from Supabase) ----------

type VacancyLite = { id: string; firm_name: string; role: string; location: string | null; expires_at: string };
let vacanciesCache: VacancyLite[] | null = null;
let vacanciesPromise: Promise<VacancyLite[]> | null = null;
let vacanciesAt = 0;

type CfpLite = { id: string; publication_name: string; theme: string | null; expires_at: string };
type MootLite = { id: string; competition_name: string; organiser: string; expires_at: string };
type CompetitionLite = { id: string; title: string; category: string; organiser: string; expires_at: string };

let cfpsCache: CfpLite[] | null = null;
let mootsCache: MootLite[] | null = null;
let compsCache: CompetitionLite[] | null = null;

export async function ensureVacanciesLoaded(): Promise<VacancyLite[]> {
  if (vacanciesCache && Date.now() - vacanciesAt < 5 * 60_000) return vacanciesCache;
  if (vacanciesPromise) return vacanciesPromise;
  vacanciesPromise = (async () => {
    const nowIso = new Date().toISOString();
    const [vRes, cRes, mRes, kRes] = await Promise.all([
      supabase.from("vacancies").select("id, firm_name, role, location, expires_at").eq("status", "live").gt("expires_at", nowIso).order("expires_at", { ascending: true }).limit(20),
      (supabase.from("cfps") as any).select("id, publication_name, theme, expires_at").eq("status", "live").gt("expires_at", nowIso).limit(20),
      (supabase.from("moots") as any).select("id, competition_name, organiser, expires_at").eq("status", "live").gt("expires_at", nowIso).limit(20),
      (supabase.from("competitions") as any).select("id, title, category, organiser, expires_at").eq("status", "live").gt("expires_at", nowIso).limit(20),
    ]);
    vacanciesCache = (vRes.data ?? []) as VacancyLite[];
    cfpsCache = (cRes.data ?? []) as CfpLite[];
    mootsCache = (mRes.data ?? []) as MootLite[];
    compsCache = (kRes.data ?? []) as CompetitionLite[];
    vacanciesAt = Date.now();
    vacanciesPromise = null;
    return vacanciesCache;
  })();
  return vacanciesPromise;
}

// ---------- Firms (lazy-loaded) ----------

type Firm = { name: string; city: string; area: string; tier: string; rating: number | null };
let firmsCache: Firm[] | null = null;
let firmsPromise: Promise<Firm[]> | null = null;

export async function ensureFirmsLoaded(): Promise<Firm[]> {
  if (firmsCache) return firmsCache;
  if (firmsPromise) return firmsPromise;
  firmsPromise = import("@/data/firms.json").then((mod) => {
    firmsCache = (mod.default as Firm[]).filter((f) => f && f.name);
    return firmsCache;
  });
  return firmsPromise;
}

// ---------- Scoring ----------

function scoreField(haystack: string | undefined, q: string, weight: number): number {
  if (!haystack) return 0;
  const h = haystack.toLowerCase();
  if (h === q) return weight * 4;
  if (h.startsWith(q)) return weight * 3;
  const idx = h.indexOf(q);
  if (idx === 0) return weight * 3;
  if (idx > 0) return weight * 1.5;
  // token-prefix
  const tokens = h.split(/\s+/);
  for (const t of tokens) {
    if (t.startsWith(q)) return weight * 2;
  }
  return 0;
}

function scoreFirm(f: Firm, q: string): number {
  return (
    scoreField(f.name, q, 3) +
    scoreField(f.city, q, 1.5) +
    scoreField(f.area, q, 1.2) +
    scoreField(f.tier, q, 0.8)
  );
}

// ---------- Run search ----------

export type SearchOutput = { groups: SearchGroup[]; total: number };

export function runSearch(rawQuery: string, firms: Firm[] | null): SearchOutput {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return { groups: [], total: 0 };

  // Firms
  const firmHits: SearchResult[] = [];
  if (firms) {
    const scored: { f: Firm; s: number }[] = [];
    for (const f of firms) {
      const s = scoreFirm(f, q);
      if (s > 0) scored.push({ f, s });
    }
    scored.sort((a, b) => b.s - a.s);
    for (const { f, s } of scored.slice(0, 8)) {
      firmHits.push({
        id: `firm-${f.name}-${f.city}-${f.area}`,
        kind: "firm",
        title: f.name,
        subtitle: [f.city, f.area].filter(Boolean).join(" · "),
        meta: f.tier,
        href: `/directory?q=${encodeURIComponent(f.name)}&firm=${encodeURIComponent(f.name)}`,
        score: s,
      });
    }
  }

  // Startups
  const startupHits: SearchResult[] = [];
  type SRow = { name: string; city?: string | null; sector?: string | null; stage?: string | null };
  const startups = startupsData as SRow[];
  const sScored: { s: SRow; score: number }[] = [];
  for (const s of startups) {
    const score =
      scoreField(s.name, q, 3) +
      scoreField(s.sector ?? "", q, 1.4) +
      scoreField(s.city ?? "", q, 1.2) +
      scoreField(s.stage ?? "", q, 0.6);
    if (score > 0) sScored.push({ s, score });
  }
  sScored.sort((a, b) => b.score - a.score);
  for (const { s, score } of sScored.slice(0, 6)) {
    startupHits.push({
      id: `startup-${s.name}-${s.city ?? ""}`,
      kind: "startup",
      title: s.name,
      subtitle: [s.city, s.sector].filter(Boolean).join(" · "),
      meta: s.stage ?? undefined,
      href: `/directory?mode=startups&q=${encodeURIComponent(s.name)}`,
      score,
    });
  }
  const guideHits: SearchResult[] = [];
  for (const g of guides) {
    const s =
      scoreField(g.title, q, 3) +
      scoreField(g.audience, q, 0.8) +
      scoreField(g.stage, q, 1) +
      scoreField(g.sections.join(" "), q, 0.6) +
      scoreField(g.caseNumber, q, 1.2);
    if (s > 0) {
      guideHits.push({
        id: `guide-${g.slug}`,
        kind: "guide",
        title: g.title,
        subtitle: `${g.caseNumber} · ${g.audience} · ${g.readTime}`,
        meta: g.comingSoon ? "Coming soon" : g.stage,
        href: g.comingSoon ? "/playbook" : `/playbook/${g.slug}`,
        score: s,
      });
    }
  }
  guideHits.sort((a, b) => b.score - a.score);

  // Tools
  const toolHits: SearchResult[] = [];
  for (const t of TOOL_CATALOG) {
    const s =
      scoreField(t.label, q, 3) +
      scoreField(t.description, q, 0.6) +
      scoreField(t.tags.join(" "), q, 1) +
      scoreField(t.categories.join(" "), q, 0.6);
    if (s > 0) {
      toolHits.push({
        id: `tool-${t.num}`,
        kind: "tool",
        title: t.label,
        subtitle: t.description.slice(0, 90) + (t.description.length > 90 ? "…" : ""),
        meta: t.comingSoon ? "Coming soon" : t.categories[0],
        href: t.href ?? `/tools#tool-${t.num}`,
        score: s + (t.featured ? 1 : 0),
      });
    }
  }
  toolHits.sort((a, b) => b.score - a.score);

  // Resources
  const resourceHits: SearchResult[] = [];
  for (const r of RESOURCES) {
    const s = scoreField(r.title, q, 3) + scoreField(r.description, q, 0.6);
    if (s > 0) {
      resourceHits.push({
        id: `resource-${r.key}`,
        kind: "resource",
        title: r.title,
        subtitle: r.description,
        meta: r.comingSoon ? "Coming soon" : "Download",
        href: r.downloadHref ?? `/resources?open=${r.key}`,
        externalDownload: !!r.downloadHref && !r.comingSoon,
        score: s,
      });
    }
  }
  resourceHits.sort((a, b) => b.score - a.score);

  // Pages
  const pageHits: SearchResult[] = [];
  for (const p of PAGES) {
    const s =
      scoreField(p.title, q, 3) +
      scoreField(p.description, q, 0.6) +
      scoreField(p.keywords.join(" "), q, 1.4);
    if (s > 0) {
      pageHits.push({
        id: `page-${p.href}`,
        kind: "page",
        title: p.title,
        subtitle: p.description,
        href: p.href,
        score: s,
      });
    }
  }
  pageHits.sort((a, b) => b.score - a.score);

  // Opportunities — vacancies + cfps + moots + competitions
  const oppHits: SearchResult[] = [];
  if (vacanciesCache) {
    for (const v of vacanciesCache) {
      const s = scoreField(v.firm_name, q, 3) + scoreField(v.role, q, 2) + scoreField(v.location ?? "", q, 1);
      if (s > 0) oppHits.push({
        id: `vacancy-${v.id}`, kind: "vacancy" as never,
        title: `${v.firm_name} — ${v.role}`,
        subtitle: v.location ?? "Live vacancy",
        meta: "Vacancy",
        href: `/opportunities?focus=${v.id}`,
        score: s + 1,
      });
    }
  }
  if (cfpsCache) {
    for (const c of cfpsCache) {
      const s = scoreField(c.publication_name, q, 3) + scoreField(c.theme ?? "", q, 1.5);
      if (s > 0) oppHits.push({
        id: `cfp-${c.id}`, kind: "vacancy" as never,
        title: c.publication_name,
        subtitle: c.theme ?? "Call for Papers",
        meta: "CFP",
        href: `/opportunities?focus=${c.id}`,
        score: s,
      });
    }
  }
  if (mootsCache) {
    for (const m of mootsCache) {
      const s = scoreField(m.competition_name, q, 3) + scoreField(m.organiser, q, 1.5);
      if (s > 0) oppHits.push({
        id: `moot-${m.id}`, kind: "vacancy" as never,
        title: m.competition_name,
        subtitle: m.organiser,
        meta: "Moot",
        href: `/opportunities?focus=${m.id}`,
        score: s,
      });
    }
  }
  if (compsCache) {
    for (const k of compsCache) {
      const s = scoreField(k.title, q, 3) + scoreField(k.organiser, q, 1.2) + scoreField(k.category, q, 1);
      if (s > 0) oppHits.push({
        id: `comp-${k.id}`, kind: "vacancy" as never,
        title: k.title,
        subtitle: `${k.organiser} · ${k.category.replace(/_/g, " ")}`,
        meta: "Competition",
        href: `/opportunities?focus=${k.id}`,
        score: s,
      });
    }
  }
  oppHits.sort((a, b) => b.score - a.score);

  const allGroups: SearchGroup[] = [
    { kind: "vacancy" as never, label: "Live Opportunities", icon: Briefcase, results: oppHits.slice(0, 8) },
    { kind: "firm", label: "Firms", icon: Building2, results: firmHits },
    { kind: "startup", label: "Startups & SMEs", icon: Rocket, results: startupHits },
    { kind: "guide", label: "Playbook", icon: BookOpen, results: guideHits.slice(0, 6) },
    { kind: "tool", label: "Tools", icon: Wrench, results: toolHits.slice(0, 6) },
    { kind: "resource", label: "Resources", icon: Library, results: resourceHits.slice(0, 6) },
    { kind: "page", label: "Pages", icon: Compass, results: pageHits.slice(0, 5) },
  ];
  const groups = allGroups.filter((g) => g.results.length > 0);

  const total = groups.reduce((sum, g) => sum + g.results.length, 0);
  return { groups, total };
}

// ---------- Suggestions / icon hint ----------

export const SEARCH_SUGGESTIONS = [
  "Mumbai litigation",
  "Cold email",
  "CV Analyser",
  "Cyril Amarchand",
  "Bar Council",
  "NDA template",
];

export const KIND_LABELS: Record<string, string> = {
  firm: "Firm",
  startup: "Startup",
  guide: "Guide",
  tool: "Tool",
  resource: "Resource",
  page: "Page",
};

export { FileText };
