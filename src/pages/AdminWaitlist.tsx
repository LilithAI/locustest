import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminRole";

interface Submission {
  id: string;
  type: string;
  email: string;
  data: Record<string, string>;
  created_at: string;
}

export default function AdminWaitlist() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { ready: adminReady, hasScope } = useAdminAccess();
  const isAdmin = !adminReady ? null : hasScope("waitlist_admin");

  useEffect(() => {
    if (isAdmin === null) return;
    if (isAdmin === false) {
      // Either not signed in or signed in as a non-admin.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) navigate("/auth");
      });
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data, error } = await (supabase.from("waitlist_submissions" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (error) {
        console.error("Cannot load submissions — you may not have admin access.", error);
      }
      setSubmissions((data as Submission[]) || []);
      setLoading(false);
    };
    load();
  }, [navigate, isAdmin]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-heading text-2xl font-bold">Access denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.type === filter);

  const badgeColor: Record<string, string> = {
    student: "bg-emerald-500/20 text-emerald-400",
    firm: "bg-amber-500/20 text-amber-400",
    institution: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-2">Waitlist Submissions</h1>
        <p className="text-muted-foreground mb-8">
          {submissions.length} total submission{submissions.length !== 1 ? "s" : ""}
        </p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "student", "firm", "institution"].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === t
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}s
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Details</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor[s.type] || ""}`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{s.email}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {Object.entries(s.data || {}).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          <span className="text-foreground/60">{k}:</span> {v}
                        </span>
                      ))}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
