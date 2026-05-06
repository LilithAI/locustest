// To grant admin: INSERT INTO user_roles (user_id, role) VALUES ('<your-uid>', 'admin').
// Do NOT hardcode any email or user id in this file.

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldOff, Loader2 } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { usePageMeta } from "@/hooks/usePageMeta";
import SourceLibrary from "@/components/admin-bar/SourceLibrary";
import ChallengesTable from "@/components/admin-bar/ChallengesTable";
import BarStats from "@/components/admin-bar/BarStats";
import AiGenerationsLog from "@/components/admin-bar/AiGenerationsLog";

export default function AdminBar() {
  const { ready: adminReady, hasScope } = useAdminAccess();
  const isAdmin = !adminReady ? null : hasScope("bar_admin");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "sources";

  usePageMeta({
    title: "Admin · The Bar — Locus",
    description: "Admin console for The Bar foundation.",
  });

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center border-2 border-border space-y-4">
          <div className="flex justify-center"><ShieldOff className="w-12 h-12 text-destructive" /></div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You don't have admin access to this page.
          </p>
          <Button asChild><Link to="/">Back to Home</Link></Button>
        </Card>
      </div>
    );
  }

  const onTabChange = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", v);
    if (v !== "challenges") next.delete("generation_id");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8 container mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">The Bar — Admin</h1>
        <p className="text-muted-foreground mt-1">Foundation tools: sources, challenges, stats, AI log.</p>
      </header>

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="ai-log">AI Log</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="mt-6"><SourceLibrary /></TabsContent>
        <TabsContent value="challenges" className="mt-6"><ChallengesTable /></TabsContent>
        <TabsContent value="stats" className="mt-6"><BarStats /></TabsContent>
        <TabsContent value="ai-log" className="mt-6"><AiGenerationsLog /></TabsContent>
      </Tabs>
    </div>
  );
}
