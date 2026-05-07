import { useState, useEffect, useRef } from "react";
import { Briefcase, MapPin, Coins, GraduationCap, Mail, AlertTriangle, Clock, ChevronDown, Check, RotateCw, ClipboardList, X, Loader2 } from "lucide-react";
import { ShareIconButton } from "@/components/ShareIconButton";
import { track } from "@/lib/analytics";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  type Vacancy,
  daysLeft,
  urgencyTone,
  type VacancyApplication,
  applicationStateFor,
  isFreshVacancy,
  TIER_LABELS,
} from "@/lib/vacancies";
import { useCountdown } from "@/lib/useCountdown";
import { cn } from "@/lib/utils";
import { shareOrCopy, withRef } from "@/lib/share";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

interface Props {
  vacancy: Vacancy;
  onApply?: (v: Vacancy, opts?: { followup?: boolean }) => void;
  archived?: boolean;
  application?: VacancyApplication | null;
  onDeleted?: () => void;
}

export default function VacancyCard({ vacancy, onApply, archived = false, application, onDeleted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const hasTask = !!vacancy.task_brief && vacancy.task_brief.trim().length > 0;
  const days = daysLeft(vacancy.expires_at);
  const tone = urgencyTone(days);
  const { label: countdownLabel, expired } = useCountdown(vacancy.expires_at);
  const isClosed = archived || expired;
  const isNew = !isClosed && isFreshVacancy(vacancy.posted_at);

  const { state: appState, daysUntilFollowup, lastActionOn } = applicationStateFor(application);

  // Fire vacancy_view once when card scrolls into view
  useEffect(() => {
    if (!cardRef.current || viewedRef.current) return;
    const el = cardRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !viewedRef.current) {
            viewedRef.current = true;
            void track("vacancy_view", { vacancy_id: vacancy.id, type: vacancy.opportunity_type });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [vacancy.id, vacancy.opportunity_type]);

  return (
    <div
      ref={cardRef}
      id={`vacancy-${vacancy.id}`}
      className={cn(
        "relative bg-card border-2 rounded-2xl p-5 md:p-6 transition-all",
        isClosed
          ? "border-border/40 opacity-60 grayscale"
          : appState === "applied" || appState === "followed_up"
          ? "border-accent/70 bg-accent/5 shadow-[3px_3px_0_0_hsl(var(--accent)/0.4)]"
          : "border-foreground/80 shadow-[4px_4px_0_0_hsl(var(--accent))] hover:shadow-[6px_6px_0_0_hsl(var(--accent))] hover:-translate-y-0.5",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg md:text-xl font-extrabold tracking-tight text-foreground truncate">
            {vacancy.firm_name}
          </h3>
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Briefcase size={14} /> {vacancy.role}
            <span
              className={cn(
                "ml-1 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2",
                vacancy.opportunity_type === "job"
                  ? "border-foreground/80 bg-background text-foreground"
                  : "border-foreground/80 bg-accent text-accent-foreground",
              )}
            >
              {vacancy.opportunity_type === "job" ? "Job" : "Internship"}
            </span>
            {hasTask && (
              <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2 border-foreground/80 bg-foreground text-background">
                <ClipboardList size={10} />
                Task required
              </span>
            )}
            {vacancy.tier && (
              <span
                className="ml-1 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2 border-foreground/80 bg-background text-foreground"
                title={`Firm tier: ${TIER_LABELS[vacancy.tier]}`}
              >
                {TIER_LABELS[vacancy.tier]}
              </span>
            )}
            {vacancy.application_mode === "external_url" && (
              <span
                className="ml-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2 border-foreground/80 bg-foreground text-background"
                title="Apply via the company's careers portal"
              >
                <ExternalLinkIcon size={10} />
                Portal
              </span>
            )}
            {isNew && (
              <span
                className="ml-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border-2 border-foreground bg-accent text-accent-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                aria-label="Newly added vacancy"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                New
              </span>
            )}
          </p>
        </div>

        {isClosed ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
            Closed
          </span>
        ) : tone === "soon" ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-foreground border-2 border-foreground/70 shrink-0">
            <AlertTriangle size={12} />
            {countdownLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent text-accent-foreground border-2 border-foreground/70 shrink-0">
            <Clock size={12} />
            {countdownLabel}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-3">
        {vacancy.location && (
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {vacancy.location}</span>
        )}
        {vacancy.stipend && (
          <span className="inline-flex items-center gap-1"><Coins size={12} /> {vacancy.stipend}</span>
        )}
        {vacancy.eligibility && (
          <span className="inline-flex items-center gap-1"><GraduationCap size={12} /> {vacancy.eligibility}</span>
        )}
      </div>

      {/* Description */}
      {vacancy.description && (
        <div className="mb-4">
          <p className={cn("text-sm text-foreground/80 whitespace-pre-wrap", !expanded && "line-clamp-3")}>
            {vacancy.description}
          </p>
          {vacancy.description.length > 180 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs font-semibold text-accent hover:underline mt-1 inline-flex items-center gap-1"
            >
              {expanded ? "Show less" : "Read more"}
              <ChevronDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      )}

      {/* Required task — surfaced inline, not a PDF */}
      {hasTask && (
        <div className="mb-4 rounded-lg border-2 border-foreground/80 bg-accent/15 p-3 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-foreground">
              <ClipboardList size={13} />
              Written task required to apply
            </span>
            {vacancy.task_brief!.length > 220 && (
              <button
                onClick={() => setTaskOpen((o) => !o)}
                className="text-[11px] font-semibold text-accent hover:underline inline-flex items-center gap-1 shrink-0"
              >
                {taskOpen ? "Collapse" : "Expand"}
                <ChevronDown size={11} className={cn("transition-transform", taskOpen && "rotate-180")} />
              </button>
            )}
          </div>
          <p className={cn("text-sm text-foreground whitespace-pre-wrap font-medium", !taskOpen && "line-clamp-4")}>
            {vacancy.task_brief}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 font-semibold">
            Submit this with your application email — no PDF attached.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
        <div className="text-xs text-muted-foreground truncate flex items-center gap-2 min-w-0">
          <span className="truncate">
            {appState === "applied" && lastActionOn ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <Check size={12} /> Applied {format(parseISO(lastActionOn), "d MMM")}
              </span>
            ) : appState === "followed_up" && lastActionOn ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                <Check size={12} /> Followed up {format(parseISO(lastActionOn), "d MMM")}
              </span>
            ) : appState === "followup_ready" && lastActionOn ? (
              <span className="inline-flex items-center gap-1.5 text-foreground/80">
                Sent {format(parseISO(lastActionOn), "d MMM")} · time to nudge
              </span>
            ) : vacancy.source_credit ? (
              <span>{vacancy.source_credit}</span>
            ) : null}
          </span>
          {!isClosed && (
            <ShareIconButton
              size="sm"
              label="Share this opportunity"
              onShare={async () => {
                const url = withRef(`https://locus.legal/vacancies#vacancy-${vacancy.id}`, "vacancy");
                const text = `${vacancy.role} at ${vacancy.firm_name} — via Locus`;
                const r = await shareOrCopy({ title: "Locus — Vacancy", text, url });
                if (r === "copied") toast.success("Link copied");
              }}
            />
          )}
          {!isClosed && application && appState !== "idle" && (
            <button
              type="button"
              aria-label="Remove this application from your tracker"
              title="Remove application"
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md border-2 border-destructive/70 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive shadow-[2px_2px_0_0_hsl(var(--destructive))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_hsl(var(--destructive))] transition-all disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} strokeWidth={2.5} />}
            </button>
          )}
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this application?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your tracker record for{" "}
                <strong>{vacancy.firm_name} — {vacancy.role}</strong>. The follow-up reminder
                and "Applied" badge will disappear. This action cannot be undone — it does not
                recall any email you've already sent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (!application) return;
                  setDeleting(true);
                  const { error } = await supabase
                    .from("profile_applications")
                    .delete()
                    .eq("id", application.id);
                  setDeleting(false);
                  if (error) {
                    toast.error("Couldn't remove. Try again.");
                    return;
                  }
                  toast.success("Application removed.");
                  setConfirmDelete(false);
                  onDeleted?.();
                }}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!isClosed && appState === "idle" && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onApply && (vacancy.application_email || !vacancy.application_url) && (
              <Button
                onClick={() => {
                  void track("vacancy_apply_clicked", { vacancy_id: vacancy.id, mode: "initial" });
                  onApply(vacancy);
                }}
                variant={vacancy.application_url ? "outline" : "default"}
                className="font-bold border-2 border-foreground/80 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <Mail size={14} className="mr-1.5" />
                Draft application
              </Button>
            )}
            {vacancy.application_url && (
              <a
                href={vacancy.application_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void track("vacancy_apply_clicked", { vacancy_id: vacancy.id, mode: "portal" });
                }}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 text-sm font-bold border-2 border-foreground/80 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <ExternalLinkIcon size={14} className="mr-1.5" />
                Apply on portal
              </a>
            )}
          </div>
        )}

        {!isClosed && appState === "applied" && (
          <Button
            disabled
            variant="outline"
            className="font-bold border-2 border-accent/60 bg-accent/10 text-accent disabled:opacity-100 cursor-not-allowed"
          >
            <Check size={14} className="mr-1.5" />
            Follow up in {daysUntilFollowup}d
          </Button>
        )}

        {!isClosed && appState === "followed_up" && (
          <Button
            disabled
            variant="outline"
            className="font-bold border-2 border-accent/60 bg-accent/10 text-accent disabled:opacity-100 cursor-not-allowed"
          >
            <Check size={14} className="mr-1.5" />
            Followed up
          </Button>
        )}

        {!isClosed && onApply && appState === "followup_ready" && (
          <Button
            onClick={() => {
              void track("vacancy_apply_clicked", { vacancy_id: vacancy.id, mode: "followup" });
              onApply(vacancy, { followup: true });
            }}
            variant="outline"
            className="font-bold border-2 border-accent text-foreground bg-background hover:bg-accent hover:text-accent-foreground shadow-[3px_3px_0_0_hsl(var(--accent))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--accent))]"
          >
            <RotateCw size={14} className="mr-1.5" />
            Draft follow-up
          </Button>
        )}
      </div>
    </div>
  );
}
