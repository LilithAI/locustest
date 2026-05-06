import { Inbox, Building2, Clock, CheckCircle, SlidersHorizontal, Globe, UserCheck } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const painCards = [
  {
    icon: Inbox,
    title: "Flooded with irrelevant applications",
    body: "You post an opening and get 200 cold emails — half with the wrong practice area, half with no writing samples. You spend hours filtering. Most still don't work out.",
  },
  {
    icon: Building2,
    title: "The NLU pipeline is crowded and narrow",
    body: "You're competing with 50 other firms for the same 600 NLU students. Meanwhile, 70,000+ other graduates — many of them exceptional — are completely invisible to you.",
  },
  {
    icon: Clock,
    title: "A bad intern costs more than a month",
    body: "They waste your associate's time, your attention, and your faith in the next one. Quality filtering isn't a nice-to-have. It's essential.",
  },
];

const valueProps = [
  { icon: CheckCircle, title: "Pre-screened profiles", body: "Every student on Locus has been assessed on core legal skills — not just their college name. You see what they can actually do." },
  { icon: SlidersHorizontal, title: "You set the filter", body: "Practice area, city, duration, remote or in-office — we surface candidates that match your needs, not a generic list." },
  { icon: Globe, title: "Reach the unreached", body: "Access 500,000+ law students across 1,800 colleges that have zero placement infrastructure. This talent pool doesn't exist anywhere else." },
  { icon: UserCheck, title: "Save your associate's time", body: "No more sifting. Shortlists are curated. Your team only sees candidates worth a second look." },
];

const faqs = [
  {
    q: "Will the quality actually be good?",
    a: "Every student completes a structured profile with writing samples, skill assessments, and verified academic records. No blank CVs. No ghost applicants.",
  },
  {
    q: "How much time does this take to manage?",
    a: "15 minutes to list an opening. You shortlist from curated profiles. You decide who to interview. We handle everything else.",
  },
  {
    q: "We already use Lawctopus, LinkedIn, or word of mouth.",
    a: "Keep using them. Locus is additive. We just give you access to a talent pool that none of those channels reach.",
  },
];

export default function ForFirms() {
  const heroRef = useScrollReveal();
  const painRef = useScrollReveal();
  const pivotRef = useScrollReveal();
  const valueRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <section id="firms">
      {/* BLOCK 1 — Hero Headline */}
      <div className="py-28 px-4">
        <div ref={heroRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6 text-center">
          <p className="uppercase tracking-[0.2em] text-xs font-heading text-muted-foreground mb-6">
            For Law Firms &amp; Chambers
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
            You're not short on applicants.{" "}
            <br className="hidden md:block" />
            You're short on <span className="text-accent">the right ones.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Every year, thousands of driven law students — sharp, hungry, and skilled — never reach your inbox. Not because they lack merit. Because they lack the network. Locus fixes that.
          </p>
        </div>
      </div>

      {/* BLOCK 2 — Pain Cards */}
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

      {/* BLOCK 3 — Pivot Line */}
      <div ref={pivotRef} className="bg-foreground text-background py-20 px-4 opacity-0 translate-y-6">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="font-heading text-2xl md:text-3xl lg:text-4xl italic leading-snug font-medium">
            "What if your next best intern was already waiting —{" "}
            <br className="hidden md:block" />
            you just had no way to find them?"
          </p>
        </div>
      </div>

      {/* BLOCK 4 — Value Props */}
      <div className="py-28 px-4">
        <div ref={valueRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 tracking-tight">
            Zero noise. <span className="text-accent">Just the right candidates.</span>
          </h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            {valueProps.map((v) => (
              <div key={v.title} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                  <v.icon className="text-accent" size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 5 — Objection Busters */}
      <div className="py-28 px-4">
        <div ref={faqRef} className="container mx-auto max-w-3xl opacity-0 translate-y-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-12 tracking-tight">
            Still have questions?
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

      {/* BLOCK 6 — Final CTA */}
      <div ref={ctaRef} className="bg-foreground text-background py-24 px-4 opacity-0 translate-y-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            List your firm. Find your intern.
          </h2>
          <p className="text-background/70 text-lg mb-10 max-w-xl mx-auto">
            It takes 5 minutes. Your next great intern might already be waiting.
          </p>
          <a href="#waitlist">
            <Button variant="reverse" size="lg" className="font-heading font-bold px-10 py-5 text-base w-full sm:w-auto">
              List My Firm / Chamber →
            </Button>
          </a>
          <p className="text-background/50 text-xs mt-4">
            No commitment. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
