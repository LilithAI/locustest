import StatsBar from "@/components/StatsBar";
import ForStudents from "@/components/ForStudents";
import ForFirms from "@/components/ForFirms";
import ForUniversities from "@/components/ForUniversities";
import WaitlistSection from "@/components/WaitlistSection";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { usePageMeta } from "@/hooks/usePageMeta";

const Waitlist = () => {
  usePageMeta({
    title: "Join the Locus Waitlist — Merit-Based Legal Internships",
    description: "Be first in line. Locus connects law students, firms, and institutions on merit — not college name. Join the waitlist for students, firms, or schools.",
    path: "/waitlist",
  });

  return (
    <>
      <header className="pt-32 pb-12 md:pt-40 md:pb-16 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <RainbowButton className="mb-6 font-heading text-xs md:text-sm font-semibold tracking-widest uppercase">
            Join the Waitlist
          </RainbowButton>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            Be first when <span className="text-accent">Locus</span> opens.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            India's first merit-based legal internship platform — built for students, firms, and institutions. Pick your lane below.
          </p>
        </div>
      </header>
      <StatsBar />
      <ForStudents />
      <ForFirms />
      <ForUniversities />
      <WaitlistSection />
    </>
  );
};

export default Waitlist;
