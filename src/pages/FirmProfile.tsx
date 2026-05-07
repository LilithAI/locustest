import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Phone,
  Globe,
  MapPin,
  Award,
  Newspaper,
  Briefcase,
  Users,
  Building2,
  Quote,
  Sparkles,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getFirmIntelligenceBySlug, type FirmIntelligenceFull } from "@/lib/firmIntelligence";
import { RefreshIntelligenceButton } from "@/components/firm/RefreshIntelligenceButton";

/* ---------------- primitives ---------------- */

const SectionHeader = ({ kicker, title }: { kicker: string; title: string }) => (
  <div className="mb-5">
    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{kicker}</div>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-border bg-card p-6 ${className}`}>{children}</section>
);

const tierLabel = (tier: string) => {
  if (!tier || tier === "untiered") return null;
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatRelative = (iso: string | null) => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const prettySource = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------------- page ---------------- */

export default function FirmProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [firm, setFirm] = useState<FirmIntelligenceFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getFirmIntelligenceBySlug(slug).then((f) => {
      setFirm(f);
      setLoading(false);
    });
  }, [slug]);

  usePageMeta({
    title: firm ? `${firm.firm_name} — Firm Intelligence | Locus` : "Firm Intelligence | Locus",
    description: firm ? `Firm intelligence profile for ${firm.firm_name}.` : "Firm intelligence profile.",
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-12 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-20 text-center">
        <Building2 className="mx-auto mb-4 opacity-40" size={48} />
        <h1 className="font-heading text-2xl mb-2">Firm not found</h1>
        <p className="text-muted-foreground mb-6">We don't have an intelligence profile for this firm yet.</p>
        <Link to="/directory" className="text-accent hover:underline">← Back to Directory</Link>
      </div>
    );
  }

  const completenessPct = Math.round((firm.intelligence_completeness_score ?? 0) * 100);
  const tier = tierLabel(firm.tier);
  const signature = firm.practice_areas.filter((p) => p.is_signature && (p.partner_count ?? 0) > 0);
  const allPractices = firm.practice_areas.map((p) => p.area);
  const offices = firm.offices;
  const ratio =
    firm.total_lawyers && firm.partner_count
      ? `1 : ${(firm.total_lawyers / firm.partner_count).toFixed(1)}`
      : null;

  const stats = [
    firm.total_lawyers != null && { label: "Lawyers", value: firm.total_lawyers, icon: Users },
    firm.partner_count != null && { label: "Partners", value: firm.partner_count, icon: Briefcase },
    ratio && { label: "P : A ratio", value: ratio, icon: Users },
    offices.length > 0 && { label: "Offices", value: offices.length, icon: Building2 },
  ].filter(Boolean) as { label: string; value: string | number; icon: typeof Users }[];

  const refreshBtn = (
    <RefreshIntelligenceButton
      firmSlug={firm.firm_slug}
      onSuccess={() => slug && getFirmIntelligenceBySlug(slug).then(setFirm)}
    />
  );

  /* not yet enriched */
  if (!firm.last_scraped_at) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-8 md:pt-28 md:pb-12">
          <Link
            to="/directory"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
          </Link>
          <h1 className="font-serif text-4xl font-bold tracking-tight">{firm.firm_name}</h1>
          <Card className="mt-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-accent" />
            <p className="text-lg font-semibold">Not yet enriched</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click <strong>Refresh intelligence</strong> (admin only) to extract live data for this firm.
            </p>
          </Card>
        </div>
        {refreshBtn}
      </div>
    );
  }

  const sigMax = signature.length ? Math.max(...signature.map((p) => p.partner_count ?? 0)) : 0;

  const contactItems = [
    firm.website_url && {
      icon: Globe,
      label: "Website",
      value: firm.website_url.replace(/^https?:\/\//, ""),
      href: firm.website_url,
    },
    firm.general_email && { icon: Mail, label: "General", value: firm.general_email, href: `mailto:${firm.general_email}` },
    firm.careers_email && { icon: Mail, label: "Careers", value: firm.careers_email, href: `mailto:${firm.careers_email}` },
    firm.phone_main && { icon: Phone, label: "Phone", value: firm.phone_main, href: `tel:${firm.phone_main}` },
    firm.hq_city && { icon: MapPin, label: "HQ", value: firm.hq_city, href: null },
  ].filter(Boolean) as { icon: typeof Globe; label: string; value: string; href: string | null }[];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-8 md:pt-28 md:pb-12">
        <Link
          to="/directory"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
        </Link>

        <div className="space-y-5">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-foreground bg-foreground text-background">
            <div className="absolute right-0 top-0 h-full w-2 bg-accent" />
            <div className="relative grid gap-6 p-8 md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {tier && (
                    <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
                      {tier}
                    </span>
                  )}
                  {firm.founded_year && (
                    <span className="rounded-full border border-background/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-background/80">
                      Est. {firm.founded_year}
                    </span>
                  )}
                  {firm.chips.hiring_now && (
                    <span className="rounded-full border border-background/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-background/80">
                      Hiring now
                    </span>
                  )}
                  {firm.chips.growing && (
                    <span className="rounded-full border border-background/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-background/80">
                      Growing
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                  {firm.firm_name}
                </h1>
                {firm.tagline && (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-background/75 md:text-lg">
                    {firm.tagline}
                  </p>
                )}
              </div>
              {firm.website_url && (
                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                  <a
                    href={firm.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                  >
                    Visit website <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Locus take */}
          {firm.locus_take && (
            <Card className="border-l-4 border-l-accent">
              <div className="flex items-start gap-4">
                <Quote className="mt-1 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    Locus take
                  </div>
                  <p className="text-base leading-relaxed text-foreground">{firm.locus_take}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Completeness */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
                Intelligence Completeness
              </span>
              <span className="font-semibold text-foreground">{completenessPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${completenessPct}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Last refreshed {formatRelative(firm.last_scraped_at)}
            </div>
          </div>

          {/* At a glance */}
          {stats.length > 0 && (
            <Card>
              <SectionHeader kicker="01" title="At a glance" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-background p-4">
                    <s.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-semibold tracking-tight text-foreground">{s.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Signature + Footprint */}
          <div className="grid gap-5 md:grid-cols-2">
            {signature.length > 0 && (
              <Card>
                <SectionHeader kicker="02" title="Signature practices" />
                <div className="space-y-4">
                  {signature.map((p) => {
                    const pct = sigMax ? Math.round(((p.partner_count ?? 0) / sigMax) * 100) : 0;
                    return (
                      <div key={p.area}>
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-foreground">{p.area}</span>
                          <span className="text-xs text-muted-foreground">{p.partner_count} partners</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {offices.length > 0 && (
              <Card>
                <SectionHeader kicker={signature.length ? "03" : "02"} title="Office presence" />
                <ul className="divide-y divide-border">
                  {offices.map((o) => (
                    <li key={o.id} className="flex items-start gap-3 py-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{o.city}</span>
                          {o.is_hq && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                              HQ
                            </span>
                          )}
                        </div>
                        {o.address && <div className="mt-0.5 text-xs text-muted-foreground">{o.address}</div>}
                        {(o.phone || o.email) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {o.phone}
                            {o.phone && o.email ? " · " : ""}
                            {o.email}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* All practices */}
          {allPractices.length > 0 && (
            <Card>
              <SectionHeader kicker="04" title="All practice areas" />
              <div className="flex flex-wrap gap-2">
                {firm.practice_areas.map((p) => (
                  <span
                    key={p.area}
                    className={
                      p.is_signature
                        ? "rounded-full border border-accent bg-accent/10 px-3 py-1 text-xs font-semibold text-foreground"
                        : "rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
                    }
                  >
                    {p.area}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Rankings */}
          {firm.rankings.length > 0 && (
            <Card>
              <SectionHeader kicker="05" title="Rankings & recognition" />
              <div className="grid gap-3 md:grid-cols-2">
                {firm.rankings.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                    <Award className="mt-0.5 h-4 w-4 text-accent" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {prettySource(r.ranking_source)} {r.year}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.band_or_tier}
                        {r.practice_area ? ` · ${r.practice_area}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* News */}
          {firm.news.length > 0 && (
            <Card>
              <SectionHeader kicker="06" title="Recent activity" />
              <ul className="divide-y divide-border">
                {firm.news.map((n, i) => (
                  <li key={i} className="flex items-start gap-3 py-3">
                    <Newspaper className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-foreground hover:underline"
                      >
                        {n.title}
                      </a>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {prettySource(n.source)} · {formatDate(n.published_at)}
                      </div>
                      {n.excerpt && <p className="mt-1 text-xs text-muted-foreground">{n.excerpt}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Contact */}
          {contactItems.length > 0 && (
            <Card>
              <SectionHeader kicker="07" title="Contact" />
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
                {contactItems.map((it) => (
                  <div key={it.label} className="rounded-xl border border-border bg-background p-4">
                    <it.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {it.label}
                    </div>
                    {it.href ? (
                      <a
                        href={it.href}
                        target={it.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="mt-1 block break-words text-sm text-foreground hover:underline"
                      >
                        {it.value}
                      </a>
                    ) : (
                      <div className="mt-1 break-words text-sm text-foreground">{it.value}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Footer */}
          <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-dashed border-border p-5 text-xs text-muted-foreground md:flex-row md:items-center">
            <span>
              Intelligence last refreshed {formatRelative(firm.last_scraped_at)}. Sources: firm website, Bar &amp;
              Bench, LiveLaw, Economic Times.
            </span>
            <a
              href={`mailto:hello@locus.legal?subject=Update%20request%20—%20${encodeURIComponent(firm.firm_name)}`}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Request an update →
            </a>
          </div>
        </div>
      </div>

      {refreshBtn}
    </div>
  );
}
