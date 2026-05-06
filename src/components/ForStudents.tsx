import { Mail, School, FileText, Target, BadgeCheck, Building2, Send } from "lucide-react";
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
    icon: Mail,
    title: "Cold emails into silence",
    body: "You've sent 50 applications. Maybe 3 replied. Not because you're not good enough — because firms don't have time to read unscreened emails from colleges they don't recognise.",
  },
  {
    icon: School,
    title: "Your college can't help you",
    body: "No placement cell. No firm connections. No alumni network in corporate law. Your peers at NLUs have all three handed to them on day one.",
  },
  {
    icon: FileText,
    title: "Your CV looks like everyone else's",
    body: "Marks, moot courts, a generic internship. Firms see hundreds of these. You have no way to show what actually makes you different.",
  },
];

const valueProps = [
  { icon: Target, title: "Matched to firms looking for you", body: "Tell us your practice area interest, availability, and skills. We surface opportunities that fit — no scrolling through 200 irrelevant listings." },
  { icon: BadgeCheck, title: "A profile that speaks for you", body: "Not just a CV. A verified skill profile that shows firms what you can do — so your college name is the last thing they look at." },
  { icon: Building2, title: "Access firms that don't do campus drives", body: "Corporate legal teams, IP boutiques, compliance departments, LegalTech startups — all on Locus. None of them visit your campus. All of them are reachable now." },
  { icon: Send, title: "Apply directly. No referral needed.", body: "No alumni connection. No professor email. No cold outreach. Just your profile, their opening, and a direct line between the two." },
];

const faqs = [
  {
    q: "I'm from a non-NLU. Will firms actually consider me?",
    a: "That's exactly what Locus is built for. Firms on our platform are here because they want merit-based candidates — not just NLU names. Your college is not a disqualifier here.",
  },
  {
    q: "I'm only in 2nd year. Is it too early?",
    a: "No. The earlier you build your profile and get real exposure, the stronger your internship trajectory by final year. Start now.",
  },
  {
    q: "I already use Internshala or Lawctopus.",
    a: "Locus is the only platform built exclusively for legal internships, with firm-vetted opportunities and skill-based matching. The quality difference is significant.",
  },
];

export default function ForStudents() {
  const heroRef = useScrollReveal();
  const painRef = useScrollReveal();
  const pivotRef = useScrollReveal();
  const valueRef = useScrollReveal();
  const faqRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <section id="students">
      {/* BLOCK 1 — Hero Headline */}
      <div className="py-28 px-4">
        <div ref={heroRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6 text-center">
          <p className="uppercase tracking-[0.2em] text-xs font-heading text-muted-foreground mb-6">
            For Law Students
          </p>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Your college didn't get you here.{" "}
            <br className="hidden md:block" />
            Your <span className="text-accent">skills will.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            India has 500,000+ law students. Only ~600 land top-firm internships. The rest get ignored — not because they're less capable, but because no one built a system for them. Until now.
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
            "Merit got you into law school.{" "}
            <br className="hidden md:block" />
            Locus gets you into the room."
          </p>
        </div>
      </div>

      {/* BLOCK 4 — What You Get */}
      <div className="py-28 px-4">
        <div ref={valueRef} className="container mx-auto max-w-5xl opacity-0 translate-y-6">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-16 tracking-tight">
            Built for the <span className="text-accent">95%</span> that the system ignores.
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

      {/* BLOCK 5 — FAQ */}
      <div className="py-28 px-4">
        <div ref={faqRef} className="container mx-auto max-w-3xl opacity-0 translate-y-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-12 tracking-tight">
            Questions students ask us
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
            Your next internship shouldn't depend on{" "}
            <br className="hidden md:block" />
            who your professor knows.
          </h2>
          <p className="text-background/70 text-lg mb-10 max-w-xl mx-auto">
            No college filter. No referral needed. Just your merit.
          </p>
          <a href="#waitlist">
            <Button variant="reverse" size="lg" className="font-heading font-bold px-10 py-5 text-base w-full sm:w-auto">
              Build My Profile — It's Free →
            </Button>
          </a>
          <p className="text-background/50 text-xs mt-4">
            No college filter. No referral needed. Just your merit.
          </p>
        </div>
      </div>
    </section>
  );
}
