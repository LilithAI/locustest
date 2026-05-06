import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Briefcase, Trophy, Compass, UserCircle2, type LucideIcon } from "lucide-react";

interface Slide {
  icon: LucideIcon;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: Briefcase,
    title: "Apply smarter",
    body: "Track every application, draft cover letters, and let Locus nudge you when it's time to follow up.",
  },
  {
    icon: Trophy,
    title: "The Bar",
    body: "Daily legal challenges. Climb the leaderboard and prove your skill to the firms watching.",
  },
  {
    icon: Compass,
    title: "Opportunities",
    body: "Vacancies, CFPs, moots, competitions — every legal opening worth your time, in one feed.",
  },
  {
    icon: UserCircle2,
    title: "Your profile",
    body: "A complete profile gets 3× more responses. Build it once, apply everywhere.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export default function WelcomeModal({ open, onClose, onStartTour }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const Icon = slide.icon;
  const isLast = idx === SLIDES.length - 1;
  const isFirst = idx === 0;

  const handleClose = () => {
    setIdx(0);
    onClose();
  };

  const handleStart = () => {
    setIdx(0);
    onStartTour();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md border-2 border-foreground/80 shadow-[6px_6px_0_0_hsl(var(--accent))] p-0 gap-0">
        <div className="p-6 pb-4">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent mb-4">
            Welcome to Locus · {idx + 1} of {SLIDES.length}
          </div>

          <div className="border-2 border-foreground/80 bg-muted/30 rounded-xl p-6 mb-5 flex items-center justify-center min-h-[120px]">
            <Icon size={48} className="text-accent" />
          </div>

          <h2 className="font-heading text-xl font-extrabold uppercase tracking-wider text-foreground mb-2">
            {slide.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {slide.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-accent" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 p-4 border-t-2 border-foreground/20">
          <button
            onClick={handleClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider px-2"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="neutral" size="sm" onClick={() => setIdx((i) => i - 1)}>
                <ArrowLeft size={14} />
                Back
              </Button>
            )}
            {!isLast ? (
              <Button variant="default" size="sm" onClick={() => setIdx((i) => i + 1)}>
                Next
                <ArrowRight size={14} />
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={handleStart}>
                Take the tour
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
