import { Briefcase, Building2, FileText, Gavel, Trophy, type LucideIcon } from "lucide-react";

export type OpportunityStream = "internship" | "job" | "cfp" | "moot" | "competition";

export interface BaseOpp {
  id: string;
  stream: OpportunityStream;
  posted_at: string;
  source_credit: string | null;
  description?: string | null;
}

export interface VacancyLike extends BaseOpp {
  stream: "internship" | "job";
  firm_name: string;
  role: string;
  location?: string | null;
  stipend?: string | null;
  eligibility?: string | null;
  expires_at: string;
  application_email: string | null;
  application_mode?: "email" | "external_url" | null;
  application_url?: string | null;
  tier?: "tier_1" | "tier_2" | "tier_3" | "boutique" | "in_house" | "psu" | "big_4" | "other" | null;
  practice_area?: string | null;
  task_brief?: string | null;
}

export interface CfpOpp extends BaseOpp {
  stream: "cfp";
  publication_name: string;
  publication_type: string;
  theme?: string | null;
  deadline: string;
  word_limit_min?: number | null;
  word_limit_max?: number | null;
  co_authorship_allowed: boolean;
  submission_fee?: string | null;
  submission_url?: string | null;
  contact_email?: string | null;
  peer_reviewed: boolean;
  eligibility?: string | null;
  expires_at: string;
}

export interface MootOpp extends BaseOpp {
  stream: "moot";
  competition_name: string;
  organiser: string;
  edition?: string | null;
  area_of_law?: string | null;
  mode: "online" | "offline" | "hybrid";
  venue?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  deadline: string;
  prize_pool?: string | null;
  registration_url?: string | null;
  eligibility?: string | null;
  expires_at: string;
}

export interface CompetitionOpp extends BaseOpp {
  stream: "competition";
  title: string;
  category: string;
  organiser: string;
  deadline: string;
  event_date?: string | null;
  mode?: "online" | "offline" | "hybrid" | null;
  prize_or_stipend?: string | null;
  fee?: string | null;
  application_url?: string | null;
  eligibility?: string | null;
  expires_at: string;
}

export type AnyOpportunity = VacancyLike | CfpOpp | MootOpp | CompetitionOpp;

export const STREAM_META: Record<
  OpportunityStream,
  { pillLabel: string; pillBg: string; pillText: string; accentBg: string; icon: LucideIcon }
> = {
  internship: {
    pillLabel: "Internship",
    pillBg: "bg-accent",
    pillText: "text-accent-foreground",
    accentBg: "bg-accent",
    icon: Briefcase,
  },
  job: {
    pillLabel: "Full-time",
    pillBg: "bg-foreground",
    pillText: "text-background",
    accentBg: "bg-foreground",
    icon: Building2,
  },
  cfp: {
    pillLabel: "Call for Papers",
    pillBg: "bg-transparent border-2 border-accent",
    pillText: "text-accent",
    accentBg: "bg-accent/60",
    icon: FileText,
  },
  moot: {
    pillLabel: "Moot",
    pillBg: "bg-transparent border-2 border-foreground",
    pillText: "text-foreground",
    accentBg: "bg-foreground/70",
    icon: Gavel,
  },
  competition: {
    pillLabel: "Competition",
    pillBg: "bg-accent/20 border-2 border-accent",
    pillText: "text-accent",
    accentBg: "bg-gradient-to-b from-accent to-foreground",
    icon: Trophy,
  },
};

export function streamLabel(s: OpportunityStream): string {
  if (s === "cfp") return "CFPs";
  if (s === "internship") return "Internships";
  if (s === "job") return "Jobs";
  if (s === "moot") return "Moots";
  return "Competitions";
}

export function deadlineOf(o: AnyOpportunity): string {
  return "deadline" in o ? o.deadline : o.expires_at;
}

export function titleOf(o: AnyOpportunity): string {
  switch (o.stream) {
    case "internship":
    case "job":
      return `${o.role} — ${o.firm_name}`;
    case "cfp":
      return o.publication_name;
    case "moot":
      return o.competition_name;
    case "competition":
      return o.title;
  }
}

export function organiserOf(o: AnyOpportunity): string {
  switch (o.stream) {
    case "internship":
    case "job":
      return o.location || "Location TBD";
    case "cfp":
      return `${prettify(o.publication_type)} · ${o.peer_reviewed ? "Peer-reviewed" : "Editorial review"}`;
    case "moot":
      return `${o.organiser}${o.edition ? ` · ${o.edition}` : ""}`;
    case "competition":
      return o.organiser;
  }
}

export function prettify(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function countdown(iso: string): { label: string; tone: "ok" | "soon" | "expired" } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Closed", tone: "expired" };
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days >= 7) return { label: `${days}d left`, tone: "ok" };
  if (days >= 1) return { label: `${days}d ${hours}h left`, tone: "soon" };
  return { label: `${hours}h left`, tone: "soon" };
}
