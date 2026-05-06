import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Send, Users, Briefcase, Sparkles, Beaker, Eye, Copy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { mdToHtml } from "@/lib/email-markdown";
import { useAdminAccess } from "@/hooks/useAdminRole";
import AccessDenied from "@/components/admin/AccessDenied";
import { Loader2 } from "lucide-react";

type Segment = "all" | "beta" | "applicants";

interface Broadcast {
  id: string;
  subject: string;
  body_markdown: string | null;
  cta_label: string | null;
  cta_url: string | null;
  recipient_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const SEGMENTS: { value: Segment; label: string; icon: typeof Users; hint: string }[] = [
  { value: "all", label: "All users", icon: Users, hint: "Every signed-up Locus user" },
  { value: "beta", label: "Beta testers", icon: Sparkles, hint: "Claimed beta tester slots" },
  { value: "applicants", label: "Active applicants", icon: Briefcase, hint: "Users with ≥1 logged application" },
];

export default function AdminBroadcasts() {
  usePageMeta({ title: "Broadcasts — Admin", description: "Send updates to Locus users.", path: "/admin/broadcasts" });

  const { ready: adminReady, hasScope } = useAdminAccess();
  const [subject, setSubject] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [loadedFrom, setLoadedFrom] = useState<{ id: string; subject: string; sent_at: string | null; status: string } | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("update_broadcasts")
      .select("id, subject, body_markdown, cta_label, cta_url, recipient_count, status, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as Broadcast[]) ?? []);
  };

  useEffect(() => { void loadHistory(); }, []);

  const handleLoad = (b: Broadcast) => {
    setSubject(b.subject ?? "");
    setBodyMarkdown(b.body_markdown ?? "");
    setCtaLabel(b.cta_label ?? "");
    setCtaUrl(b.cta_url ?? "");
    setLoadedFrom({ id: b.id, subject: b.subject, sent_at: b.sent_at, status: b.status });
    toast.success("Loaded into composer — edit and send as a new broadcast");
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleClearLoad = () => {
    setSubject(""); setBodyMarkdown(""); setCtaLabel(""); setCtaUrl("");
    setLoadedFrom(null);
  };

  const previewHtml = useMemo(
    () => (bodyMarkdown.trim() ? mdToHtml(bodyMarkdown) : ""),
    [bodyMarkdown]
  );

  const canSubmit = subject.trim().length > 0 && bodyMarkdown.trim().length > 0;

  const handleSend = async () => {
    if (!canSubmit) {
      toast.error("Subject and body are required");
      return;
    }
    if (!confirm(`Send "${subject}" to ${segment} segment? This cannot be undone.`)) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: {
        subject: subject.trim(),
        bodyMarkdown: bodyMarkdown.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        segment,
      },
    });
    setSending(false);

    if (error) {
      // Try to read the error body returned by the edge function
      let detail = "";
      try {
        const ctx: any = (error as any).context;
        if (ctx?.json) detail = (await ctx.json())?.detail ?? (await ctx.json())?.error ?? "";
        else if (ctx?.text) detail = await ctx.text();
      } catch { /* noop */ }
      toast.error(detail ? `Send failed: ${detail}` : (error.message || "Failed to send broadcast"));
      return;
    }
    const queued = data?.queued ?? 0;
    const skipped = data?.skippedNoEmail ?? 0;
    const failed = data?.failed ?? 0;
    if (queued === 0) {
      const why = data?.firstError ? ` — ${data.firstError}` : "";
      toast.error(`Queued 0 recipients${skipped ? ` (${skipped} skipped)` : ""}${failed ? ` (${failed} failed)` : ""}${why}`);
      return;
    }
    toast.success(`Queued to ${queued} recipients${skipped ? ` · ${skipped} skipped` : ""}${failed ? ` · ${failed} failed` : ""}`);
    setSubject(""); setBodyMarkdown(""); setCtaLabel(""); setCtaUrl(""); setLoadedFrom(null);
    void loadHistory();
  };

  const handleTest = async () => {
    if (!canSubmit) {
      toast.error("Subject and body are required");
      return;
    }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("send-broadcast", {
      body: {
        subject: subject.trim(),
        bodyMarkdown: bodyMarkdown.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        testOnly: true,
      },
    });
    setTesting(false);
    if (error) {
      let detail = "";
      try {
        const ctx: any = (error as any).context;
        if (ctx?.json) { const j = await ctx.json(); detail = j?.detail ?? j?.error ?? ""; }
        else if (ctx?.text) detail = await ctx.text();
      } catch { /* noop */ }
      toast.error(detail ? `Test failed: ${detail}` : (error.message || "Test send failed"));
      return;
    }
    toast.success(`Test sent to ${data?.sentTo ?? "you"} — check your inbox`);
  };

  const PreviewCard = (
    <div className="border-2 border-foreground bg-white text-black shadow-[6px_6px_0_0_hsl(var(--foreground))]">
      <div className="px-5 py-3 border-b-2 border-foreground bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
        <Eye className="w-3.5 h-3.5" /> Live preview
      </div>
      <div className="p-6 max-h-[640px] overflow-y-auto">
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px", color: "#0A0A0A", lineHeight: 1.3 }}>
          {subject || "Your subject line"}
        </h1>
        {previewHtml ? (
          <div
            style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p style={{ fontSize: 14, color: "#9ca3af", fontStyle: "italic" }}>Body preview appears here…</p>
        )}
        {ctaLabel.trim() && ctaUrl.trim() && (
          <div style={{ margin: "20px 0 8px" }}>
            <a
              href={ctaUrl}
              style={{
                display: "inline-block",
                padding: "12px 22px",
                background: "#FFE600",
                color: "#0A0A0A",
                fontWeight: 800,
                textDecoration: "none",
                border: "2px solid #0A0A0A",
                boxShadow: "4px 4px 0 0 #0A0A0A",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {ctaLabel}
            </a>
          </div>
        )}
        <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "28px 0 14px" }} />
        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
          Locus by LexRoot · The system appends an Unsubscribe footer automatically.
        </p>
      </div>
    </div>
  );

  if (!adminReady) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }
  if (!hasScope("broadcast_admin")) {
    return <AccessDenied message="You need Broadcast admin access to send updates." />;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Outreach</p>
        <h1 className="font-heading text-3xl md:text-4xl font-black flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-accent" /> Broadcasts
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send a one-off update email to a chosen segment. Markdown supported.
        </p>
      </header>

      <div ref={composerRef} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-8 mb-10">
        <section className="border-2 border-foreground bg-card p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-5">
          {loadedFrom && (
            <div className="flex items-start gap-3 border-2 border-accent bg-accent/10 p-3">
              <Copy className="w-4 h-4 mt-0.5 text-accent shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">Editing copy of</p>
                <p className="font-heading font-extrabold truncate">{loadedFrom.subject}</p>
                <p className="text-muted-foreground mt-0.5">
                  {loadedFrom.sent_at ? `Sent ${new Date(loadedFrom.sent_at).toLocaleString()}` : `Draft`} · sends as a brand-new broadcast — pick a segment below
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearLoad} className="h-7 px-2 shrink-0">
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            </div>
          )}
          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's new on Locus this week"
              className="mt-2 border-2 border-foreground"
              maxLength={120}
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest">
              Body (markdown — **bold**, *italic*, [link](https://...))
            </Label>
            <Textarea
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder={"We just shipped CV analysis. Try it free this week.\n\nA new **vacancy board** is live too."}
              className="mt-2 border-2 border-foreground min-h-[220px] font-mono text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest">CTA label (optional)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Try it now" className="mt-2 border-2 border-foreground" />
            </div>
            <div>
              <Label className="font-mono text-[10px] uppercase tracking-widest">CTA URL (optional)</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://locus.legal/tools" className="mt-2 border-2 border-foreground" />
            </div>
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase tracking-widest mb-2 block">Segment</Label>
            <div className="grid sm:grid-cols-3 gap-3">
              {SEGMENTS.map((s) => {
                const Icon = s.icon;
                const active = segment === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSegment(s.value)}
                    className={`text-left border-2 border-foreground p-3 transition-all ${
                      active
                        ? "bg-accent text-accent-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]"
                        : "bg-card hover:translate-y-[-2px]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="font-heading font-extrabold text-sm">{s.label}</span>
                    </div>
                    <p className="text-xs opacity-80">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || !canSubmit}
              className="border-2 border-foreground bg-background hover:bg-muted font-heading font-extrabold"
            >
              <Beaker className="w-4 h-4 mr-2" />
              {testing ? "Sending test…" : "Send test to me"}
            </Button>
            <div className="flex gap-3 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreviewMobile((v) => !v)}
                className="lg:hidden border-2 border-foreground"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreviewMobile ? "Hide preview" : "Preview"}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !canSubmit}
                className="border-2 border-foreground bg-accent text-accent-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] font-heading font-extrabold"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sending…" : "Send broadcast"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden lg:block lg:sticky lg:top-6 self-start">{PreviewCard}</aside>
        {showPreviewMobile && <div className="lg:hidden">{PreviewCard}</div>}
      </div>

      <section>
        <h2 className="font-heading text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 bg-accent" /> Recent broadcasts
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground border-2 border-dashed border-foreground p-6 text-center">
            No broadcasts sent yet.
          </p>
        ) : (
          <div className="border-2 border-foreground bg-card divide-y-2 divide-foreground">
            {history.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleLoad(b)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-accent/10 transition-colors group"
                title="Load into composer to edit and resend"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-extrabold truncate">{b.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.sent_at ? new Date(b.sent_at).toLocaleString() : "Draft"} · {b.status}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="font-mono text-xs uppercase tracking-widest text-right">
                    <div className="font-heading text-2xl font-black text-accent leading-none">{b.recipient_count}</div>
                    <div className="text-muted-foreground">recipients</div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 border-2 border-foreground px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest bg-background group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <Copy className="w-3 h-3" /> Load
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
