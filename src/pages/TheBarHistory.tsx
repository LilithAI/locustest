import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, X, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { AttemptReviewDialog } from "@/components/bar/AttemptReviewDialog";
import { AREA_OF_LAW_LABELS, QUESTION_TYPE_LABELS, V1_QUESTION_TYPES } from "@/lib/bar/constants";
import { getRelativeDateLabel } from "@/lib/bar/display";

const PAGE_SIZE = 30;

interface AttemptRow {
  id: string;
  is_correct: boolean;
  points_awarded: number;
  attempted_at: string;
  challenge_id: string;
  bar_challenges: {
    title: string;
    question_type: string;
    area_of_law: string;
  } | null;
}

export default function TheBarHistory() {
  usePageMeta({
    title: "Attempt History · The Bar · Locus",
    description: "Your full Bar attempt history.",
    path: "/the-bar/history",
  });
  // No nav redirect — guests see a friendly sign-in card instead
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const [correctness, setCorrectness] = useState<"all" | "correct" | "incorrect">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

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
    if (!userId) { setLoading(false); setRows([]); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bar_attempts")
        .select("id, is_correct, points_awarded, attempted_at, challenge_id, bar_challenges(title, question_type, area_of_law)")
        .eq("user_id", userId)
        .order("attempted_at", { ascending: false })
        .limit(500);
      if (!active) return;
      setRows((data ?? []) as AttemptRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [authReady, userId]);

  const filtered = useMemo(() => {
    let out = rows;
    if (correctness === "correct") out = out.filter((r) => r.is_correct);
    else if (correctness === "incorrect") out = out.filter((r) => !r.is_correct);
    if (typeFilter !== "all") out = out.filter((r) => r.bar_challenges?.question_type === typeFilter);
    return out;
  }, [rows, correctness, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/the-bar">
            <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft size={16} /> Dashboard</Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-foreground">
            Attempt History
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={correctness} onValueChange={(v: any) => { setCorrectness(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="correct">Correct only</SelectItem>
              <SelectItem value="incorrect">Incorrect only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {V1_QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!userId && authReady ? (
          <Card className="border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to see your attempt history.
            </p>
            <Link to="/auth?next=/the-bar/history">
              <Button className="gap-2"><LogIn size={16} /> Sign in</Button>
            </Link>
          </Card>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No attempts to show.</p>
          </Card>
        ) : (
          <Card className="border-2 border-border overflow-hidden">
            <div className="divide-y divide-border">
              {pageItems.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReviewId(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    r.is_correct
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                  }`}>
                    {r.is_correct ? <Check size={14} /> : <X size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {r.bar_challenges?.title ?? "Challenge"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {QUESTION_TYPE_LABELS[(r.bar_challenges?.question_type ?? "mcq") as keyof typeof QUESTION_TYPE_LABELS]}
                      </Badge>
                      <span>{AREA_OF_LAW_LABELS[(r.bar_challenges?.area_of_law ?? "other") as keyof typeof AREA_OF_LAW_LABELS]}</span>
                      <span>·</span>
                      <span>{getRelativeDateLabel(r.attempted_at)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-base font-bold font-heading ${r.is_correct ? "text-accent" : "text-muted-foreground"}`}>
                      {r.is_correct ? "+" : ""}{r.points_awarded}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">pts</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                  className={page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={(e) => { e.preventDefault(); setPage(p); }}
                    className="cursor-pointer"
                  >{p}</PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                  className={page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <AttemptReviewDialog
        attemptId={reviewId}
        open={!!reviewId}
        onOpenChange={(v) => !v && setReviewId(null)}
      />
    </section>
  );
}
