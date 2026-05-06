import { useEffect, useState } from "react";
import BackgroundPathsAnimation from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { RainbowButton } from "@/components/ui/rainbow-button";
import DisplayCards from "@/components/ui/display-cards";
import { Send, Target, FileText } from "lucide-react";
export default function Hero() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <BackgroundPathsAnimation />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/50 z-[1]" />
      
      <div className="container mx-auto px-4 md:px-8 relative z-10 py-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="max-w-3xl lg:max-w-xl flex-1">
            <RainbowButton
              className={`mb-8 font-heading text-sm font-semibold tracking-widest uppercase transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Your merit. Your internship.
            </RainbowButton>
            
            <h1
              className={`font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-8 text-foreground transition-all duration-700 delay-150 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Get the internship you deserve —{" "}
              <GooeyText
                texts={[
                  "not the one your college got you.",
                  "based on your skills, not your campus.",
                  "earned through merit, not connections.",
                ]}
                morphTime={2}
                cooldownTime={1.5}
                className="block mt-2 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[200px]"
                textClassName="text-accent font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
              />
            </h1>
            
            <p
              className={`text-lg md:text-xl text-foreground/70 max-w-xl mb-12 leading-relaxed transition-all duration-700 delay-300 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              India's first merit-based legal internship platform. We connect ambitious law students with top firms — no matter which college they come from. Sign up now — spots are limited.
            </p>
            
            <div
              className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <a href="#waitlist">
                <Button size="lg" className="font-heading text-base px-8 py-4">I'm a Student</Button>
              </a>
              <a href="#waitlist">
                <Button variant="neutral" size="lg" className="font-heading text-base px-8 py-4">I'm a Firm / Chamber</Button>
              </a>
              <a href="#waitlist">
                <Button variant="neutral" size="lg" className="font-heading text-base px-8 py-4">I'm a School</Button>
              </a>
            </div>
          </div>

          <div
            className={`hidden lg:block flex-1 transition-all duration-700 delay-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <DisplayCards
              cards={[
                {
                  icon: <Send className="size-4 text-accent" />,
                  title: "Direct Apply",
                  description: "Apply to top firms — no referral needed",
                  date: "Open now",
                  iconClassName: "text-accent",
                  titleClassName: "text-accent",
                  className:
                    "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                },
                {
                  icon: <Target className="size-4 text-accent" />,
                  title: "Skill Matching",
                  description: "Matched with firms that need your skills",
                  date: "AI-powered",
                  iconClassName: "text-accent",
                  titleClassName: "text-accent",
                  className:
                    "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                },
                {
                  icon: <FileText className="size-4 text-accent" />,
                  title: "Merit Profile",
                  description: "Your skills speak louder than your campus",
                  date: "Build yours",
                  iconClassName: "text-accent",
                  titleClassName: "text-accent",
                  className:
                    "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
