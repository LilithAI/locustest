import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";

export interface PlaybookProgressRow {
  guide_slug: string;
  started_at: string;
  last_read_at: string;
  completed_at: string | null;
}

export function usePlaybookProgress() {
  const { userId } = useAuthSession();
  const [rows, setRows] = useState<PlaybookProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profile_playbook_progress")
      .select("guide_slug, started_at, last_read_at, completed_at")
      .eq("user_id", userId);
    setRows((data as PlaybookProgressRow[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const markStarted = useCallback(
    async (slug: string) => {
      if (!userId) return;
      await supabase
        .from("profile_playbook_progress")
        .upsert(
          {
            user_id: userId,
            guide_slug: slug,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: "user_id,guide_slug" }
        );
      fetchRows();
    },
    [userId, fetchRows]
  );

  const toggleComplete = useCallback(
    async (slug: string) => {
      if (!userId) return;
      const existing = rows.find((r) => r.guide_slug === slug);
      const completed_at = existing?.completed_at ? null : new Date().toISOString();
      await supabase
        .from("profile_playbook_progress")
        .upsert(
          {
            user_id: userId,
            guide_slug: slug,
            last_read_at: new Date().toISOString(),
            completed_at,
          },
          { onConflict: "user_id,guide_slug" }
        );
      fetchRows();
    },
    [userId, rows, fetchRows]
  );

  const getStatus = useCallback(
    (slug: string): "unread" | "started" | "completed" => {
      const r = rows.find((x) => x.guide_slug === slug);
      if (!r) return "unread";
      if (r.completed_at) return "completed";
      return "started";
    },
    [rows]
  );

  return { userId, rows, loading, markStarted, toggleComplete, getStatus };
}
