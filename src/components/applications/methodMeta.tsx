import { Mail, FileText, Users, Building2, Linkedin, MoreHorizontal, ExternalLink, type LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Method = Database["public"]["Enums"]["application_method"];

export const METHOD_META: Record<Method, { label: string; Icon: LucideIcon }> = {
  email: { label: "Email", Icon: Mail },
  external: { label: "Company portal", Icon: ExternalLink },
  form: { label: "Form", Icon: FileText },
  referral: { label: "Referral", Icon: Users },
  in_person: { label: "In person", Icon: Building2 },
  linkedin: { label: "LinkedIn", Icon: Linkedin },
  other: { label: "Other", Icon: MoreHorizontal },
};

export const METHOD_OPTIONS = Object.entries(METHOD_META).map(([value, m]) => ({
  value: value as Method,
  label: m.label,
  Icon: m.Icon,
}));
