import {
  TrendingDown, UserX, Building2, Handshake, LayoutDashboard,
  BadgeCheck, Megaphone, Briefcase, BarChart3,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const twoTrack = [
  {
    tag: "No Placement Cell?",
    body: "Locus becomes your placement cell overnight. Your students get access to pre-screened internship opportunities, firm connections, and career tools the moment they register. No hiring, no budget, no setup.",
    bg: "bg-accent/5",
  },
  {
    tag: "Already Have One?",
    body: "Your reach is limited by who you know. Locus expands that network to hundreds of firms, MNCs, legal departments, and chambers that have never recruited from your campus. Your placement officer gets more to offer. Your students get more opportunities.",
    bg: "bg-muted/50",
  },
];

const painCards = [
  {
    icon: TrendingDown,
    title: "Your placement stats are hurting your rankings",
    body: "NAAC, NIRF, and BCI accreditation all factor in student outcomes. Internship rates, employment figures — every metric connects back to career access. A weak placement record isn't just a student problem. It's an institutional one.",
  },
  {
    icon: UserX,
    title: "Students leave not knowing where to begin",
    body: "Most non-NLU students graduate having done 1–2 internships through personal connections. No corporate exposure, no market-ready profile. They blame themselves. Often, the system failed them.",
  },
  {
    icon: Building2,
    title: "Top firms don't come to you",
    body: "Campus drives happen at 26 NLUs. For the other 1,800 colleges, firms simply don't show up. Locus reverses this — firms come to the platform looking for talent, regardless of where it studies.",
  },
];

const features = [
  { icon: Handshake, title: "Institutional partnership", body: "No minimum student quota. No complex onboarding. We're invested in your students' success because that's how our platform grows." },
  { icon: LayoutDashboard, title: "A placement dashboard for your institution", body: "Track how many of your students are registered, how many have applied, and how many have converted to internships — real data for NAAC submissions and accreditation files." },
  { icon: BadgeCheck, title: 'Verified "Locus Partner" badge', body: "Displayed on your college profile across the platform. Signals to students, parents, and recruiters that your institution is serious about outcomes." },
  { icon: Megaphone, title: "Dedicated outreach to your students", body: "We run online orientation sessions, send resources to your faculty coordinator, and help onboard your students directly. You don't manage it — we do." },
  { icon: Briefcase, title: "Access to firms that don't visit campuses", body: "Corporate legal departments, boutique IP firms, compliance teams, LegalTech startups — none of these run campus drives. All of them are on Locus." },
  { icon: BarChart3, title: "Better numbers. Better rankings.", body: "Every student placed is a datapoint that strengthens your institution's standing. Locus makes this measurable, not anecdotal." },
];

const faqs = [
  { q: "Our students aren't ready for top firms.", a: "That's exactly what Locus helps with. We build market-ready profiles, run skill assessments, and match students to firms appropriate for their level — not just Tier-1. Every student starts somewhere." },
  { q: "We don't have the bandwidth to manage this.", a: "You don't have to. One faculty coordinator registers the institution. We handle everything from there — student onboarding, firm matching, communication. Your involvement is optional after setup." },
  { q: "Our students already use Internshala or Lawctopus.", a: "Those are general platforms. Locus is legal-specific, merit-based, and firm-vetted. The quality of opportunities — and the quality of matching — is incomparable." },
  { q: "What if only a few students sign up?", a: "Even one placement is one more than before. There's no minimum and no downside to partnering." },
];

export default function ForUniversities() {
  const heroRef = useScrollReveal();
  const trackRef = useScrollReveal();
  const painRef = useScrollReveal();
  const pivotRef = useScrollReveal();
  const featRef = useScrollReveal();
  const contrastRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <section id="universities">
      {/* BLOCK 1 — Hero */}
      <div className="py-28 px-4">
        <div ref={heroRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6 text-center">
          <p className="uppercase tracking-[0.2em] text-xs font-heading text-muted-foreground mb-6">
            For Institutions &amp; Law Schools
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
            1,800 law colleges have no placement infrastructure.
            <br className="hidden md:block" />
            Locus is built to fix that — <span className="text-accent">starting with yours.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Every year, your students graduate into a market that was never built for them. Top firms recruit from 26 NLUs. Everyone else is on their own. Locus gives your institution the placement infrastructure most law schools spend years building.
          </p>
        </div>
      </div>

      {/* BLOCK 2 — Two-Track Callout */}
      <div className="px-4 pb-28">
        <div ref={trackRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {twoTrack.map((card) => (
              <div
                key={card.tag}
                className={`${card.bg} rounded-2xl p-8 border border-border`}
              >
                <p className="uppercase tracking-[0.15em] text-xs font-heading text-accent font-bold mb-4">
                  {card.tag}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 3 — Pain Cards */}
      <div className="px-4 pb-28">
        <div ref={painRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {painCards.map((card, i) => (
              <div
                key={card.title}
                className="relative bg-card rounded-2xl p-8 border border-border overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/80 via-accent to-accent/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                  <card.icon className="text-accent" size={24} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-3">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 4 — Pivot Callout */}
      <div ref={pivotRef} className="bg-foreground text-background py-20 px-4 opacity-0 translate-y-6">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">
            What if your placement record wasn't limited
            <br className="hidden md:block" />
            by your college's network?
          </p>
          <p className="text-background/70 text-lg mt-4">
            What if it was powered by India's largest legal internship platform instead?
          </p>
        </div>
      </div>

      {/* BLOCK 5 — Features */}
      <div className="py-28 px-4">
        <div ref={featRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 tracking-tight">
            Everything your placement cell <span className="text-accent">needs.</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl mx-auto">
            {features.map((f) => (
              <div key={f.title} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="text-accent" size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 6 — Contrast Callout */}
      <div className="px-4 pb-28">
        <div ref={contrastRef} className="container mx-auto max-w-3xl opacity-0 translate-y-6">
          <div className="border-2 border-border bg-muted/30 rounded-2xl p-8 md:p-12 text-left">
            <p className="text-muted-foreground leading-relaxed mb-4">
              NLSIU Bangalore has a dedicated placement committee, firm relationships built over 35 years, and a network of 3,000+ alumni in top firms.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Your college has a faculty coordinator with a Gmail account.
            </p>
            <p className="font-heading font-bold text-xl md:text-2xl">
              That gap closes today.
            </p>
          </div>
        </div>
      </div>

      {/* BLOCK 7 — FAQ */}
      <div className="py-28 px-4">
        <div ref={faqRef} className="container mx-auto max-w-3xl opacity-0 translate-y-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-12 tracking-tight">
            Common questions from institutions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`q${i}`} className="border-border">
                <AccordionTrigger className="font-heading font-bold text-left text-base hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* BLOCK 8 — Final CTA */}
      <div ref={ctaRef} className="bg-foreground text-background py-24 px-4 opacity-0 translate-y-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Partner with Locus.
            <br className="hidden md:block" />
            Give your students the placement cell they deserve.
          </h2>
          <p className="text-background/70 text-lg mb-10 max-w-xl mx-auto">
            No bureaucracy. Just better outcomes for your students — and better numbers for your institution.
          </p>
          <a href="#waitlist">
            <Button variant="reverse" size="lg" className="font-heading font-bold px-10 py-5 text-base w-full sm:w-auto">
              Register My Institution →
            </Button>
          </a>
           <p className="text-background/50 text-xs mt-4">
            No minimum enrollment. Takes 10 minutes to set up. Join 50+ institutions already signed up.
          </p>
        </div>
      </div>
    </section>
  );
}
