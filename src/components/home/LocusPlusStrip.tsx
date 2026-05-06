import { Link } from "react-router-dom";
import { FileSearch, Scale, Gavel, Users } from "lucide-react";
import { TimelineContent, textVariants } from "@/components/ui/timeline-animation";

const formats = [
  { icon: FileSearch, name: "Document Review", desc: "Spot the clause that matters." },
  { icon: Scale, name: "Brief Builder", desc: "Construct arguments under pressure." },
  { icon: Gavel, name: "Ethics", desc: "Walk the professional tightrope." },
  { icon: Users, name: "Client Counseling", desc: "Advise like a partner would." },
];

export default function LocusPlusStrip() {
  return (
    <section className="py-20 px-4 bg-card/40 border-y-2 border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
          <div>
            <p className="font-heading text-sm tracking-widest uppercase text-accent mb-3">
              Locus<span className="text-accent">+</span> on The Bar
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl">
              Premium challenge formats that mirror real practice.
            </h2>
          </div>
          <Link
            to="/the-bar/browse"
            className="font-heading text-sm font-bold text-foreground border-2 border-foreground px-5 py-3 rounded-lg shadow-[4px_4px_0_0_hsl(var(--accent))] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            Browse challenges →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {formats.map((f, i) => {
            const Icon = f.icon;
            return (
              <TimelineContent key={f.name} index={i}>
                <div className="p-5 bg-background border-2 border-border rounded-xl hover:border-accent transition-colors h-full">
                  <Icon className="h-5 w-5 text-accent mb-3" />
                  <p className="font-heading font-extrabold text-foreground mb-1">{f.name}</p>
                  <p className="text-xs text-foreground/60 leading-relaxed">{f.desc}</p>
                </div>
              </TimelineContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}
