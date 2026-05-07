import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type FirmProfile = Tables<"firm_profiles">;

let slugSetCache: Set<string> | null = null;
let slugSetPromise: Promise<Set<string>> | null = null;

/** Lightweight: fetch just the slugs of firms with intelligence rows. Cached for the session. */
export function getFirmIntelligenceSlugs(): Promise<Set<string>> {
  if (slugSetCache) return Promise.resolve(slugSetCache);
  if (slugSetPromise) return slugSetPromise;
  slugSetPromise = (async () => {
    const { data, error } = await supabase.from("firm_profiles").select("firm_slug");
    if (error) {
      console.warn("firm_profiles slugs fetch failed", error);
      return new Set<string>();
    }
    const set = new Set((data ?? []).map((r) => r.firm_slug));
    slugSetCache = set;
    return set;
  })();
  return slugSetPromise;
}

export async function getFirmProfile(slug: string): Promise<FirmProfile | null> {
  const { data, error } = await supabase
    .from("firm_profiles")
    .select("*")
    .eq("firm_slug", slug)
    .maybeSingle();
  if (error) {
    console.warn("firm_profile fetch failed", error);
    return null;
  }
  return data;
}

export interface TeamMember {
  name?: string;
  role?: string;
  designation?: string;
  bio?: string;
  email?: string;
  image?: string;
  url?: string;
  profile_url?: string;
  practice_area?: string;
}

export interface OfficeAddress {
  city?: string;
  address?: string;
  phone?: string;
}

const TEAM_NAME_BLOCKLIST = new Set([
  "people","management board","practice areas","sectors","practice area heads",
  "our people","team","about","contact","home","services","careers","news",
  "insights","publications","offices","locations","sector","sectors & industries",
]);

export function normalizeTeam(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: TeamMember[] = [];
  for (const r of raw as TeamMember[]) {
    const name = (r?.name ?? "").trim();
    if (!name) continue;
    if (name.length < 2 || name.length > 60) continue;
    if (/[0-9\n]/.test(name)) continue;
    if (TEAM_NAME_BLOCKLIST.has(name.toLowerCase())) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let role = (r.role ?? r.designation ?? "").trim();
    if (role.length > 80) role = "";
    out.push({ ...r, name, role: role || undefined });
  }
  return out;
}

// ---------------- Intelligence helpers ----------------

export type SignalTone = "positive" | "neutral" | "muted";
export interface IntelSignal {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: SignalTone;
}

export function computeSignals(p: FirmProfile): IntelSignal[] {
  const signals: IntelSignal[] = [];
  const paCount = p.practice_areas?.length ?? 0;
  const officeCount = p.office_count ?? p.offices?.length ?? 0;
  const year = new Date().getFullYear();

  // Practice breadth
  let breadth = "Boutique";
  if (paCount >= 15) breadth = "Mega-practice";
  else if (paCount >= 8) breadth = "Full-service";
  else if (paCount >= 4) breadth = "Focused";
  signals.push({
    key: "breadth",
    label: "Practice breadth",
    value: breadth,
    detail: `${paCount} declared practice ${paCount === 1 ? "area" : "areas"}`,
    tone: paCount >= 8 ? "positive" : "neutral",
  });

  // Geographic reach
  let reach = "Single-city";
  if (officeCount >= 6) reach = "Pan-India";
  else if (officeCount >= 3) reach = "National";
  else if (officeCount === 2) reach = "Regional";
  signals.push({
    key: "reach",
    label: "Geographic reach",
    value: reach,
    detail: `${officeCount} office${officeCount === 1 ? "" : "s"}`,
    tone: officeCount >= 3 ? "positive" : "neutral",
  });

  // Maturity
  if (p.founded_year) {
    const age = year - p.founded_year;
    let maturity = "Emerging";
    if (age >= 50) maturity = "Legacy";
    else if (age >= 20) maturity = "Established";
    else if (age >= 10) maturity = "Growing";
    signals.push({
      key: "maturity",
      label: "Firm maturity",
      value: maturity,
      detail: `Founded ${p.founded_year} · ${age} yrs`,
      tone: age >= 20 ? "positive" : "neutral",
    });
  }

  // Hiring signal
  signals.push({
    key: "hiring",
    label: "Hiring channel",
    value: p.careers_email || p.careers_url ? "Open" : "Indirect",
    detail: p.careers_email
      ? "Dedicated careers email"
      : p.careers_url
      ? "Careers page live"
      : "Apply via general contact",
    tone: p.careers_email || p.careers_url ? "positive" : "muted",
  });

  // Direct contact depth
  const contactScore = [p.general_email, p.careers_email, p.press_email, p.phone_main].filter(Boolean).length;
  signals.push({
    key: "contact",
    label: "Contact depth",
    value: contactScore >= 3 ? "Strong" : contactScore >= 1 ? "Moderate" : "Weak",
    detail: `${contactScore}/4 channels public`,
    tone: contactScore >= 3 ? "positive" : contactScore >= 1 ? "neutral" : "muted",
  });

  // Public visibility
  const social = [p.linkedin_url, p.twitter_url].filter(Boolean).length;
  signals.push({
    key: "visibility",
    label: "Public visibility",
    value: social >= 2 ? "High" : social === 1 ? "Medium" : "Low",
    detail: social >= 1 ? "Active social presence" : "Limited public footprint",
    tone: social >= 2 ? "positive" : social === 1 ? "neutral" : "muted",
  });

  return signals;
}

const PA_BUCKETS: { name: string; match: RegExp }[] = [
  { name: "Corporate & M&A", match: /corporate|m&a|mergers|acquisitions|private equity|venture|securities|capital markets/i },
  { name: "Disputes", match: /dispute|litigation|arbitration|criminal|white.?collar|investigation/i },
  { name: "Regulatory", match: /regulatory|compliance|competition|antitrust|banking|insurance|policy/i },
  { name: "IP & Tech", match: /\bip\b|intellectual property|trademark|patent|copyright|technology|tmt|data|privacy|media/i },
  { name: "Tax", match: /\btax\b|gst|customs/i },
  { name: "Real Estate", match: /real estate|property|construction|infrastructure|projects/i },
  { name: "Employment", match: /employment|labour|labor|hr/i },
  { name: "Restructuring", match: /restructuring|insolvency|bankruptcy|ibc/i },
];

export function bucketPracticeAreas(areas: string[]): { bucket: string; items: string[] }[] {
  const map = new Map<string, string[]>();
  const others: string[] = [];
  for (const a of areas) {
    const b = PA_BUCKETS.find((x) => x.match.test(a));
    if (b) {
      const arr = map.get(b.name) ?? [];
      arr.push(a);
      map.set(b.name, arr);
    } else {
      others.push(a);
    }
  }
  const result = PA_BUCKETS.filter((b) => map.has(b.name)).map((b) => ({ bucket: b.name, items: map.get(b.name)!.sort() }));
  if (others.length) result.push({ bucket: "Other", items: others.sort() });
  return result;
}
