import { Home, Building2, BookOpen, Library, Wrench, Gavel, type LucideIcon } from "lucide-react";

export type NavItem = { key: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "directory", label: "Directory", icon: Building2 },
  { key: "playbook", label: "Playbook", icon: BookOpen },
  { key: "resources", label: "Resources", icon: Library },
  { key: "tools", label: "Tools", icon: Wrench },
  { key: "the-bar", label: "The Bar", icon: Gavel },
];
