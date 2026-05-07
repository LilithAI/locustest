import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, MapPin, Users, ExternalLink, Mail, Phone, Globe, ArrowLeft, ShieldCheck, Sparkles, TrendingUp, Newspaper } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import AskAboutFirm from "@/components/firm/AskAboutFirm";
import {
  getFirmIntelligenceBySlug,
  TIER_LABELS,
  HEADCOUNT_LABELS,
  type FirmIntelligenceFull,
} from "@/lib/firmIntelligence";

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
    title: firm
      ? `${firm.firm_name} — Practice Areas, Offices, Hiring | Locus`
      : "Firm Profile | Locus",
    description: firm
      ? `${firm.tagline ?? firm.firm_name}. ${firm.total_lawyers ? `${firm.total_lawyers} lawyers. ` : ""}${firm.offices.length ? `${firm.offices.length} office${firm.offices.length === 1 ? "" : "s"}.` : ""}`
      : undefined,
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-2/3" />
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
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

  const completenessPct = Math.round(firm.intelligence_completeness_score * 100);
  // Signature = rare practices (top 3 by depth_score, where depth_score = rarity)
  const signaturePractices = [...firm.practice_areas]
    .filter((p) => p.is_signature && p.depth_score && p.depth_score > 0.6)
    .sort((a, b) => (b.depth_score ?? 0) - (a.depth_score ?? 0))
    .slice(0, 3);
  // Footprint summary line
  const cleanOffices = firm.offices.filter((o) => o.city && o.city.trim());
  const cityCount = new Set(cleanOffices.map((o) => o.city)).size;
  const footprint =
    cleanOffices.length === 0
      ? null
      : cleanOffices.length === 1
        ? `Single-office firm in ${cleanOffices[0].city}`
        : `HQ ${firm.hq_city ?? cleanOffices[0].city} · ${cleanOffices.length} offices across ${cityCount} ${cityCount === 1 ? "city" : "cities"}${cleanOffices.length >= 5 ? " · pan-India presence" : ""}`;
  const lowConfidence = firm.intelligence_completeness_score < 0.6;

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">
      <Link to="/directory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={14} /> Back to Directory
      </Link>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold bg-accent/10 text-accent px-3 py-1 rounded-full">
            {TIER_LABELS[firm.tier] ?? firm.tier}
          </span>
          {firm.headcount_band && (
            <span className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
              {HEADCOUNT_LABELS[firm.headcount_band] ?? firm.headcount_band}
            </span>
          )}
          {firm.chips.verified && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-accent text-accent-foreground border border-foreground px-3 py-1 rounded-full">
              <ShieldCheck size={11} /> Verified
            </span>
          )}
          {firm.chips.hiring_now && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-foreground text-background px-3 py-1 rounded-full">
              <Sparkles size={11} /> Hiring Now
            </span>
          )}
          {firm.chips.growing && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
              <TrendingUp size={11} /> Growing
            </span>
          )}
        </div>
        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3 leading-tight">{firm.firm_name}</h1>
        {firm.tagline && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">{firm.tagline}</p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {firm.hq_city && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> HQ: {firm.hq_city}</span>}
          {firm.founded_year && <span>Founded {firm.founded_year}</span>}
          {firm.total_lawyers != null && <span className="inline-flex items-center gap-1.5"><Users size={14} /> {firm.total_lawyers} lawyer{firm.total_lawyers === 1 ? "" : "s"}</span>}
          <span className="text-xs">Intelligence completeness: <strong className="text-foreground">{completenessPct}%</strong></span>
        </div>
      </header>

      {/* At a glance */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Offices" value={firm.offices.length || "—"} />
        <Stat label="Practice areas" value={firm.practice_areas.length || "—"} />
        <Stat label="Partner ratio" value={firm.partner_associate_ratio != null ? `${firm.partner_associate_ratio}` : "—"} />
        <Stat label="News (90d)" value={firm.news.length || "—"} />
      </section>

      {/* Signature practices */}
      {signaturePractices.length > 0 && (
        <Section title="Signature practices">
          <div className="flex flex-wrap gap-2">
            {signaturePractices.map((p) => (
              <span key={p.area} className="inline-flex items-center gap-1.5 text-sm bg-accent/10 text-accent border border-accent/30 px-3 py-1.5 rounded-full font-medium">
                {p.area}
                {p.depth_score != null && <span className="text-xs opacity-70">· {Math.round(p.depth_score * 100)}%</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* All practice areas */}
      {firm.practice_areas.length > 0 && (
        <Section title="All practice areas">
          <div className="flex flex-wrap gap-2">
            {firm.practice_areas.map((p) => (
              <span key={p.area} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{p.area}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Offices */}
      {firm.offices.length > 0 && (
        <Section title="Office presence">
          <div className="grid sm:grid-cols-2 gap-3">
            {firm.offices.map((o) => (
              <div key={o.id} className="border border-border/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{o.city}</h3>
                  {o.is_hq && <span className="text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">HQ</span>}
                </div>
                {o.address && <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{o.address}</p>}
                {o.phone && <a href={`tel:${o.phone}`} className="text-xs text-accent block mt-1">{o.phone}</a>}
                {o.email && <a href={`mailto:${o.email}`} className="text-xs text-accent block">{o.email}</a>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Team */}
      {firm.team_members.length > 0 && (
        <Section title={`Team (${firm.team_members.length})`}>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {firm.team_members.slice(0, 12).map((m) => (
              <div key={m.name} className="border border-border/60 rounded-xl p-3">
                <div className="font-medium text-sm">{m.name}</div>
                {m.title && <div className="text-xs text-muted-foreground">{m.title}</div>}
                {m.profile_url && (
                  <a href={m.profile_url} target="_blank" rel="noreferrer" className="text-xs text-accent inline-flex items-center gap-1 mt-1">
                    Profile <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
          {firm.team_members.length > 12 && (
            <p className="text-xs text-muted-foreground mt-3">Showing 12 of {firm.team_members.length}</p>
          )}
        </Section>
      )}

      {/* Movements */}
      {firm.movements.length > 0 && (
        <Section title="Team movements (last 90 days)">
          <ul className="space-y-1.5 text-sm">
            {firm.movements.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.movement_type === "joined" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-orange-500/10 text-orange-700 dark:text-orange-400"}`}>
                  {m.movement_type.toUpperCase()}
                </span>
                <span>{m.member_name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* News */}
      {firm.news.length > 0 ? (
        <Section title="Recent activity">
          <ul className="space-y-3">
            {firm.news.map((n, i) => (
              <li key={i} className="border-l-2 border-accent/40 pl-3">
                <a href={n.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-accent inline-flex items-center gap-1">
                  {n.title} <ExternalLink size={11} />
                </a>
                <div className="text-xs text-muted-foreground">
                  {n.source} · {new Date(n.published_at).toLocaleDateString()} · {n.mention_type}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <Section title="Recent activity">
          <p className="text-sm text-muted-foreground italic flex items-center gap-2">
            <Newspaper size={14} /> No recent activity tracked yet — news ingestion launches soon.
          </p>
        </Section>
      )}

      {/* Rankings */}
      {firm.rankings.length > 0 && (
        <Section title="Rankings & recognition">
          <ul className="space-y-1.5 text-sm">
            {firm.rankings.map((r, i) => (
              <li key={i}>
                <strong>{r.ranking_source}</strong> {r.year} — {r.band_or_tier}
                {r.practice_area && <span className="text-muted-foreground"> ({r.practice_area})</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Similar firms */}
      {firm.similar.length > 0 && (
        <Section title="Similar firms">
          <div className="flex flex-wrap gap-2">
            {firm.similar.map((s) => (
              <Link key={s.firm_slug} to={`/directory/firms/${s.firm_slug}`} className="text-sm border border-border hover:border-accent rounded-full px-3 py-1.5">
                {s.firm_name}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Ask about this firm */}
      <AskAboutFirm slug={firm.firm_slug} firmName={firm.firm_name} />

      {/* Contact */}
      <Section title="Contact">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {firm.website_url && <ContactLine icon={<Globe size={14} />} href={firm.website_url} label={firm.website_url} external />}
          {firm.general_email && <ContactLine icon={<Mail size={14} />} href={`mailto:${firm.general_email}`} label={firm.general_email} />}
          {firm.careers_email && <ContactLine icon={<Mail size={14} />} href={`mailto:${firm.careers_email}`} label={`Careers: ${firm.careers_email}`} />}
          {firm.phone_main && <ContactLine icon={<Phone size={14} />} href={`tel:${firm.phone_main}`} label={firm.phone_main} />}
          {firm.linkedin_url && <ContactLine icon={<ExternalLink size={14} />} href={firm.linkedin_url} label="LinkedIn" external />}
          {firm.careers_url && <ContactLine icon={<ExternalLink size={14} />} href={firm.careers_url} label="Careers page" external />}
        </div>
      </Section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LegalService",
            name: firm.firm_name,
            description: firm.tagline ?? firm.description ?? undefined,
            url: firm.website_url ?? `https://locus.legal/directory/firms/${firm.firm_slug}`,
            email: firm.general_email ?? undefined,
            telephone: firm.phone_main ?? undefined,
            areaServed: firm.offices.map((o) => o.city),
            knowsAbout: firm.practice_areas.map((p) => p.area),
            address: firm.offices[0]?.address
              ? { "@type": "PostalAddress", addressLocality: firm.offices[0].city, streetAddress: firm.offices[0].address }
              : undefined,
            foundingDate: firm.founded_year ? String(firm.founded_year) : undefined,
          }),
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border/60 rounded-xl p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-heading text-xl font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ContactLine({ icon, href, label, external }: { icon: React.ReactNode; href: string; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center gap-2 text-foreground hover:text-accent"
    >
      <span className="text-accent">{icon}</span>
      <span className="truncate">{label}</span>
    </a>
  );
}
