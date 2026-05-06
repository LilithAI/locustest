import { useState } from "react";
import { Building2, MapPin, Mail, ExternalLink, Globe, Users, Layers, Scale, ClipboardList, Sparkles } from "lucide-react";
import { ShareIconButton } from "@/components/ShareIconButton";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import DraftEmailDialog, { type DraftEmailTarget } from "@/components/apply/DraftEmailDialog";
import { shareOrCopy, withRef } from "@/lib/share";

export interface Startup {
  name: string;
  city?: string | null;
  sector?: string | null;
  type?: string | null;
  stage?: string | null;
  website?: string | null;
  email?: string | null;
  employees?: string | null;
  hasLegalDept?: string | null;
  legalNeeds?: string | null;
}

interface Props {
  startup: Startup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export default function StartupDrawer({ startup, open, onOpenChange }: Props) {
  const [draftOpen, setDraftOpen] = useState(false);

  if (!startup) return null;

  const websiteUrl = startup.website ? normalizeUrl(startup.website) : null;

  const draftTarget: DraftEmailTarget | null = startup.email
    ? {
        id: `startup:${startup.name}:${startup.email}`,
        name: startup.name,
        email: startup.email,
        kind: "startup",
        type: startup.type ?? null,
        city: startup.city ?? null,
        sector: startup.sector ?? null,
        legal_needs: startup.legalNeeds ?? null,
      }
    : null;

  const logHref = `/applications?logFirm=${encodeURIComponent(startup.name)}${
    startup.legalNeeds ? `&logNotes=${encodeURIComponent(`Legal needs: ${startup.legalNeeds}`)}` : ""
  }`;

  const legalNeedsList = startup.legalNeeds
    ? startup.legalNeeds.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="font-heading text-xl leading-tight">{startup.name}</SheetTitle>
            <ShareIconButton
              label="Share this startup"
              onShare={async () => {
                const slug = encodeURIComponent(startup.name);
                const url = withRef(`https://locus.legal/directory?startup=${slug}`, "startup-share");
                const text = `${startup.name}${startup.city ? `, ${startup.city}` : ""}${startup.sector ? ` · ${startup.sector}` : ""} — found via Locus`;
                const r = await shareOrCopy({ title: "Locus — Startup Directory", text, url });
                if (r === "copied") toast.success("Link copied");
              }}
            />
          </div>
          <SheetDescription className="sr-only">Details for {startup.name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {startup.stage && (
              <span className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                {startup.stage}
              </span>
            )}
            {startup.type && (
              <span className="text-xs font-medium bg-accent/10 text-accent px-3 py-1 rounded-full">
                {startup.type}
              </span>
            )}
            {startup.hasLegalDept && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                startup.hasLegalDept.toLowerCase() === "yes"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-accent/10 text-accent"
              }`}>
                {startup.hasLegalDept.toLowerCase() === "yes" ? "Has legal team" : "No legal team"}
              </span>
            )}
          </div>

          {/* Quick facts */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
            {startup.sector && (
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Layers size={16} className="shrink-0 mt-0.5 text-accent" />
                <span>{startup.sector}</span>
              </div>
            )}
            {startup.city && (
              <div className="flex items-start gap-2 text-sm text-foreground">
                <MapPin size={16} className="shrink-0 mt-0.5 text-accent" />
                <span>{startup.city}</span>
              </div>
            )}
            {startup.employees && (
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Users size={16} className="shrink-0 mt-0.5 text-accent" />
                <span>{startup.employees} employees</span>
              </div>
            )}
          </div>

          {/* Legal needs */}
          {legalNeedsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Scale size={12} /> Key Legal Needs
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {legalNeedsList.map((need) => (
                  <span key={need} className="text-[11px] font-medium bg-card border border-border/60 px-2.5 py-1 rounded-full">
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
            {startup.email && (
              <a
                href={`mailto:${startup.email}`}
                className="flex items-center gap-3 text-sm text-foreground hover:text-accent transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Mail size={14} className="text-accent" />
                </div>
                <span className="truncate">{startup.email}</span>
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-foreground hover:text-accent transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Globe size={14} className="text-accent" />
                </div>
                <span className="truncate">{startup.website}</span>
              </a>
            )}
            {!startup.email && !websiteUrl && (
              <p className="text-sm text-muted-foreground">No contact information available.</p>
            )}
          </div>

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
            <Link
              to={logHref}
              className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors ${
                draftTarget
                  ? "bg-card border border-border text-foreground hover:border-accent/40"
                  : "bg-accent text-accent-foreground hover:opacity-90"
              }`}
            >
              <ClipboardList size={14} />
              Log as Application
            </Link>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-card border border-border text-foreground font-medium text-sm hover:border-accent/40 transition-colors"
              >
                <ExternalLink size={14} />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </SheetContent>

      <DraftEmailDialog open={draftOpen} onOpenChange={setDraftOpen} target={draftTarget} />
    </Sheet>
  );
}
