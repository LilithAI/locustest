import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Share2, ExternalLink, ArrowLeft, Briefcase, Pencil } from "lucide-react";
import { RankBadgeBlock } from "@/components/bar/RankBadgeBlock";
import type { BarDesignation } from "@/lib/bar/types";
import ActivityHeatmap from "@/components/profile/ActivityHeatmap";
import { useNavigate } from "react-router-dom";
import { withRef } from "@/lib/share";

interface BarStats {
  designation: BarDesignation;
  total_points: number;
  accuracy_pct: number;
  current_streak: number;
  rank_position: number | null;
  is_owner: boolean;
  opted_out: boolean;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  college: string | null;
  degree: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  subjects_of_interest: string[] | null;
  created_at: string;
  open_to_opportunities: boolean;
  is_pace_setter?: boolean;
}

interface Internship {
  id: string;
  firm_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

type MootResult = "winner" | "runner_up" | "semi_finalist" | "quarter_finalist" | "participant";
interface Moot {
  id: string;
  competition_name: string;
  year: number;
  role: "speaker" | "researcher" | "both";
  result: MootResult;
}

interface Publication {
  id: string;
  title: string;
  publisher: string;
  url: string | null;
  publication_date: string;
}

const RESULT_LABEL: Record<MootResult, string> = {
  winner: "Winner",
  runner_up: "Runner-up",
  semi_finalist: "Semi-finalist",
  quarter_finalist: "Quarter-finalist",
  participant: "Participant",
};

const fmtMonthYear = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const fmtJoined = (d: string) =>
  `Joined ${new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;

const initials = (name: string | null, username: string) => {
  const source = (name && name.trim()) || username;
  const parts = source.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
};

export default function PublicProfile() {
  const { username: rawUsername } = useParams<{ username: string }>();
  const username = (rawUsername || "").toLowerCase();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [moots, setMoots] = useState<Moot[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [activeTab, setActiveTab] = useState<string>("experience");
  const [barStats, setBarStats] = useState<BarStats | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setViewerId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const metaTitle = profile
    ? `${profile.display_name || profile.username} (@${profile.username}) — Locus`
    : "Profile — Locus";
  const metaDescription = profile
    ? (profile.bio?.slice(0, 160) ||
        `Law student profile on Locus. View ${profile.display_name || profile.username}'s experience, moots, publications and more.`)
    : "Law student profile on Locus.";
  usePageMeta({ title: metaTitle, description: metaDescription, path: `/u/${username}` });

  useEffect(() => {
    let mounted = true;
    if (!username) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      // Single round-trip via SECURITY DEFINER RPC — replaces 5 queries
      // (profile + 3 children + bar stats + rank).
      const { data, error } = await supabase.rpc("get_public_profile", {
        p_username: username,
      });

      if (!mounted) return;

      if (error) {
        console.error("[PublicProfile] rpc error", error);
        setProfile(null);
        setInternships([]);
        setMoots([]);
        setPublications([]);
        setBarStats(null);
        setLoading(false);
        return;
      }

      const d = (data ?? {}) as unknown as {
        profile: Profile | null;
        internships?: Internship[];
        moots?: Moot[];
        publications?: Publication[];
        bar?: {
          designation: BarDesignation;
          total_points: number;
          accuracy_pct: number | string;
          current_streak: number;
          total_attempts: number;
          rank_position: number | null;
          opted_out: boolean;
        } | null;
      };

      if (!d.profile) {
        setProfile(null);
        setInternships([]);
        setMoots([]);
        setPublications([]);
        setBarStats(null);
        setLoading(false);
        return;
      }

      setProfile(d.profile);
      setInternships(d.internships ?? []);
      setMoots(d.moots ?? []);
      setPublications(d.publications ?? []);

      if (d.bar) {
        setBarStats({
          designation: d.bar.designation,
          total_points: d.bar.total_points,
          accuracy_pct: Number(d.bar.accuracy_pct),
          current_streak: d.bar.current_streak,
          rank_position: d.bar.rank_position,
          // is_owner is a view-time computation — derive from cached viewer.
          is_owner: viewerId === d.profile.id,
          opted_out: d.bar.opted_out,
        });
      } else {
        setBarStats(null);
      }
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [username, viewerId]);

  useEffect(() => {
    if (loading || hasAutoSelected.current || !profile) return;
    hasAutoSelected.current = true;
    if (internships.length) setActiveTab("experience");
    else if (moots.length) setActiveTab("moots");
    else if (publications.length) setActiveTab("publications");
    // else: stay on "experience" so the empty state shows
  }, [loading, profile, internships.length, moots.length, publications.length]);

  const handleShare = async () => {
    const url = withRef(`${window.location.origin}/u/${username}`, "profile");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-xl flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-3xl font-extrabold font-heading text-foreground mb-3">
            No student found with this username
          </h1>
          <p className="text-muted-foreground mb-8">
            The profile you're looking for doesn't exist or hasn't been claimed yet.
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} /> Back to Home
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  const academicLine = (() => {
    const parts: string[] = [];
    if (profile.degree) parts.push(profile.degree);
    if (profile.graduation_year) parts.push(`Class of ${profile.graduation_year}`);
    return parts.join(" · ");
  })();

  const subjects = profile.subjects_of_interest || [];

  return (
    <section className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Left column */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-5">
          <Avatar className="h-32 w-32 border-2 border-border">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.display_name || profile.username} /> : null}
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-bold">
              {initials(profile.display_name, profile.username)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground leading-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
            {profile.open_to_opportunities && (
              <span className="mt-2 inline-flex items-center gap-1.5 border-2 border-accent bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent rounded-full">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Open to internships
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          )}

          {(profile.college || academicLine || profile.cgpa !== null) && (
            <div className="space-y-2 pt-2 border-t border-border">
              {profile.college && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">College</p>
                  <p className="text-sm text-foreground">{profile.college}</p>
                </div>
              )}
              {academicLine && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Degree</p>
                  <p className="text-sm text-foreground">{academicLine}</p>
                </div>
              )}
              {profile.cgpa !== null && profile.cgpa !== undefined && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">CGPA</p>
                  <p className="text-sm text-foreground">{Number(profile.cgpa).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {barStats && (
            <div className="pt-2 border-t border-border">
              <RankBadgeBlock
                designation={barStats.designation}
                totalPoints={barStats.total_points}
                accuracyPct={barStats.accuracy_pct}
                currentStreak={barStats.current_streak}
                rankPosition={barStats.rank_position}
                isOwner={barStats.is_owner}
                optedOut={barStats.opted_out}
                username={profile.username}
              />
            </div>
          )}

          {subjects.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Subjects of interest</p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">{fmtJoined(profile.created_at)}</p>
            <Button onClick={handleShare} variant="outline" size="sm" className="w-full gap-2">
              <Share2 className="h-4 w-4" /> Share profile
            </Button>
          </div>
        </aside>

        {/* Right column */}
        <main className="space-y-6">
          {/* Owner action bar */}
          {viewerId === profile.id && (
            <div className="flex flex-wrap items-center gap-2 border-2 border-border bg-card px-4 py-3 shadow-[3px_3px_0_0_hsl(var(--border))]">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Your profile
              </span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/profile/edit")}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/applications")}>
                <Briefcase className="h-3.5 w-3.5" /> Track applications
              </Button>
            </div>
          )}

          {profile.is_pace_setter && (
            <div className="border-2 border-foreground bg-accent text-accent-foreground p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
              <p className="font-heading font-extrabold uppercase tracking-wider text-sm">
                Locus practice account
              </p>
              <p className="text-sm mt-1.5 leading-relaxed">
                Benchmark stats so the leaderboard isn't empty. Not a real user — no internships, moots, or publications to show.
              </p>
            </div>
          )}

          {/* Activity heatmap */}
          {!profile.is_pace_setter && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <ActivityHeatmap userId={profile.id} />
              </CardContent>
            </Card>
          )}

          {!profile.is_pace_setter && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="experience">Experience ({internships.length})</TabsTrigger>
              <TabsTrigger value="moots">Moots ({moots.length})</TabsTrigger>
              <TabsTrigger value="publications">Publications ({publications.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="experience" className="space-y-3 mt-4">
              {internships.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No internships listed yet.</p>
              )}
              {internships.map((i) => (
                <Card key={i.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{i.firm_name}</p>
                        <p className="text-sm text-muted-foreground">{i.role}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {fmtMonthYear(i.start_date)} — {i.end_date ? fmtMonthYear(i.end_date) : "Present"}
                      </p>
                    </div>
                    {i.description && (
                      <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">{i.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="moots" className="space-y-3 mt-4">
              {moots.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No moot court participation listed yet.</p>
              )}
              {moots.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{m.competition_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-sm text-muted-foreground capitalize">{m.role}</span>
                          <span className="text-muted-foreground">·</span>
                          <ResultBadge result={m.result} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{m.year}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="publications" className="space-y-3 mt-4">
              {publications.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No publications listed yet.</p>
              )}
              {publications.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-foreground hover:text-accent inline-flex items-center gap-1.5"
                          >
                            {p.title}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <p className="font-semibold text-foreground">{p.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-0.5">{p.publisher}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date(p.publication_date).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
          )}
        </main>
      </div>
    </section>
  );
}

function ResultBadge({ result }: { result: MootResult }) {
  const label = RESULT_LABEL[result];
  switch (result) {
    case "winner":
      // Yellow/gold maps to the brand accent token
      return <Badge className="bg-accent text-accent-foreground hover:bg-accent">{label}</Badge>;
    case "runner_up":
      // Silver — use muted/secondary contrast
      return <Badge variant="secondary">{label}</Badge>;
    case "semi_finalist":
    case "quarter_finalist":
      return <Badge variant="outline">{label}</Badge>;
    case "participant":
    default:
      return <Badge variant="outline" className="text-muted-foreground">{label}</Badge>;
  }
}
