import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Phone, Mail, ExternalLink, Sparkles, ShieldCheck, Eye, MessageSquarePlus, ArrowRight } from "lucide-react";
import { ShareIconButton } from "@/components/ShareIconButton";
import { toast } from "sonner";
import { getFirmIntelligenceSlugs } from "@/lib/firm-profiles";
import FirmIntelligenceBadge from "@/components/directory/FirmIntelligenceBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DraftEmailDialog, { type DraftEmailTarget } from "@/components/apply/DraftEmailDialog";
import SuggestFixDialog from "@/components/directory/SuggestFixDialog";
import { shareOrCopy, withRef } from "@/lib/share";
import { track } from "@/lib/analytics";

type FirmType = "Law Firm" | "Chamber" | "Individual Advocate";

interface Firm {
  id?: string;
  firm_slug?: string;
  name: string;
  address?: string;
  city?: string;
  area?: string;
  tier?: string;
  rating?: number | string | null;
  phone?: string;
  email?: string;
  verified?: string;
  verificationNote?: string;
  channel?: string;
}

interface FirmDrawerProps {
  firm: Firm | null;
  type: FirmType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FirmDrawer({ firm, type, open, onOpenChange }: FirmDrawerProps) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hasIntelligence, setHasIntelligence] = useState(false);

  useEffect(() => {
    if (open && firm) {
      void track("firm_view", { name: firm.name, type, city: firm.city ?? null });
    }
  }, [open, firm, type]);

  useEffect(() => {
    let cancelled = false;
    if (open && firm?.firm_slug) {
      getFirmIntelligenceSlugs().then((set) => {
        if (!cancelled) setHasIntelligence(set.has(firm.firm_slug!));
      });
    } else {
      setHasIntelligence(false);
    }
    return () => { cancelled = true; };
  }, [open, firm]);

  if (!firm) return null;

  const mapsUrl = firm.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firm.address)}`
    : null;

  const draftTarget: DraftEmailTarget | null = firm.email
    ? {
        id: `firm:${firm.name}:${firm.email}`,
        name: firm.name,
        email: firm.email,
        kind: "firm",
        type,
        city: firm.city ?? null,
        practice_areas: type,
      }
    : null;

  const isVerified = firm.verified === "verified";
  const isLikely = firm.verified === "likely";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="font-heading text-xl leading-tight">{firm.name}</SheetTitle>
            <ShareIconButton
              label="Share this firm"
              onShare={async () => {
                const slug = encodeURIComponent(firm.name);
                const url = withRef(`https://locus.legal/directory?firm=${slug}`, "firm");
                const text = `${firm.name}${firm.city ? `, ${firm.city}` : ""} — found via Locus`;
                const r = await shareOrCopy({ title: "Locus — Firm Directory", text, url });
                if (r === "copied") toast.success("Link copied");
              }}
            />
          </div>
          <SheetDescription className="sr-only">Details for {firm.name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {firm.tier && (
              <span className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                {firm.tier}
              </span>
            )}
            <span className="text-xs font-medium bg-accent/10 text-accent px-3 py-1 rounded-full">
              {type}
            </span>
            {firm.rating && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-accent/10 text-accent px-3 py-1 rounded-full">
                <Star size={12} /> {firm.rating}
              </span>
            )}
            {hasIntelligence && <FirmIntelligenceBadge size="md" />}
          </div>

          {/* Verification */}
          {(isVerified || isLikely) && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-help ${
                      isVerified
                        ? "border-foreground bg-accent text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                        : "border-border bg-muted/40 text-foreground"
                    }`}
                  >
                    {isVerified ? <ShieldCheck size={16} /> : <Eye size={16} className="text-muted-foreground" />}
                    <span className="text-xs font-bold">
                      {isVerified ? "Independently verified" : "Listed source"}
                    </span>
                  </div>
                </TooltipTrigger>
                {firm.verificationNote && (
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{firm.verificationNote}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Address */}
          {firm.address && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm text-foreground">
                <MapPin size={16} className="shrink-0 mt-0.5 text-accent" />
                <span>{firm.address}</span>
              </div>
              <div className="text-xs text-muted-foreground pl-6">
                {firm.area}{firm.area && firm.city ? ", " : ""}{firm.city}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
            {firm.phone && (
              <a
                href={`tel:${firm.phone}`}
                className="flex items-center gap-3 text-sm text-foreground hover:text-accent transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Phone size={14} className="text-accent" />
                </div>
                {firm.phone}
              </a>
            )}
            {firm.email ? (
              <a
                href={`mailto:${firm.email}`}
                className="flex items-center gap-3 text-sm text-foreground hover:text-accent transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Mail size={14} className="text-accent" />
                </div>
                <span className="truncate">{firm.email}</span>
              </a>
            ) : firm.phone ? (
              <p className="text-xs text-muted-foreground italic pl-1">No public email — best reached by phone.</p>
            ) : null}
            {!firm.phone && !firm.email && (
              <p className="text-sm text-muted-foreground">No contact information available.</p>
            )}
          </div>

          {/* Firm Intelligence CTA */}
          {hasIntelligence && firm.firm_slug && (
            <Link
              to={`/directory/firm/${firm.firm_slug}`}
              className="block bg-card border-2 border-foreground rounded-lg p-3 shadow-[3px_3px_0_0_hsl(var(--accent))] hover:shadow-[5px_5px_0_0_hsl(var(--accent))] hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-accent text-accent-foreground border-2 border-foreground shrink-0">
                    <Sparkles size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground">Open Firm Intelligence</div>
                    <div className="text-[11px] text-muted-foreground">Partners, offices, practice areas…</div>
                  </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-accent group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {draftTarget && (
              <button
                type="button"
                onClick={() => setDraftOpen(true)}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Sparkles size={14} />
                Draft Application Email
              </button>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors ${
                  draftTarget
                    ? "bg-card border border-border text-foreground hover:border-accent/40"
                    : "bg-accent text-accent-foreground hover:opacity-90"
                }`}
              >
                <ExternalLink size={14} />
                Open in Google Maps
              </a>
            )}
          </div>

          {/* Suggest a fix — prominent neobrutalist call-out */}
          <div className="pt-4 border-t-2 border-foreground/20">
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              className="w-full text-left bg-card border-2 border-foreground rounded-lg p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[4px_4px_0_0_hsl(var(--accent))] hover:border-accent transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-foreground border-2 border-foreground">
                  <MessageSquarePlus size={14} />
                </span>
                <span className="font-bold text-sm text-foreground">Spot something wrong? Help us fix it</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                You can suggest corrections for:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-muted border border-foreground/30">Wrong email</span>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-muted border border-foreground/30">Tier (1-4)</span>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-muted border border-foreground/30">Phone number</span>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-muted border border-foreground/30">Closed firm</span>
              </div>
              <p className="text-[11px] text-accent font-bold mt-2 group-hover:underline">
                Suggest a fix →
              </p>
            </button>
          </div>
        </div>
      </SheetContent>

      <DraftEmailDialog open={draftOpen} onOpenChange={setDraftOpen} target={draftTarget} />
      <SuggestFixDialog firm={firm} open={suggestOpen} onOpenChange={setSuggestOpen} />
    </Sheet>
  );
}
