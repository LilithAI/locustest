import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminRole";
import { toast } from "sonner";

interface Props {
  firmSlug: string;
  onSuccess?: () => void;
}

export function RefreshIntelligenceButton({ firmSlug, onSuccess }: Props) {
  const { isAdmin, ready } = useAdminAccess();
  const [busy, setBusy] = useState(false);

  if (!ready || !isAdmin) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    const tid = toast.loading(`Refreshing intelligence for ${firmSlug}…`, {
      description: "Crawling website + searching news. ~20-40s.",
    });
    try {
      const { data, error } = await supabase.functions.invoke(
        "refresh-firm-intelligence",
        { body: { slug: firmSlug } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const counts = data?.counts ?? {};
      toast.success(`Done — ${data?.completeness ?? 0}% complete`, {
        id: tid,
        description: `Practices: ${counts.practice_areas ?? 0} · Offices: ${counts.offices ?? 0} · Rankings: ${counts.rankings ?? 0} · News: ${counts.news ?? 0}`,
      });
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Refresh failed", { id: tid, description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-lg shadow-foreground/20 transition hover:opacity-90 disabled:opacity-60"
      title="Admin only · Refresh firm intelligence via Firecrawl + AI"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {busy ? "Refreshing…" : "Refresh intelligence"}
    </button>
  );
}
