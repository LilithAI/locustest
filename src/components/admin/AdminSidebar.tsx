import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Briefcase,
  Scale,
  MessageSquarePlus,
  Megaphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Waitlist", url: "/admin/waitlist", icon: Users },
  { title: "Beta Testers", url: "/admin/beta", icon: ClipboardCheck },
  { title: "Opportunities", url: "/admin/opportunities", icon: Briefcase },
  { title: "Firm Suggestions", url: "/admin/firm-suggestions", icon: MessageSquarePlus },
  { title: "The Bar", url: "/admin/bar", icon: Scale },
  { title: "Broadcasts", url: "/admin/broadcasts", icon: Megaphone },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-foreground/20">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono uppercase text-[10px] tracking-widest">
              Admin Console
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end={item.exact}
                        className={`flex items-center gap-2 ${
                          active
                            ? "bg-accent text-accent-foreground font-bold"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
