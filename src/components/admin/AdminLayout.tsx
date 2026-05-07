import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { useAuthSession } from "@/hooks/useAuthSession";
import AdminSubNav from "./AdminSubNav";

export default function AdminLayout() {
  const { ready: authReady, userId } = useAuthSession();
  const { ready, hasAnyScope } = useAdminAccess();

  if (!authReady || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!userId || !hasAnyScope) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col w-full pt-16">
      <AdminSubNav />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
