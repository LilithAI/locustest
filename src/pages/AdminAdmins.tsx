import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useAdminAccess, type AdminScope } from "@/hooks/useAdminRole";
import AccessDenied from "@/components/admin/AccessDenied";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RoleKey = AdminScope;

interface UserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  roles: RoleKey[];
  is_self?: boolean;
}

const ROLE_DEFS: { key: RoleKey; label: string; short: string; description: string }[] = [
  { key: "admin", label: "Full Admin", short: "Admin", description: "Every admin power, including managing other admins." },
  { key: "opportunities_admin", label: "Opportunities", short: "Opps", description: "Post and edit vacancies, CFPs, moots, competitions." },
  { key: "waitlist_admin", label: "Waitlist", short: "Waitlist", description: "View waitlist signups and review firm suggestions." },
  { key: "bar_admin", label: "Bar", short: "Bar", description: "Manage Bar challenges, sources, and AI generations." },
  { key: "broadcast_admin", label: "Broadcasts", short: "Sends", description: "Draft and send email broadcasts." },
];

const ALL_KEYS: RoleKey[] = ROLE_DEFS.map((r) => r.key);

function normalizeRoles(raw: unknown): RoleKey[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter((r): r is string => typeof r === "string")
    .filter((r): r is RoleKey => (ALL_KEYS as string[]).includes(r));
}

export default function AdminAdmins() {
  usePageMeta({
    title: "Admin Access — Locus",
    description: "Grant or revoke admin access for Locus.",
    path: "/admin/admins",
  });

  const { ready, isAdmin } = useAdminAccess();

  const [admins, setAdmins] = useState<UserRow[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null); // `${userId}:${role}`
  const [confirmRevokeAdmin, setConfirmRevokeAdmin] = useState<UserRow | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    const { data, error } = await supabase.rpc("list_admins");
    if (error) {
      toast.error("Failed to load admins", { description: error.message });
      setAdmins([]);
    } else {
      const rows = ((data ?? []) as Array<{
        id: string;
        username: string | null;
        display_name: string | null;
        email: string | null;
        roles: string[] | null;
        is_self: boolean | null;
      }>).map((r) => ({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        email: r.email,
        roles: normalizeRoles(r.roles),
        is_self: !!r.is_self,
      }));
      setAdmins(rows);
    }
    setLoadingAdmins(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void loadAdmins();
  }, [isAdmin, loadAdmins]);

  // Debounced live search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("find_user_for_admin", { p_query: q });
      if (error) {
        toast.error("Search failed", { description: error.message });
        setResults([]);
      } else {
        const rows = ((data ?? []) as Array<{
          id: string;
          username: string | null;
          display_name: string | null;
          email: string | null;
          roles: string[] | null;
        }>).map((r) => ({
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          email: r.email,
          roles: normalizeRoles(r.roles),
        }));
        setResults(rows);
      }
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const refreshUserInLists = (userId: string, nextRoles: RoleKey[]) => {
    setResults((prev) => prev.map((u) => (u.id === userId ? { ...u, roles: nextRoles } : u)));
    // Admin list will re-fetch for accuracy (handles new entries / removals)
    void loadAdmins();
  };

  const toggleRole = async (user: UserRow, role: RoleKey, currentlyHas: boolean) => {
    // Self-revoke of full admin requires confirmation handled separately
    if (currentlyHas && role === "admin" && user.is_self) {
      toast.error("You cannot revoke your own Full Admin role.");
      return;
    }
    setActingKey(`${user.id}:${role}`);
    const fnName = currentlyHas ? "revoke_role" : "grant_role";
    const { error } = await supabase.rpc(fnName, {
      p_user_id: user.id,
      p_role: role,
    });
    setActingKey(null);
    if (error) {
      const msg = error.message?.includes("cannot_revoke_self_admin")
        ? "You cannot revoke your own Full Admin role."
        : error.message;
      toast.error(currentlyHas ? "Could not revoke" : "Could not grant", { description: msg });
      return;
    }
    const nextRoles = currentlyHas
      ? user.roles.filter((r) => r !== role)
      : [...user.roles.filter((r) => r !== role), role];
    refreshUserInLists(user.id, nextRoles);
    const def = ROLE_DEFS.find((r) => r.key === role);
    toast.success(
      `${currentlyHas ? "Revoked" : "Granted"} ${def?.label ?? role} ${currentlyHas ? "from" : "to"} ${user.username ?? user.email ?? "user"}`
    );
  };

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied message="Only Full Admins can manage admin access." />;
  }

  const renderRoleChips = (user: UserRow) => (
    <div className="flex flex-wrap gap-1.5">
      {ROLE_DEFS.map((def) => {
        const has = user.roles.includes(def.key);
        const key = `${user.id}:${def.key}`;
        const busy = actingKey === key;
        const blockSelfRevoke = has && def.key === "admin" && user.is_self;

        return (
          <button
            key={def.key}
            type="button"
            disabled={busy || blockSelfRevoke}
            onClick={() => {
              if (has && def.key === "admin" && !user.is_self) {
                setConfirmRevokeAdmin(user);
                return;
              }
              void toggleRole(user, def.key, has);
            }}
            title={blockSelfRevoke ? "You cannot revoke your own Full Admin" : def.description}
            className={`flex items-center gap-1 px-2 py-1 border-2 text-[10px] font-mono uppercase tracking-widest transition-all ${
              has
                ? "border-foreground bg-accent text-accent-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                : "border-foreground/30 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
            } ${busy || blockSelfRevoke ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {busy ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : has ? (
              <ShieldCheck className="w-3 h-3" />
            ) : (
              <ShieldOff className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{def.label}</span>
            <span className="sm:hidden">{def.short}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          Console / Access
        </p>
        <h1 className="font-heading text-3xl md:text-4xl font-black">Admin Access</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Toggle individual roles per user. Click a chip to grant or revoke that scope.
          Full Admin implies every other role.
        </p>
      </header>

      {/* Legend */}
      <section className="mb-6 border-2 border-foreground/30 bg-card p-3 text-xs">
        <div className="font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Roles
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
          {ROLE_DEFS.map((d) => (
            <li key={d.key}>
              <span className="font-bold text-foreground">{d.label}:</span> {d.description}
            </li>
          ))}
        </ul>
      </section>

      {/* Search */}
      <section className="mb-10">
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Find a user
        </h2>
        <div className="border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username, name, or email…"
              className="pl-9 border-2 border-foreground"
              autoComplete="off"
            />
          </div>

          <div className="mt-4 min-h-[3rem]">
            {query.trim().length < 2 ? (
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                Type at least 2 characters to search.
              </p>
            ) : searching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              <ul className="divide-y-2 divide-foreground/10 border-2 border-foreground/20">
                {results.map((r) => (
                  <li key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 hover:bg-accent/5">
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-extrabold truncate">
                        {r.display_name || r.username || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.username ? `@${r.username}` : null}
                        {r.username && r.email ? " · " : null}
                        {r.email}
                      </div>
                    </div>
                    {renderRoleChips(r)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Current admins */}
      <section>
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Current admins
          {!loadingAdmins && (
            <span className="text-xs font-mono text-muted-foreground tracking-widest">
              ({admins.length})
            </span>
          )}
        </h2>
        <div className="border-2 border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          {loadingAdmins ? (
            <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : admins.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No admins.</div>
          ) : (
            <ul className="divide-y-2 divide-foreground/10">
              {admins.map((a) => (
                <li key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-extrabold truncate flex items-center gap-2">
                      {a.display_name || a.username || "—"}
                      {a.is_self && (
                        <span className="text-[10px] font-mono uppercase tracking-widest border border-accent text-accent px-1.5 py-0.5">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.username ? `@${a.username}` : null}
                      {a.username && a.email ? " · " : null}
                      {a.email}
                    </div>
                  </div>
                  {renderRoleChips(a)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AlertDialog
        open={!!confirmRevokeAdmin}
        onOpenChange={(open) => !open && setConfirmRevokeAdmin(null)}
      >
        <AlertDialogContent className="border-2 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Full Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRevokeAdmin?.display_name || confirmRevokeAdmin?.username || "This user"}{" "}
              will lose Full Admin. They keep any scoped roles they still hold.
              You can re-grant at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRevokeAdmin) {
                  void toggleRole(confirmRevokeAdmin, "admin", true);
                }
                setConfirmRevokeAdmin(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
