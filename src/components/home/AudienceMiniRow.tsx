import { Link } from "react-router-dom";
import { GraduationCap, Briefcase, School, ArrowRight } from "lucide-react";

const audiences = [
  {
    icon: GraduationCap,
    title: "Students",
    desc: "Land internships on merit. Build a profile firms read.",
    href: "/waitlist#students",
  },
  {
    icon: Briefcase,
    title: "Firms / Chambers",
    desc: "Hire from a vetted, skill-ranked applicant pool.",
    href: "/waitlist#firms",
  },
  {
    icon: School,
    title: "Institutions",
    desc: "Give every student — not just the top tier — a fair shot.",
    href: "/waitlist#schools",
  },
];

export default function AudienceMiniRow() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Built for everyone in the legal pipeline.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.title}
                to={a.href}
                className="group p-6 bg-card border-2 border-border rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_0_hsl(var(--accent))] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                <Icon className="h-6 w-6 text-accent mb-4" />
                <h3 className="font-heading text-xl font-extrabold text-foreground mb-2">{a.title}</h3>
                <p className="text-sm text-foreground/70 mb-4">{a.desc}</p>
                <span className="inline-flex items-center text-sm font-bold text-accent">
                  Learn more <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
