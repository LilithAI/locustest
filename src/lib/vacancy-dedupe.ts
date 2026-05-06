// Pure helpers for detecting duplicate vacancies in the admin drafter.
import type { Vacancy, VacancyApplicationMode } from "@/lib/vacancies";

const FIRM_FILLER = /\b(llp|llc|ltd|limited|pvt|private|inc|partners|partner|co|company|advocates|advocate|associates|associate|and|&|the)\b/g;
const ROLE_FILLER = new Set([
  "intern","internship","trainee","associate","junior","jr","sr","senior",
  "law","legal","clerk","assistant","fellow","the","a","an","of","for","at",
  "position","role","opening","vacancy","required","wanted",
]);

export function normalizeFirmName(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[.,'"`]/g, " ")
    .replace(FIRM_FILLER, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roleTokens(s: string): Set<string> {
  return new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !ROLE_FILLER.has(t)),
  );
}

export function roleSimilarity(a: string, b: string): number {
  const A = roleTokens(a);
  const B = roleTokens(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Strip tracking params, fragments, trailing slashes; lowercase host. */
export function normalizeUrl(raw: string): string {
  if (!raw) return "";
  try {
    const u = new URL(raw.trim());
    // Drop tracking params
    const dropPrefixes = ["utm_", "gclid", "fbclid", "mc_"];
    const keep: [string, string][] = [];
    u.searchParams.forEach((v, k) => {
      if (!dropPrefixes.some((p) => k.toLowerCase().startsWith(p))) keep.push([k, v]);
    });
    keep.sort(([a], [b]) => a.localeCompare(b));
    const search = keep.length
      ? "?" + keep.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
      : "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.host.toLowerCase()}${path}${search}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export interface DupeCandidate {
  firm_name: string;
  role: string;
  application_mode: VacancyApplicationMode;
  application_email: string | null;
  application_url: string | null;
}

export interface DupeResult {
  hardMatches: Vacancy[];
  softMatches: Vacancy[];
  emailReuse: Vacancy[]; // same email, different firm
  urlReuse: Vacancy[];   // same URL, different firm
}

export function findDuplicates(
  candidate: DupeCandidate,
  existing: Vacancy[],
  excludeId?: string,
): DupeResult {
  const out: DupeResult = { hardMatches: [], softMatches: [], emailReuse: [], urlReuse: [] };
  const firm = normalizeFirmName(candidate.firm_name);
  const email = (candidate.application_email || "").trim().toLowerCase();
  const url = candidate.application_url ? normalizeUrl(candidate.application_url) : "";
  if (!firm && !email && !url) return out;

  for (const v of existing) {
    if (excludeId && v.id === excludeId) continue;
    const vFirm = normalizeFirmName(v.firm_name);
    const vEmail = (v.application_email || "").trim().toLowerCase();
    const vUrl = v.application_url ? normalizeUrl(v.application_url) : "";
    const sameFirm = firm.length > 0 && vFirm === firm;
    const sameEmail = email.length > 0 && vEmail === email;
    const sameUrl = url.length > 0 && vUrl === url;

    // Email mode hard match: same firm + same email
    if (candidate.application_mode === "email" && sameEmail && sameFirm) {
      out.hardMatches.push(v);
      continue;
    }
    // Portal mode hard match: same firm + same normalized URL
    if (candidate.application_mode === "external_url" && sameUrl && sameFirm) {
      out.hardMatches.push(v);
      continue;
    }
    // Soft: same firm + similar role (mode-agnostic — surfaces cross-mode dupes too)
    if (sameFirm && roleSimilarity(candidate.role, v.role) >= 0.7) {
      out.softMatches.push(v);
      continue;
    }
    if (sameEmail && !sameFirm) {
      out.emailReuse.push(v);
      continue;
    }
    if (sameUrl && !sameFirm) {
      out.urlReuse.push(v);
    }
  }
  return out;
}

export function hasAnyDupe(r: DupeResult): boolean {
  return (
    r.hardMatches.length > 0 ||
    r.softMatches.length > 0 ||
    r.emailReuse.length > 0 ||
    r.urlReuse.length > 0
  );
}

export function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}
