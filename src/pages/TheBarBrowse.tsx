import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { ChallengeCard } from "@/components/bar/ChallengeCard";
import {
  AREA_OF_LAW_LABELS, QUESTION_TYPE_LABELS, V1_QUESTION_TYPES,
} from "@/lib/bar/constants";
import { isPremiumType } from "@/lib/bar/premium";
import type { AreaOfLaw, Difficulty, QuestionType } from "@/lib/bar/types";
import { cn } from "@/lib/utils";

const QUESTION_TYPE_SHORT: Record<QuestionType, string> = {
  mcq: "MCQ",
  issue_spotter: "Issues",
  speed_round: "Speed",
  jurisdiction: "Jurisd.",
  document_review: "Doc Rev.",
  brief_builder: "Brief",
  ethics: "Ethics",
  client_counseling: "Counsel",
};

const QUESTION_TYPE_BLURB: Record<QuestionType | "all", string> = {
  all: "Every challenge in the library — pick a format to focus your practice.",
  mcq: "Single best-answer multiple choice. Test rules, doctrine, and quick recall.",
  issue_spotter: "Read a fact pattern and flag every legal issue hiding inside.",
  speed_round: "Rapid-fire prompts against the clock. Reward instinct and pace.",
  jurisdiction: "Pick the right court, forum, or governing law for the dispute.",
  document_review: "Mark up real clauses and contracts — find what a partner would catch.",
  brief_builder: "Assemble argument structure: issue, rule, application, conclusion.",
  ethics: "Navigate professional conduct dilemmas under the Bar Council rules.",
  client_counseling: "Advise a client in plain English — balance law, risk, and outcome.",
};

const PAGE_SIZE = 30;
const DIFF_RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

interface Challenge {
  id: string;
  question_type: QuestionType;
  area_of_law: AreaOfLaw;
  difficulty: Difficulty;
  prompt: string;
  points_base: number;
  source_citation: string | null;
  created_at: string | null;
}

export default function TheBarBrowse() {
  usePageMeta({
    title: "Browse Challenges · The Bar · Locus",
    description: "Pick a legal challenge and earn points.",
    path: "/the-bar/browse",
  });
  const [params, setParams] = useSearchParams();

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  const typeFilter = params.get("type") ?? "all";
  const areaFilter = params.get("area") ?? "all";
  const diffFilter = params.get("diff") ?? "all";
  const sortBy = params.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    (async () => {
      setLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      // Browse uses the safe student view; order by created_at (approved_at is not exposed).

      if (userId) {
        const [attemptedRes, dailyRes, challengeRes] = await Promise.all([
          supabase.from("bar_attempts").select("challenge_id").eq("user_id", userId),
          supabase.from("bar_daily_attempts").select("attempt_count").eq("user_id", userId).eq("attempt_date", todayStr).maybeSingle(),
          // Read from the safe view — correct answers stripped server-side
          supabase
            .from("bar_challenges_student" as any)
            .select("id, question_type, area_of_law, difficulty, prompt, points_base, source_citation, created_at")
            .order("created_at", { ascending: false })
            .limit(500),
        ]);
        if (!active) return;
        const attemptedIds = new Set((attemptedRes.data ?? []).map((a: any) => a.challenge_id));
        const all = ((challengeRes.data ?? []) as unknown) as Challenge[];
        setChallenges(all.filter((c) => !attemptedIds.has(c.id)));
        setTodayCount((dailyRes.data as any)?.attempt_count ?? 0);
      } else {
        // Guest: just list every approved challenge — no attempt filtering, no daily cap
        const { data: challengeData } = await supabase
          .from("bar_challenges_student" as any)
          .select("id, question_type, area_of_law, difficulty, prompt, points_base, source_citation, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (!active) return;
        setChallenges(((challengeData ?? []) as unknown) as Challenge[]);
        setTodayCount(0);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [authReady, userId]);

  const filtered = useMemo(() => {
    let out = challenges;
    if (typeFilter !== "all") out = out.filter((c) => c.question_type === typeFilter);
    if (areaFilter !== "all") out = out.filter((c) => c.area_of_law === areaFilter);
    if (diffFilter !== "all") out = out.filter((c) => c.difficulty === diffFilter);

    if (sortBy === "points_desc") out = [...out].sort((a, b) => b.points_base - a.points_base);
    else if (sortBy === "diff_asc") out = [...out].sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
    // newest is default order

    return out;
  }, [challenges, typeFilter, areaFilter, diffFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v === "all" || v === "newest") next.delete(k);
    else next.set(k, v);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const goPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remaining = Math.max(0, 20 - todayCount);
  const capReached = !!userId && todayCount >= 20;
  const capWarning = !!userId && todayCount >= 18 && !capReached;
  const isGuest = !userId;

  return (
    <section className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/the-bar">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} /> Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-foreground">
            Browse Challenges
          </h1>
        </div>

        {isGuest && (
          <Card className="border-2 border-accent/40 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 text-sm text-foreground">
              <span className="font-semibold">Browsing as guest.</span>{" "}
              <span className="text-muted-foreground">Sign in to take a challenge and earn points.</span>
            </div>
            <Link to="/auth?next=/the-bar/browse">
              <Button size="sm" className="w-full sm:w-auto">Sign in</Button>
            </Link>
          </Card>
        )}

        {capReached && (
          <Card className="border-2 border-rose-500/60 bg-rose-500/10 p-4 flex items-center gap-3">
            <AlertTriangle className="text-rose-500 flex-shrink-0" />
            <div>
              <div className="font-bold text-foreground">Daily cap reached</div>
              <div className="text-sm text-muted-foreground">You've used all 20 attempts for today. Come back tomorrow.</div>
            </div>
          </Card>
        )}
        {capWarning && (
          <Card className="border-2 border-amber-500/60 bg-amber-500/10 p-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0" />
            <div className="text-sm text-foreground">
              You have <span className="font-bold">{remaining}</span> attempt{remaining === 1 ? "" : "s"} left today (cap: 20).
            </div>
          </Card>
        )}

        {/* Type tab bar */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 w-full">
          <button
            type="button"
            onClick={() => updateParam("type", "all")}
            className={cn(
              "px-2 py-2 rounded-md border-2 text-sm font-bold whitespace-nowrap transition-all w-full",
              typeFilter === "all"
                ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--accent))]"
                : "bg-background text-foreground border-border hover:border-foreground"
            )}
          >
            All
          </button>
          {V1_QUESTION_TYPES.map((t) => {
            const premium = isPremiumType(t);
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => updateParam("type", t)}
                title={`${QUESTION_TYPE_LABELS[t]}${premium ? " · Locus+" : ""}`}
                className={cn(
                  "relative px-2 py-2 rounded-md border-2 text-sm font-bold whitespace-nowrap transition-all w-full",
                  active
                    ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--accent))]"
                    : "bg-background text-foreground border-border hover:border-foreground",
                  premium && !active && "ring-1 ring-accent/40",
                )}
              >
                {QUESTION_TYPE_SHORT[t]}
                {premium && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0.5 right-1 text-[10px] font-black leading-none",
                      active ? "text-accent" : "text-accent",
                    )}
                  >
                    +
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Format explainer */}
        <p className="text-sm text-muted-foreground -mt-2 px-1 flex items-center gap-2 flex-wrap">
          {typeFilter !== "all" && isPremiumType(typeFilter as QuestionType) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-accent/50 text-accent text-[10px] font-black tracking-wide leading-none">
              LOCUS+
            </span>
          )}
          <span>
            {QUESTION_TYPE_BLURB[(typeFilter as QuestionType | "all") in QUESTION_TYPE_BLURB ? (typeFilter as QuestionType | "all") : "all"]}
          </span>
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={areaFilter} onValueChange={(v) => updateParam("area", v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Area" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All Areas</SelectItem>
              {Object.entries(AREA_OF_LAW_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={(v) => updateParam("diff", v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => updateParam("sort", v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="points_desc">Points (high to low)</SelectItem>
              <SelectItem value="diff_asc">Difficulty (easy first)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              {!isGuest && challenges.length === 0
                ? "You've attempted every available challenge. Come back when new ones drop."
                : "No challenges match your filters. Try broadening."}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageItems.map((c) => (
                <ChallengeCard
                  key={c.id}
                  id={c.id}
                  question_type={c.question_type}
                  area_of_law={c.area_of_law}
                  difficulty={c.difficulty}
                  prompt={c.prompt}
                  points_base={c.points_base}
                  source_citation={c.source_citation}
                  disabled={capReached}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => { e.preventDefault(); if (page > 1) goPage(page - 1); }}
                      className={page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={(e) => { e.preventDefault(); goPage(p); }}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => { e.preventDefault(); if (page < totalPages) goPage(page + 1); }}
                      className={page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </section>
  );
}
