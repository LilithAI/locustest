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
  bio?: string;
  email?: string;
  image?: string;
  url?: string;
}

export interface OfficeAddress {
  city?: string;
  address?: string;
  phone?: string;
}
