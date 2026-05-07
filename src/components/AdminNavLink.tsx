/**
 * AdminNavLink — only checks admin role (and pulls supabase) on idle, after
 * the home page has stabilized. Keeps the navbar render free of supabase
 * dependencies for anonymous visitors. Shows for any admin scope.
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { prefetchRoute } from "@/lib/prefetch";

export default function AdminNavLink() {
  const [enabled, setEnabled] = useState(false);
  const [show, setShow] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (ric) {
      ric(() => setEnabled(true), { timeout: 5000 });
    } else {
      const t = window.setTimeout(() => setEnabled(true), 3000);
      return () => window.clearTimeout(t);
    }
  }, []);

  if (!enabled) return null;
  return <AdminCheck onResult={setShow} render={show} location={pathname} />;
}

function AdminCheck({
  onResult,
  render,
  location,
}: {
  onResult: (v: boolean) => void;
  render: boolean;
  location: string;
}) {
  type AccessHook = () => { ready: boolean; hasAnyScope: boolean };
  const [Hook, setHook] = useState<null | AccessHook>(null);
  useEffect(() => {
    let cancelled = false;
    import("@/hooks/useAdminRole").then((m) => {
      if (!cancelled) setHook(() => m.useAdminAccess);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Hook) return null;
  return <AdminCheckInner Hook={Hook} onResult={onResult} render={render} location={location} />;
}

function AdminCheckInner({
  Hook,
  onResult,
  render,
  location,
}: {
  Hook: () => { ready: boolean; hasAnyScope: boolean };
  onResult: (v: boolean) => void;
  render: boolean;
  location: string;
}) {
  const { ready, hasAnyScope } = Hook();
  useEffect(() => {
    if (ready) onResult(hasAnyScope);
  }, [ready, hasAnyScope, onResult]);

  if (!render) return null;
  const active = location === "/admin" || location.startsWith("/admin/");
  return (
    <Link
      to="/admin"
      onMouseEnter={() => prefetchRoute("/admin")}
      onFocus={() => prefetchRoute("/admin")}
      className={`text-sm font-medium transition-colors duration-300 inline-flex items-center gap-1 ${
        active ? "text-accent" : "text-muted-foreground hover:text-accent"
      }`}
    >
      <Shield size={14} /> Admin
    </Link>
  );
}
