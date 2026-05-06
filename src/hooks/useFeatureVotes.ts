import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/hooks/useAuthSession";

interface FeatureVote {
  id: string;
  feature_key: string;
}

// Module-level cache shared across pages so navigating Tools <-> Resources
// doesn't re-query Supabase every time. 60s TTL keeps numbers fresh enough.
const TTL_MS = 60_000;
type CountsCache = { data: Record<string, number>; ts: number } | null;
type VotesCache = { userId: string; data: FeatureVote[]; ts: number } | null;
let countsCache: CountsCache = null;
let votesCache: VotesCache = null;
let countsPromise: Promise<Record<string, number> | null> | null = null;
let votesPromise: Promise<FeatureVote[] | null> | null = null;

async function loadCounts(): Promise<Record<string, number> | null> {
  if (countsCache && Date.now() - countsCache.ts < TTL_MS) return countsCache.data;
  if (countsPromise) return countsPromise;
  countsPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc("get_feature_vote_counts");
      if (error || !data) return countsCache?.data ?? null;
      const counts: Record<string, number> = {};
      (data as { feature_key: string; vote_count: number }[]).forEach((row) => {
        counts[row.feature_key] = row.vote_count;
      });
      countsCache = { data: counts, ts: Date.now() };
      return counts;
    } catch {
      return countsCache?.data ?? null;
    } finally {
      countsPromise = null;
    }
  })();
  return countsPromise;
}

async function loadUserVotes(userId: string): Promise<FeatureVote[] | null> {
  if (votesCache && votesCache.userId === userId && Date.now() - votesCache.ts < TTL_MS) {
    return votesCache.data;
  }
  if (votesPromise) return votesPromise;
  votesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("feature_votes")
        .select("id, feature_key")
        .eq("user_id", userId);
      if (error || !data) return votesCache?.data ?? null;
      votesCache = { userId, data, ts: Date.now() };
      return data;
    } catch {
      return votesCache?.data ?? null;
    } finally {
      votesPromise = null;
    }
  })();
  return votesPromise;
}

function invalidateVotesCache() {
  votesCache = null;
  countsCache = null;
}

export function useFeatureVotes() {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(
    () => countsCache?.data ?? {}
  );
  const [userVotes, setUserVotes] = useState<FeatureVote[]>(
    () => votesCache?.data ?? []
  );
  const { userId } = useAuthSession();
  const [loading, setLoading] = useState(!countsCache);
  const navigate = useNavigate();

  // Load counts (cached)
  useEffect(() => {
    let cancelled = false;
    loadCounts().then((data) => {
      if (cancelled) return;
      if (data) setVoteCounts(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Load user votes (cached, per userId)
  useEffect(() => {
    if (!userId) { setUserVotes([]); return; }
    let cancelled = false;
    loadUserVotes(userId).then((data) => {
      if (!cancelled && data) setUserVotes(data);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const hasVoted = useCallback(
    (featureKey: string) => userVotes.some((v) => v.feature_key === featureKey),
    [userVotes]
  );

  const toggleVote = useCallback(
    async (featureKey: string) => {
      if (!userId) {
        navigate("/auth");
        return;
      }
      const existing = userVotes.find((v) => v.feature_key === featureKey);
      if (existing) {
        await supabase.from("feature_votes").delete().eq("id", existing.id);
        setUserVotes((prev) => prev.filter((v) => v.id !== existing.id));
        setVoteCounts((prev) => ({
          ...prev,
          [featureKey]: Math.max(0, (prev[featureKey] || 1) - 1),
        }));
        invalidateVotesCache();
      } else {
        const { data } = await supabase
          .from("feature_votes")
          .insert({ user_id: userId, feature_key: featureKey })
          .select("id, feature_key")
          .single();
        if (data) {
          setUserVotes((prev) => [...prev, data]);
          setVoteCounts((prev) => ({
            ...prev,
            [featureKey]: (prev[featureKey] || 0) + 1,
          }));
          invalidateVotesCache();
        }
      }
    },
    [userId, userVotes, navigate]
  );

  return { voteCounts, hasVoted, toggleVote, loading };
}
