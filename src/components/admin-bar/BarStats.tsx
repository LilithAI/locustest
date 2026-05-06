import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Counts = {
  byStatus: Record<string, number>;
  totalAttempts: number;
  activeUsers: number;
  pendingReview: number;
};

export default function BarStats() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const load = async () => {
      const [chRes, atRes] = await Promise.all([
        supabase.from("bar_challenges").select("status"),
        supabase.from("bar_attempts").select("user_id"),
      ]);
      const byStatus: Record<string, number> = { draft: 0, pending_review: 0, approved: 0, rejected: 0, archived: 0 };
      (chRes.data || []).forEach((r: { status: string }) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      const userIds = new Set((atRes.data || []).map((a: { user_id: string }) => a.user_id));
      setCounts({
        byStatus,
        totalAttempts: atRes.data?.length || 0,
        activeUsers: userIds.size,
        pendingReview: byStatus.pending_review || 0,
      });
    };
    load();
  }, []);

  if (!counts) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const Card1 = ({ label, value }: { label: string; value: number | string }) => (
    <Card className="p-6 border-2 border-border">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-4xl font-bold mt-2">{value}</div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card1 label="Approved Challenges" value={counts.byStatus.approved || 0} />
        <Card1 label="Pending Review" value={counts.pendingReview} />
        <Card1 label="Total Attempts" value={counts.totalAttempts} />
        <Card1 label="Active Users" value={counts.activeUsers} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(["draft", "pending_review", "approved", "rejected", "archived"] as const).map((s) => (
          <Card1 key={s} label={s.replace("_", " ")} value={counts.byStatus[s] || 0} />
        ))}
      </div>
    </div>
  );
}
