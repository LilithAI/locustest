import { useEffect, useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import IdentitySection from "@/components/profile/IdentitySection";
import AcademicsSection from "@/components/profile/AcademicsSection";
import InternshipsSection, { Internship } from "@/components/profile/InternshipsSection";
import MootsSection, { Moot } from "@/components/profile/MootsSection";
import PublicationsSection, { Publication } from "@/components/profile/PublicationsSection";
import CvSection from "@/components/profile/CvSection";
import BarPrivacySection from "@/components/profile/BarPrivacySection";
import OpenToOpportunitiesSection from "@/components/profile/OpenToOpportunitiesSection";
import OpportunityPreferencesSection from "@/components/profile/OpportunityPreferencesSection";
import ProfileStrengthMeter from "@/components/profile/ProfileStrengthMeter";

type Degree = "BA LLB" | "BBA LLB" | "BCom LLB" | "LLB (3yr)" | "LLM" | "Other";

export default function ProfileEdit() {
  usePageMeta({ title: "Edit Profile", description: "Update your Locus merit profile.", path: "/profile/edit" });
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Identity
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Academics
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState<Degree | "">("");
  const [graduationYear, setGraduationYear] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  // Lists
  const [internships, setInternships] = useState<Internship[]>([]);
  const [moots, setMoots] = useState<Moot[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);

  // CV
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvUploadedAt, setCvUploadedAt] = useState<string | null>(null);
  const [applicationsCount, setApplicationsCount] = useState(0);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log("[ProfileEdit] init start");
      let uid: string | null = null;

      try {
        // 1. Session
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!mounted) return;
          if (!session) {
            console.log("[ProfileEdit] no session, redirecting");
            navigate("/auth?next=/profile/edit");
            return;
          }
          uid = session.user.id;
          setUserId(uid);
          console.log("[ProfileEdit] session resolved");
        } catch (e) {
          console.error("[ProfileEdit] session error:", e);
          toast.error("Could not verify session. Please sign in again.");
          return;
        }

        // 2. Identities (non-blocking)
        try {
          console.log("[ProfileEdit] fetching identities");
          const { data: userRes, error: userErr } = await supabase.auth.getUser();
          if (userErr) throw userErr;
          if (mounted) {
            const identities = userRes?.user?.identities ?? [];
            const hasPwd = identities.some((i) => i.provider === "email");
            setHasPassword(hasPwd);
            console.log(`[ProfileEdit] identities fetched (hasPassword=${hasPwd})`);
          }
        } catch (e) {
          console.error("[ProfileEdit] identities error (defaulting hasPassword=true):", e);
          if (mounted) setHasPassword(true);
        }

        // 3. Profile + lists
        try {
          console.log("[ProfileEdit] fetching profile + lists");
          const [profileRes, cvRes, internshipsRes, mootsRes, pubsRes] = await Promise.all([
            supabase.from("profiles").select("id, username, display_name, avatar_url, bio, college, degree, graduation_year, cgpa, subjects_of_interest, open_to_opportunities, bar_leaderboard_opt_out, applications_count, created_at").eq("id", uid!).maybeSingle(),
            supabase.rpc("get_own_cv_ref"),
            supabase.from("profile_internships").select("*").eq("user_id", uid!).order("start_date", { ascending: false }),
            supabase.from("profile_moots").select("*").eq("user_id", uid!).order("year", { ascending: false }),
            supabase.from("profile_publications").select("*").eq("user_id", uid!).order("publication_date", { ascending: false }),
          ]);

          if (!mounted) return;

          console.log(`[ProfileEdit] profile fetched (rowPresent=${!!profileRes.data})`);
          if (profileRes.error) console.error("[ProfileEdit] profile error:", profileRes.error);

          if (!profileRes.data && !profileRes.error) {
            console.error("[ProfileEdit] profile row missing for authenticated user", uid);
            toast.error("Profile not found. Please sign out and sign back in.");
          }

          if (profileRes.data) {
            const p = profileRes.data;
            setDisplayName(p.display_name || "");
            setUsername(p.username || "");
            setBio(p.bio || "");
            setAvatarUrl(p.avatar_url || null);
            setCollege(p.college || "");
            setDegree((p.degree as Degree) || "");
            setGraduationYear(p.graduation_year ? String(p.graduation_year) : "");
            setCgpa(p.cgpa !== null && p.cgpa !== undefined ? String(p.cgpa) : "");
            setSubjects(p.subjects_of_interest || []);
            const cvRow = Array.isArray(cvRes.data) ? cvRes.data[0] : cvRes.data;
            setCvUrl((cvRow as { cv_url?: string | null })?.cv_url ?? null);
            setCvUploadedAt((cvRow as { cv_uploaded_at?: string | null })?.cv_uploaded_at ?? null);
            setApplicationsCount((p as { applications_count?: number }).applications_count ?? 0);
          }

          if (internshipsRes.error) console.error("[ProfileEdit] internships error:", internshipsRes.error);
          if (mootsRes.error) console.error("[ProfileEdit] moots error:", mootsRes.error);
          if (pubsRes.error) console.error("[ProfileEdit] publications error:", pubsRes.error);

          if (internshipsRes.data) setInternships(internshipsRes.data as Internship[]);
          if (mootsRes.data) setMoots(mootsRes.data as Moot[]);
          if (pubsRes.data) setPublications(pubsRes.data as Publication[]);

          console.log(
            `[ProfileEdit] lists fetched (internships=${internshipsRes.data?.length ?? 0}, moots=${mootsRes.data?.length ?? 0}, publications=${pubsRes.data?.length ?? 0})`
          );
        } catch (e) {
          console.error("[ProfileEdit] profile/lists error:", e);
          toast.error("Could not load profile data.");
        }
      } catch (e) {
        console.error("[ProfileEdit] init unexpected error:", e);
      } finally {
        if (mounted) setLoading(false);
        console.log("[ProfileEdit] init done");
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) navigate("/auth?next=/profile/edit");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, refreshTick]);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); }
  };

  // After load, scroll to #preferences if requested via hash.
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#preferences") return;
    const el = document.getElementById("preferences");
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [loading]);

  if (loading || !userId) {
    return (
      <div className="min-h-screen px-4 py-20 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground font-heading">Edit Profile</h1>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Back</Button>
        </div>

        <ProfileStrengthMeter
          variant="compact"
          avatarUrl={avatarUrl}
          bio={bio}
          college={college}
          degree={degree}
          graduationYear={graduationYear}
          cgpa={cgpa}
          subjectsCount={subjects.length}
          internshipsCount={internships.length}
          mootsCount={moots.length}
          publicationsCount={publications.length}
          cvUrl={cvUrl}
          applicationsCount={applicationsCount}
        />

        <button
          type="button"
          onClick={() => navigate("/applications")}
          className="group flex w-full items-center justify-between gap-3 border-2 border-border bg-card px-4 py-3 text-left shadow-[3px_3px_0_0_hsl(var(--border))] transition-all hover:border-accent hover:shadow-[5px_5px_0_0_hsl(var(--accent))]"
        >
          <div>
            <div className="font-heading text-sm font-extrabold uppercase tracking-wider text-foreground">
              Track applications
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Log every firm you apply to. Private to you. Get nudges to follow up.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform">
            OPEN →
          </span>
        </button>

        <IdentitySection
          userId={userId}
          displayName={displayName} setDisplayName={setDisplayName}
          username={username} setUsername={setUsername}
          bio={bio} setBio={setBio}
          avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
        />

        <AcademicsSection
          userId={userId}
          college={college} setCollege={setCollege}
          degree={degree} setDegree={setDegree}
          graduationYear={graduationYear} setGraduationYear={setGraduationYear}
          cgpa={cgpa} setCgpa={setCgpa}
          subjects={subjects} setSubjects={setSubjects}
        />

        <InternshipsSection userId={userId} internships={internships} setInternships={setInternships} />
        <MootsSection userId={userId} moots={moots} setMoots={setMoots} />
        <PublicationsSection userId={userId} publications={publications} setPublications={setPublications} />
        <CvSection
          userId={userId}
          cvUrl={cvUrl}
          cvUploadedAt={cvUploadedAt}
          setCvUrl={setCvUrl}
          setCvUploadedAt={setCvUploadedAt}
          current={{
            bio,
            college,
            degree,
            graduationYear,
            subjects,
            internships,
            moots,
            publications,
          }}
          onParsedApplied={() => setRefreshTick((t) => t + 1)}
        />

        <OpenToOpportunitiesSection userId={userId} />
        <OpportunityPreferencesSection userId={userId} />
        <BarPrivacySection userId={userId} />

        {hasPassword && (
          <Card>
            <CardHeader><CardTitle className="font-heading">Change password</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-pwd">New password</Label>
                <Input id="new-pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirm password</Label>
                <Input id="confirm-pwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPwd} size="sm">Update password</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
