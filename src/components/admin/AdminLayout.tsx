import { Link, Outlet } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAccess } from "@/hooks/useAdminRole";
import AdminSubNav from "./AdminSubNav";

export default function AdminLayout() {
  const { ready, hasAnyScope } = useAdminAccess();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!hasAnyScope) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center border-2 border-foreground space-y-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <div className="flex justify-center">
            <ShieldOff className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You don't have admin access to this console.
          </p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </Card>
      </div>
    );
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
