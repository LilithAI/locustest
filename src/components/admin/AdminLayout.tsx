import { Outlet } from "react-router-dom";
import AdminSubNav from "./AdminSubNav";
// import { useAdminAccess } from "@/hooks/useAdminRole"; // TEMP: bypassed for preview

export default function AdminLayout() {
  // TEMP: admin auth gate is intentionally bypassed so the panel is editable
  // in preview without re-logging in. RLS still protects the database, so
  // unauthenticated visitors will see empty data, not real admin powers.
  // Re-enable the original useAdminAccess() check when the user explicitly
  // asks to lock admin access again.
  return (
    <div className="min-h-screen flex flex-col w-full pt-16">
      <div className="bg-yellow-500/15 border-b-2 border-yellow-500 text-yellow-200 text-xs font-semibold px-4 py-1.5 text-center">
        TEMP: admin auth bypassed for preview — restore <code>useAdminAccess</code> gate before shipping.
      </div>
      <AdminSubNav />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
