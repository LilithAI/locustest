import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Phone,
  Globe,
  MapPin,
  Sparkles,
  TrendingUp,
  Award,
  Newspaper,
  Briefcase,
  Users,
  Building2,
  ArrowDownRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* MOCK DATA — single source of truth, tweak freely                    */
/* ------------------------------------------------------------------ */

const firm = {
  name: "Khaitan & Co",
  tier: "Tier 1",
  tagline:
    "Full-service Indian law firm advising on the most complex M&A, disputes and regulatory mandates.",
  founded: 1911,
  website: "https://www.khaitanco.com",
  email: "contact@khaitanco.com",
  phone: "+91 22 6636 5000",
  hq: "One World Centre, Mumbai",

  completeness: 78,
  lastScrapedAt: "2 days ago",

  stats: {
    lawyers: 1050,
    partners: 220,
    paRatio: "1 : 3.8",
    offices: 6,
    openRoles: 14,
  },

  signaturePractices: [
    { name: "Mergers & Acquisitions", partners: 38, depth: 95 },
    { name: "Banking & Finance", partners: 28, depth: 88 },
    { name: "Dispute Resolution", partners: 32, depth: 84 },
    { name: "Tax", partners: 21, depth: 78 },
    { name: "Competition / Antitrust", partners: 14, depth: 72 },
  ],

  allPractices: [
    "M&A", "Private Equity", "Banking & Finance", "Capital Markets",
    "Dispute Resolution", "International Arbitration", "White Collar",
    "Tax", "Direct Tax", "Indirect Tax", "Competition", "Employment & Labour",
    "Real Estate", "IP", "TMT", "Energy", "Infrastructure", "Bankruptcy & Insolvency",
    "Regulatory", "Healthcare", "Media", "Sports Law",
  ],

  offices: [
    { city: "Mumbai", address: "One World Centre, Lower Parel", share: 42 },
    { city: "New Delhi", address: "Max Towers, Sector 16B, Noida", share: 28 },
    { city: "Bengaluru", address: "Embassy Quest, Vittal Mallya Road", share: 14 },
    { city: "Kolkata", address: "Emerald House, Old Post Office Street", share: 9 },
    { city: "Chennai", address: "Apex Plaza, Nungambakkam High Road", share: 5 },
    { city: "Singapore", address: "8 Marina View, Asia Square Tower 1", share: 2 },
  ],

  rankings: [
    { source: "Chambers Asia-Pacific", year: 2025, band: "Band 1", category: "Corporate / M&A" },
    { source: "Legal500 Asia Pacific", year: 2025, band: "Tier 1", category: "Banking & Finance" },
    { source: "IFLR1000", year: 2024, band: "Tier 1", category: "Capital Markets" },
    { source: "Chambers Global", year: 2025, band: "Band 2", category: "Dispute Resolution" },
  ],

  movements: [
    { type: "join", name: "Aditi Sharma", role: "Partner — Tax", from: "Trilegal", date: "Mar 18" },
    { type: "exit", name: "Rohan Mehta", role: "Partner — Disputes", to: "AZB & Partners", date: "Feb 27" },
    { type: "join", name: "Karan Bhatia", role: "Counsel — TMT", from: "Shardul Amarchand", date: "Feb 10" },
  ],

  openRoles: [
    { title: "Associate — M&A", office: "Mumbai", peq: "2-4 yrs PQE" },
    { title: "Senior Associate — Banking", office: "New Delhi", peq: "5-7 yrs PQE" },
    { title: "Junior Associate — Disputes", office: "Bengaluru", peq: "0-2 yrs PQE" },
  ],

  news: [
    { title: "Khaitan advises HDFC Bank on $4B bond issuance", source: "Bar & Bench", date: "Apr 12" },
    { title: "Firm represents Adani Group in cross-border arbitration", source: "LiveLaw", date: "Apr 03" },
    { title: "Khaitan opens dedicated AI & data protection desk", source: "Economic Times", date: "Mar 22" },
    { title: "Tax team wins ITAT relief for unicorn founder", source: "Bar & Bench", date: "Mar 15" },
  ],

  similarFirms: [
    { name: "Cyril Amarchand Mangaldas", tier: "Tier 1", lawyers: 950 },
    { name: "AZB & Partners", tier: "Tier 1", lawyers: 720 },
    { name: "Shardul Amarchand Mangaldas", tier: "Tier 1", lawyers: 880 },
  ],
};

/* ------------------------------------------------------------------ */
/* SHARED PRIMITIVES                                                   */
/* ------------------------------------------------------------------ */

const SectionHeader = ({ kicker, title }: { kicker: string; title: string }) => (
  <div className="mb-5">
    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
      {kicker}
    </div>
    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
  </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
    {children}
  </section>
);

/* ------------------------------------------------------------------ */
/* SECTIONS                                                            */
/* ------------------------------------------------------------------ */

const HeroPanel = () => (
  <div className="relative overflow-hidden rounded-3xl border border-foreground bg-foreground text-background">
    <div className="absolute right-0 top-0 h-full w-2 bg-accent" />
    <div className="relative grid gap-6 p-8 md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
            {firm.tier}
          </span>
          <span className="rounded-full border border-background/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-background/80">
            Est. {firm.founded}
          </span>
          <span className="rounded-full border border-background/30 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-background/80">
            Full Service
          </span>
        </div>
        <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
          {firm.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-background/75 md:text-lg">
          {firm.tagline}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
        <a
          href={firm.website}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Visit website <ArrowUpRight className="h-4 w-4" />
        </a>
        <button className="inline-flex items-center gap-2 rounded-full border border-background/40 px-4 py-2 text-sm font-semibold text-background transition hover:bg-background hover:text-foreground">
          <Mail className="h-4 w-4" /> Generate cold email
        </button>
      </div>
    </div>
  </div>
);

const CompletenessBar = () => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
        Intelligence Completeness
      </span>
      <span className="font-semibold text-foreground">{firm.completeness}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${firm.completeness}%` }}
      />
    </div>
    <div className="mt-2 text-xs text-muted-foreground">
      Last refreshed {firm.lastScrapedAt} · 18 of 23 fields filled
    </div>
  </div>
);

const AtAGlance = () => {
  const stats = [
    { label: "Lawyers", value: firm.stats.lawyers, icon: Users },
    { label: "Partners", value: firm.stats.partners, icon: Briefcase },
    { label: "P : A ratio", value: firm.stats.paRatio, icon: TrendingUp },
    { label: "Offices", value: firm.stats.offices, icon: Building2 },
    { label: "Open roles", value: firm.stats.openRoles, icon: Sparkles },
  ];
  return (
    <Card>
      <SectionHeader kicker="01" title="At a glance" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-background p-4"
          >
            <s.icon className="mb-2 h-4 w-4 text-muted-foreground" />
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const SignaturePractices = () => (
  <Card>
    <SectionHeader kicker="02" title="Signature practices" />
    <div className="space-y-4">
      {firm.signaturePractices.map((p) => (
        <div key={p.name}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {p.partners} partners
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${p.depth}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const AllPractices = () => (
  <Card>
    <SectionHeader kicker="03" title="All practice areas" />
    <div className="flex flex-wrap gap-2">
      {firm.allPractices.map((p) => (
        <span
          key={p}
          className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
        >
          {p}
        </span>
      ))}
    </div>
  </Card>
);

const Footprint = () => (
  <Card>
    <SectionHeader kicker="04" title="Office presence" />
    <div className="space-y-4">
      {firm.offices.map((o) => (
        <div key={o.city}>
          <div className="mb-1 flex items-baseline justify-between">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{o.city}</span>
              <span className="ml-2 text-xs text-muted-foreground">{o.address}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{o.share}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${o.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const Rankings = () => (
  <Card>
    <SectionHeader kicker="05" title="Rankings & recognition" />
    <div className="grid gap-3 md:grid-cols-2">
      {firm.rankings.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
        >
          <Award className="mt-0.5 h-4 w-4 text-accent" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              {r.source} {r.year}
            </div>
            <div className="text-xs text-muted-foreground">
              {r.band} · {r.category}
            </div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const Movements = () => (
  <Card>
    <SectionHeader kicker="06" title="Team movements · last 90 days" />
    <ul className="divide-y divide-border">
      {firm.movements.map((m, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              m.type === "join"
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {m.type === "join" ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {m.name}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {m.role}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {m.type === "join" ? `from ${m.from}` : `to ${m.to}`}
            </div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{m.date}</span>
        </li>
      ))}
    </ul>
  </Card>
);

const OpenRoles = () => (
  <Card>
    <SectionHeader kicker="07" title="Current openings" />
    <div className="grid gap-3 md:grid-cols-3">
      {firm.openRoles.map((r, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-4">
          <div className="text-sm font-semibold text-foreground">{r.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{r.office}</div>
          <div className="mt-3 inline-block rounded-full bg-muted px-2 py-1 text-[10px] font-mono uppercase tracking-wider">
            {r.peq}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const RecentActivity = () => (
  <Card>
    <SectionHeader kicker="08" title="Recent activity" />
    <ul className="divide-y divide-border">
      {firm.news.map((n, i) => (
        <li key={i} className="flex items-start gap-3 py-3">
          <Newspaper className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm text-foreground">{n.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {n.source} · {n.date}
            </div>
          </div>
        </li>
      ))}
    </ul>
  </Card>
);

const AskAboutFirm = () => (
  <div className="rounded-2xl border border-foreground bg-foreground p-6 text-background">
    <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-background/60">
      09
    </div>
    <h2 className="text-2xl font-semibold tracking-tight">Ask about this firm</h2>
    <p className="mt-2 text-sm text-background/70">
      Anything about partners, practices, recent deals or culture — we'll answer
      from this firm's intelligence file.
    </p>
    <div className="mt-4 flex gap-2">
      <input
        placeholder="e.g. Who leads their PE practice in Mumbai?"
        className="flex-1 rounded-full border border-background/30 bg-background/10 px-4 py-2 text-sm text-background placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
        Ask
      </button>
    </div>
  </div>
);

const SimilarFirms = () => (
  <Card>
    <SectionHeader kicker="10" title="Similar firms" />
    <div className="grid gap-3 md:grid-cols-3">
      {firm.similarFirms.map((s) => (
        <div key={s.name} className="rounded-xl border border-border bg-background p-4">
          <div className="text-sm font-semibold text-foreground">{s.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {s.tier} · {s.lawyers} lawyers
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const ContactGrid = () => {
  const items = [
    { icon: Globe, label: "Website", value: firm.website.replace(/^https?:\/\//, "") },
    { icon: Mail, label: "Email", value: firm.email },
    { icon: Phone, label: "Phone", value: firm.phone },
    { icon: MapPin, label: "HQ", value: firm.hq },
  ];
  return (
    <Card>
      <SectionHeader kicker="11" title="Contact" />
      <div className="grid gap-3 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-border bg-background p-4">
            <it.icon className="mb-2 h-4 w-4 text-muted-foreground" />
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {it.label}
            </div>
            <div className="mt-1 break-words text-sm text-foreground">{it.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const IntelFooter = () => (
  <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-dashed border-border p-5 text-xs text-muted-foreground md:flex-row md:items-center">
    <span>
      Intelligence last refreshed {firm.lastScrapedAt}. Sources: firm website,
      Bar & Bench, LiveLaw, Chambers, Legal500.
    </span>
    <a
      href="mailto:hello@locus.legal?subject=Update%20request%20—%20Khaitan%20%26%20Co"
      className="font-semibold text-foreground underline-offset-4 hover:underline"
    >
      Request an update →
    </a>
  </div>
);

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

const DemoFirmIntelligence = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          to="/directory"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
        </Link>

        <div className="space-y-5">
          <HeroPanel />
          <CompletenessBar />
          <AtAGlance />
          <div className="grid gap-5 md:grid-cols-2">
            <SignaturePractices />
            <Footprint />
          </div>
          <AllPractices />
          <Rankings />
          <div className="grid gap-5 md:grid-cols-2">
            <Movements />
            <OpenRoles />
          </div>
          <RecentActivity />
          <AskAboutFirm />
          <SimilarFirms />
          <ContactGrid />
          <IntelFooter />
        </div>
      </div>
    </div>
  );
};

export default DemoFirmIntelligence;
