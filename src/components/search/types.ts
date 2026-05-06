import type { LucideIcon } from "lucide-react";

export type ResultKind = "firm" | "startup" | "guide" | "tool" | "resource" | "page";

export type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  meta?: string; // right-side small chip (e.g. "Tier 1", "Coming soon")
  href: string; // primary navigation target
  externalDownload?: boolean; // resource downloads
  score: number;
};

export type SearchGroup = {
  kind: ResultKind;
  label: string;
  icon: LucideIcon;
  results: SearchResult[];
};
