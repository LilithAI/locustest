import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Users,
  ClipboardCheck,
  Briefcase,
  Scale,
  Megaphone,
  MessageSquarePlus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAdminAccess, type AdminScope } from "@/hooks/useAdminRole";

interface Tab {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Required scope. If user has full admin OR this scope, the tab is shown. */
  scope: AdminScope;
  /** If true, only full admins (role = 'admin') see this tab. */
  fullAdminOnly?: boolean;
}

const tabs: Tab[] = [
  { to: "/admin/waitlist", label: "Waitlist", short: "Waitlist", icon: Users, scope: "waitlist_admin" },
  { to: "/admin/beta", label: "Beta Testers", short: "Beta", icon: ClipboardCheck, scope: "admin", fullAdminOnly: true },
  { to: "/admin/vacancies", label: "Vacancies", short: "Vacancies", icon: Briefcase, scope: "opportunities_admin" },
  { to: "/admin/opportunities", label: "Opportunities", short: "Opps", icon: Briefcase, scope: "opportunities_admin" },
  { to: "/admin/firm-suggestions", label: "Firm Suggestions", short: "Firms", icon: MessageSquarePlus, scope: "waitlist_admin" },
  { to: "/admin/bar", label: "The Bar", short: "Bar", icon: Scale, scope: "bar_admin" },
  { to: "/admin/broadcasts", label: "Broadcasts", short: "Sends", icon: Megaphone, scope: "broadcast_admin" },
  { to: "/admin/admins", label: "Admin Access", short: "Access", icon: ShieldCheck, scope: "admin", fullAdminOnly: true },
];

export default function AdminSubNav() {
  const { pathname } = useLocation();
  const { isAdmin, hasScope } = useAdminAccess();
  const onDashboard = pathname === "/admin";

  const visibleTabs = tabs.filter((t) =>
    t.fullAdminOnly ? isAdmin : hasScope(t.scope)
  );

  return (
    <header className="sticky top-16 z-30 border-b-2 border-foreground/20 bg-background/90 backdrop-blur">
      <div className="flex items-center gap-2 px-3 md:px-5 py-2 max-w-[1600px] mx-auto">
        <Link
          to={onDashboard ? "/" : "/admin"}
          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform text-xs font-bold uppercase tracking-wider shrink-0"
          aria-label={onDashboard ? "Back to site" : "Back to admin dashboard"}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {onDashboard ? "Back to site" : "Dashboard"}
          </span>
        </Link>

        <div className="h-6 w-px bg-foreground/20 shrink-0 hidden sm:block" />

        <nav
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin flex-1 min-w-0"
          aria-label="Admin sections"
        >
          {visibleTabs.map((t) => {
            const isActive =
              pathname === t.to || pathname.startsWith(t.to + "/");
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                    : "border-transparent hover:border-foreground/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t.label}</span>
                <span className="md:hidden">{t.short}</span>
              </NavLink>
            );
          })}
        </nav>

        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          View site
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
}
