/**
 * Manual test cases:
 * 1. Open /the-bar/leaderboard with no auth → all 4 tabs load.
 * 2. Logged-in with 0 attempts → "You: unranked" banner shows.
 * 3. Take a challenge → appear on leaderboard → "You" highlight visible.
 * 4. By Area: select area with no students → empty state.
 * 5. By College: select college → see ranked entries.
 * 6. Toggle opt-out → row disappears (verify with second account).
 * 7. Weekly tab: attempts older than current week excluded.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, ArrowLeft } from "lucide-react";
import { LeaderboardTable } from "@/components/bar/LeaderboardTable";
import type { LeaderboardEntry } from "@/components/bar/LeaderboardRow";
import { AREA_OF_LAW_LABELS } from "@/lib/bar/constants";
import type { AreaOfLaw, BarDesignation } from "@/lib/bar/types";

const PAGE_SIZE = 50;
const MAX_ROWS = 500;

type TabKey = "all-time" | "weekly" | "area" | "college";

const TAB_LABEL: Record<TabKey, string> = {
  "all-time": "All-Time",
  weekly: "This Week",
  area: "By Area",
  college: "By College",
};

interface CollegeOption {
  normalized: string;
  display: string;
  count: number;
}

export default function TheBarLeaderboard() {
  usePageMeta({
    title: "Leaderboard",
    description: "Top law students on the Bar — ranked by points, area, and college.",
    path: "/the-bar/leaderboard",
  });

  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/the-bar");
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "all-time";
  const area = (searchParams.get("area") as AreaOfLaw | null) || null;
  const college = searchParams.get("college") || null;
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasAttempts, setHasAttempts] = useState(false);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [colleges, setColleges] = useState<CollegeOption[]>([]);

  const setTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    sp.delete("page");
    setSearchParams(sp, { replace: true });
  };
  const setArea = (next: AreaOfLaw) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("area", next);
    sp.delete("page");
    setSearchParams(sp, { replace: true });
  };
  const setCollege = (next: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("college", next);
    sp.delete("page");
    setSearchParams(sp, { replace: true });
  };
  const setPage = (next: number) => {
    const sp = new URLSearchParams(searchParams);
    if (next <= 1) sp.delete("page");
    else sp.set("page", String(next));
    setSearchParams(sp, { replace: true });
  };

  // Auth state
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id ?? null;
      setCurrentUserId(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Has-the-current-user-ever-attempted check (for the "unranked" banner)
  useEffect(() => {
    if (!currentUserId) { setHasAttempts(false); return; }
    let active = true;
    supabase
      .from("bar_user_stats")
      .select("total_attempts")
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setHasAttempts((data?.total_attempts ?? 0) > 0);
      });
    return () => { active = false; };
  }, [currentUserId]);

  // Load college dropdown options on demand
  useEffect(() => {
    if (tab !== "college" || colleges.length > 0) return;
    let active = true;
    (async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => Promise<{ data: { user_id: string; college_normalized: string; college_display: string }[] | null; error: unknown }>;
        };
      })
        .from("bar_user_colleges")
        .select("user_id, college_normalized, college_display");
      if (!active) return;
      if (error) {
        console.error("[Leaderboard] colleges load error:", error);
        return;
      }
      const counts = new Map<string, CollegeOption>();
      for (const row of data ?? []) {
        const ex = counts.get(row.college_normalized);
        if (ex) ex.count += 1;
        else counts.set(row.college_normalized, {
          normalized: row.college_normalized,
          display: row.college_display,
          count: 1,
        });
      }
      const list = [...counts.values()]
        .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
        .slice(0, 100);
      setColleges(list);
    })();
    return () => { active = false; };
  }, [tab, colleges.length]);

  // Fetch leaderboard data when inputs change
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        let result: LeaderboardEntry[] = [];

        if (tab === "all-time") {
          const { data, error } = await supabase
            .from("bar_user_stats")
            .select(
              "user_id, total_points, accuracy_pct, current_streak, designation, last_attempt_at, profiles!inner(username, display_name, avatar_url, bar_leaderboard_opt_out)",
            )
            .gt("total_attempts", 0)
            .order("total_points", { ascending: false })
            .order("last_attempt_at", { ascending: true })
            .limit(MAX_ROWS);
          if (error) throw error;
          result = (data ?? [])
            .map((r: any) => ({
              user_id: r.user_id,
              username: r.profiles.username,
              display_name: r.profiles.display_name,
              avatar_url: r.profiles.avatar_url,
              designation: r.designation as BarDesignation,
              points: Number(r.total_points),
              accuracy_pct: Number(r.accuracy_pct),
              current_streak: Number(r.current_streak),
              _opt_out: r.profiles.bar_leaderboard_opt_out,
            }))
            .filter((r: any) => !r._opt_out);
        } else if (tab === "weekly") {
          const { data: weeklyRows, error: wErr } = await (supabase as any)
            .from("bar_weekly_stats")
            .select("user_id, weekly_points, weekly_accuracy_pct")
            .order("weekly_points", { ascending: false })
            .limit(MAX_ROWS);
          if (wErr) throw wErr;
          const weekly = (weeklyRows ?? []) as { user_id: string; weekly_points: number; weekly_accuracy_pct: number }[];
          const userIds = weekly.map((r) => r.user_id).filter(Boolean);
          if (userIds.length === 0) {
            result = [];
          } else {
            const [profilesRes, statsRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url, bar_leaderboard_opt_out")
                .in("id", userIds),
              supabase
                .from("bar_user_stats")
                .select("user_id, designation, current_streak")
                .in("user_id", userIds),
            ]);
            if (profilesRes.error) throw profilesRes.error;
            if (statsRes.error) throw statsRes.error;
            const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
            const sMap = new Map((statsRes.data ?? []).map((s: any) => [s.user_id, s]));
            result = weekly
              .map((r) => {
                const p = pMap.get(r.user_id);
                const s = sMap.get(r.user_id);
                if (!p) return null;
                return {
                  user_id: r.user_id,
                  username: p.username,
                  display_name: p.display_name,
                  avatar_url: p.avatar_url,
                  designation: (s?.designation ?? "trainee") as BarDesignation,
                  points: Number(r.weekly_points),
                  accuracy_pct: Number(r.weekly_accuracy_pct),
                  current_streak: Number(s?.current_streak ?? 0),
                  _opt_out: p.bar_leaderboard_opt_out,
                };
              })
              .filter((r: any) => r && !r._opt_out) as LeaderboardEntry[];
          }
        } else if (tab === "area") {
          if (!area) { result = []; }
          else {
            const { data, error } = await supabase
              .from("bar_user_stats_by_area")
              .select(
                "user_id, total_points, total_attempts, correct_attempts, profiles!inner(username, display_name, avatar_url, bar_leaderboard_opt_out), bar_user_stats!inner(designation, current_streak)",
              )
              .eq("area_of_law", area)
              .gt("total_attempts", 0)
              .order("total_points", { ascending: false })
              .limit(MAX_ROWS);
            if (error) throw error;
            result = (data ?? [])
              .map((r: any) => {
                const acc = r.total_attempts > 0
                  ? Math.round((r.correct_attempts * 10000) / r.total_attempts) / 100
                  : 0;
                return {
                  user_id: r.user_id,
                  username: r.profiles.username,
                  display_name: r.profiles.display_name,
                  avatar_url: r.profiles.avatar_url,
                  designation: r.bar_user_stats.designation as BarDesignation,
                  points: Number(r.total_points),
                  accuracy_pct: acc,
                  current_streak: Number(r.bar_user_stats.current_streak),
                  _opt_out: r.profiles.bar_leaderboard_opt_out,
                };
              })
              .filter((r: any) => !r._opt_out);
          }
        } else if (tab === "college") {
          if (!college) { result = []; }
          else {
            const { data: collegeRows, error: cErr } = await (supabase as any)
              .from("bar_user_colleges")
              .select("user_id")
              .eq("college_normalized", college);
            if (cErr) throw cErr;
            const userIds = (collegeRows ?? []).map((r: { user_id: string }) => r.user_id);
            if (userIds.length === 0) {
              result = [];
            } else {
              const { data, error } = await supabase
                .from("bar_user_stats")
                .select(
                  "user_id, total_points, accuracy_pct, current_streak, designation, profiles!inner(username, display_name, avatar_url, bar_leaderboard_opt_out)",
                )
                .in("user_id", userIds)
                .gt("total_attempts", 0)
                .order("total_points", { ascending: false })
                .limit(MAX_ROWS);
              if (error) throw error;
              result = (data ?? [])
                .map((r: any) => ({
                  user_id: r.user_id,
                  username: r.profiles.username,
                  display_name: r.profiles.display_name,
                  avatar_url: r.profiles.avatar_url,
                  designation: r.designation as BarDesignation,
                  points: Number(r.total_points),
                  accuracy_pct: Number(r.accuracy_pct),
                  current_streak: Number(r.current_streak),
                  _opt_out: r.profiles.bar_leaderboard_opt_out,
                }))
                .filter((r: any) => !r._opt_out);
            }
          }
        }

        if (!active) return;
        setEntries(result);
      } catch (e) {
        console.error("[Leaderboard] fetch error:", e);
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tab, area, college]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(pageStart, pageStart + PAGE_SIZE);

  const myIndex = useMemo(
    () => (currentUserId ? entries.findIndex((e) => e.user_id === currentUserId) : -1),
    [entries, currentUserId],
  );
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myPage = myRank ? Math.ceil(myRank / PAGE_SIZE) : null;
  const youOnThisPage = myRank !== null && myPage === safePage;

  const jumpToMe = () => {
    if (!myPage || !currentUserId) return;
    setPage(myPage);
    setTimeout(() => {
      const el = document.querySelector(`tr[data-row-id="${currentUserId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const pointsLabel = tab === "weekly" ? "Weekly Pts" : "Points";

  return (
    <section className="min-h-screen pt-24 pb-24 bg-background">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        {/* Hero */}
        <div className="text-center md:text-left">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
            <Trophy className="text-accent" size={28} />
            <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-foreground">
              Leaderboard
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Who's lawyering hardest right now.
          </p>
        </div>

        {/* Unranked banner for logged-in users with no attempts */}
        {currentUserId && !hasAttempts && (
          <Card className="border-2 border-accent/40 bg-accent/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground">You: unranked</p>
              <p className="text-sm text-muted-foreground">Take your first challenge to appear here.</p>
            </div>
            <Link to="/the-bar/browse">
              <Button size="sm" className="gap-2">Take a Challenge <ArrowRight size={14} /></Button>
            </Link>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="flex-wrap h-auto">
            {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
              <TabsTrigger key={k} value={k}>{TAB_LABEL[k]}</TabsTrigger>
            ))}
          </TabsList>

          {/* By Area selector */}
          <TabsContent value="area" className="mt-4">
            <div className="mb-4">
              <Select value={area ?? undefined} onValueChange={(v) => setArea(v as AreaOfLaw)}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select an area of law" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AREA_OF_LAW_LABELS) as AreaOfLaw[]).map((a) => (
                    <SelectItem key={a} value={a}>{AREA_OF_LAW_LABELS[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Body
              loading={loading}
              entries={pageEntries}
              startRank={pageStart + 1}
              currentUserId={currentUserId}
              pointsLabel={pointsLabel}
              empty={
                !area
                  ? "Choose an area of law to see its top performers."
                  : `No students have scored in ${AREA_OF_LAW_LABELS[area]} yet.`
              }
            />
          </TabsContent>

          {/* By College selector */}
          <TabsContent value="college" className="mt-4">
            <div className="mb-4">
              <Select value={college ?? undefined} onValueChange={(v) => setCollege(v)}>
                <SelectTrigger className="w-full sm:w-96">
                  <SelectValue placeholder="Select a college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No colleges yet.</div>
                  ) : colleges.map((c) => (
                    <SelectItem key={c.normalized} value={c.normalized}>
                      {c.display} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Body
              loading={loading}
              entries={pageEntries}
              startRank={pageStart + 1}
              currentUserId={currentUserId}
              pointsLabel={pointsLabel}
              empty={
                !college
                  ? "Choose a college to see its top students."
                  : `No students from this college on the board yet.`
              }
            />
          </TabsContent>

          <TabsContent value="all-time" className="mt-4">
            <Body
              loading={loading}
              entries={pageEntries}
              startRank={pageStart + 1}
              currentUserId={currentUserId}
              pointsLabel={pointsLabel}
              empty="Nobody's on the board yet. Be first."
            />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <Body
              loading={loading}
              entries={pageEntries}
              startRank={pageStart + 1}
              currentUserId={currentUserId}
              pointsLabel={pointsLabel}
              empty="No attempts logged this week. Be first."
            />
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {!loading && entries.length > PAGE_SIZE && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (safePage > 1) setPage(safePage - 1); }}
                  className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const p = i + 1;
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === safePage}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (safePage < totalPages) setPage(safePage + 1); }}
                  className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {/* "Jump to me" sticky footer */}
        {myRank !== null && !youOnThisPage && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border-2 border-accent rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              You're ranked #{myRank.toLocaleString()}
            </span>
            <Button size="sm" variant="default" onClick={jumpToMe} className="h-7 px-3 text-xs">
              Jump to your row
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Body({
  loading, entries, startRank, currentUserId, pointsLabel, empty,
}: {
  loading: boolean;
  entries: LeaderboardEntry[];
  startRank: number;
  currentUserId: string | null;
  pointsLabel: string;
  empty: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">{empty}</p>
      </Card>
    );
  }
  return (
    <LeaderboardTable
      entries={entries}
      startRank={startRank}
      currentUserId={currentUserId}
      pointsLabel={pointsLabel}
    />
  );
}
