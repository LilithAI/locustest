import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Mail, Phone, Globe, Linkedin, Twitter, Briefcase, Users, Building2, Calendar, ExternalLink, Sparkles, TrendingUp, Network, Award, Target, Radio, Eye } from "lucide-react";
import { getFirmProfile, computeSignals, bucketPracticeAreas, type FirmProfile, type TeamMember, type OfficeAddress, type IntelSignal } from "@/lib/firm-profiles";
import { usePageMeta } from "@/hooks/usePageMeta";
import FirmIntelligenceBadge from "@/components/directory/FirmIntelligenceBadge";

const SIGNAL_ICON: Record<string, typeof Target> = {
  breadth: Target,
  reach: Network,
  maturity: Award,
  hiring: TrendingUp,
  contact: Radio,
  visibility: Eye,
};

export default function FirmProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<FirmProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getFirmProfile(slug).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [slug]);

  usePageMeta({
    title: profile ? `${profile.firm_name} — Firm Intelligence` : "Firm Intelligence",
    description: profile?.tagline || profile?.description || "Deep firm dossier — partners, offices, practice areas.",
    path: `/directory/firm/${slug}`,
  });

  if (loading) {
    return <main className="min-h-screen pt-32 px-4 text-center text-muted-foreground">Loading…</main>;
  }
  if (!profile) {
    return (
      <main className="min-h-screen pt-32 px-4 text-center">
        <h1 className="font-heading text-2xl font-bold mb-2">Firm not found</h1>
        <p className="text-muted-foreground mb-6">No intelligence dossier exists for this firm.</p>
        <Link to="/directory" className="inline-flex items-center gap-2 text-accent font-bold"><ArrowLeft size={16} /> Back to directory</Link>
      </main>
    );
  }

  const team = (profile.team_members as unknown as TeamMember[]) || [];
  const offices = (profile.office_addresses as unknown as OfficeAddress[]) || [];
  const primaryEmail = profile.careers_email || profile.general_email;
  const signals = computeSignals(profile);
  const buckets = bucketPracticeAreas(profile.practice_areas ?? []);

  return (
    <main className="min-h-screen pb-16 pt-24 md:pt-28">
      <div className="container mx-auto px-4 md:px-8">
        {/* Back pill */}
        <Link
          to="/directory"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-card border border-border/60 hover:border-accent hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft size={12} /> Back to directory
        </Link>

        {/* Header */}
        <header className="bg-card border-2 border-foreground rounded-2xl p-6 md:p-8 shadow-[4px_4px_0_0_hsl(var(--accent))] mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <FirmIntelligenceBadge size="md" />
            {profile.hq_city && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                <MapPin size={11} /> HQ: {profile.hq_city}
              </span>
            )}
            {profile.scrape_status === "success" && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Verified data</span>
            )}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold leading-tight mb-2">{profile.firm_name}</h1>
          {profile.tagline && <p className="text-base text-muted-foreground leading-relaxed mb-4">{profile.tagline}</p>}
          <div className="flex flex-wrap gap-3 mt-4">
            {primaryEmail && (
              <a href={`mailto:${primaryEmail}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[1px] transition-all">
                <Sparkles size={14} /> Apply via Email
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border-2 border-foreground/40 hover:border-foreground font-bold text-sm transition-colors">
                <Globe size={14} /> Visit website <ExternalLink size={12} />
              </a>
            )}
          </div>
        </header>

        {/* Locus Take */}
        {profile.locus_take && (
          <section className="mb-6 relative overflow-hidden rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card p-6 md:p-7">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                <Sparkles size={14} />
              </div>
              <h2 className="font-heading text-sm font-extrabold uppercase tracking-widest">Locus Take</h2>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI analyst summary</span>
            </div>
            <div className="text-sm md:text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">{profile.locus_take}</div>
          </section>
        )}

        {/* Intelligence Signals */}
        <section className="mb-8">
          <h2 className="font-heading text-xl font-bold mb-3">Intelligence signals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {signals.map((s) => <SignalCard key={s.key} s={s} />)}
          </div>
        </section>

        {/* At-a-glance stats */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { icon: Building2, label: "Offices", value: profile.office_count ?? profile.offices.length },
            { icon: Briefcase, label: "Practice areas", value: profile.practice_areas.length },
            { icon: Users, label: "Lawyers", value: profile.total_lawyers },
            { icon: Users, label: "Partners", value: profile.partner_count },
            { icon: Calendar, label: "Founded", value: profile.founded_year },
          ].filter((s) => s.value).map((s) => (
            <div key={s.label} className="bg-card border border-border/50 rounded-xl p-4">
              <s.icon size={16} className="text-accent mb-2" />
              <div className="text-2xl font-extrabold font-heading">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Practice focus (bucketed) */}
        {buckets.length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading text-xl font-bold mb-3">Practice focus</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {buckets.map((b) => (
                <div key={b.bucket} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm">{b.bucket}</div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{b.items.length} {b.items.length === 1 ? "area" : "areas"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.items.map((it) => (
                      <span key={it} className="text-[11px] font-medium bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">{it}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {profile.description && (
          <section className="mb-8">
            <h2 className="font-heading text-xl font-bold mb-3">About</h2>
            <p className="text-sm text-foreground/90 leading-relaxed bg-card/50 border border-border/50 rounded-xl p-5">{profile.description}</p>
          </section>
        )}

        {/* Offices */}
        {profile.offices.length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading text-xl font-bold mb-3">Offices <span className="text-sm text-muted-foreground font-normal">({profile.offices.length})</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.offices.map((city) => {
                const match = offices.find((o) => o.city === city);
                return (
                  <div key={city} className="bg-card border border-border/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-accent" />
                      <span className="font-bold text-sm">{city}</span>
                    </div>
                    {match?.address && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">Full address</summary>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs">{match.address}</pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* People — only if data exists */}
        {team.length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading text-xl font-bold mb-3">People</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {team.map((m, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="font-bold text-sm">{m.name}</div>
                  {m.role && <div className="text-xs text-muted-foreground">{m.role}</div>}
                  {m.email && <a href={`mailto:${m.email}`} className="text-xs text-accent hover:underline mt-1 block truncate">{m.email}</a>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section>
          <h2 className="font-heading text-xl font-bold mb-3">Contact &amp; links</h2>
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-2.5 text-sm">
            {profile.general_email && <ContactRow icon={Mail} label="General" value={profile.general_email} href={`mailto:${profile.general_email}`} />}
            {profile.careers_email && <ContactRow icon={Mail} label="Careers" value={profile.careers_email} href={`mailto:${profile.careers_email}`} />}
            {profile.press_email && <ContactRow icon={Mail} label="Press" value={profile.press_email} href={`mailto:${profile.press_email}`} />}
            {profile.phone_main && <ContactRow icon={Phone} label="Phone" value={profile.phone_main} href={`tel:${profile.phone_main}`} />}
            {profile.linkedin_url && <ContactRow icon={Linkedin} label="LinkedIn" value={profile.linkedin_url} href={profile.linkedin_url} external />}
            {profile.twitter_url && <ContactRow icon={Twitter} label="Twitter" value={profile.twitter_url} href={profile.twitter_url} external />}
            {profile.careers_url && <ContactRow icon={Briefcase} label="Careers page" value={profile.careers_url} href={profile.careers_url} external />}
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalCard({ s }: { s: IntelSignal }) {
  const Icon = SIGNAL_ICON[s.key] ?? Target;
  const toneClass =
    s.tone === "positive"
      ? "text-accent border-accent/30 bg-accent/5"
      : s.tone === "muted"
      ? "text-muted-foreground border-border/40 bg-card"
      : "text-foreground border-border/50 bg-card";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <span className="text-[10px] uppercase tracking-wider font-bold">{s.label}</span>
      </div>
      <div className="font-heading text-lg font-extrabold leading-tight text-foreground">{s.value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{s.detail}</div>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href, external }: { icon: typeof Mail; label: string; value: string; href: string; external?: boolean }) {
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="flex items-center gap-3 hover:text-accent transition-colors group">
      <Icon size={14} className="text-accent shrink-0" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold w-20 shrink-0">{label}</span>
      <span className="truncate">{value}</span>
    </a>
  );
}
