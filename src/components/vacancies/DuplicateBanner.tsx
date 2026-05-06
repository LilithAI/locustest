import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { Vacancy } from "@/lib/vacancies";
import { type DupeResult, daysAgo } from "@/lib/vacancy-dedupe";

interface Props {
  result: DupeResult;
}

export default function DuplicateBanner({ result }: Props) {
  const { hardMatches, softMatches, emailReuse, urlReuse } = result;
  if (
    hardMatches.length === 0 &&
    softMatches.length === 0 &&
    emailReuse.length === 0 &&
    urlReuse.length === 0
  )
    return null;

  const isHard = hardMatches.length > 0;
  const headline = isHard
    ? "Possible duplicate — already on the board"
    : softMatches.length > 0
      ? "Looks similar to an existing vacancy"
      : urlReuse.length > 0
        ? "Heads up — this portal URL is in use elsewhere"
        : "Heads up — this email is in use elsewhere";

  const subline = isHard
    ? "Same firm and same application channel. Don't post twice unless this is a fresh re-opening."
    : softMatches.length > 0
      ? "Same firm with a near-identical role. Confirm this isn't a re-paste."
      : urlReuse.length > 0
        ? "This careers URL was posted under a different firm recently. Verify the firm name."
        : "This email was used by a different firm recently. Verify the firm name is correct.";

  const items: { v: Vacancy; tag: "Duplicate" | "Similar" | "Email reuse" | "URL reuse" }[] = [
    ...hardMatches.map((v) => ({ v, tag: "Duplicate" as const })),
    ...softMatches.map((v) => ({ v, tag: "Similar" as const })),
    ...emailReuse.map((v) => ({ v, tag: "Email reuse" as const })),
    ...urlReuse.map((v) => ({ v, tag: "URL reuse" as const })),
  ].slice(0, 3);

  return (
    <div className="rounded-md border-2 border-foreground bg-accent/10 shadow-[3px_3px_0_0_hsl(var(--foreground))] p-3 mb-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-extrabold text-sm leading-tight">{headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subline}</p>

          <ul className="mt-2 space-y-1.5">
            {items.map(({ v, tag }) => {
              const d = daysAgo(v.posted_at);
              const live = v.status === "live" && new Date(v.expires_at).getTime() > Date.now();
              return (
                <li
                  key={v.id}
                  className="flex items-center gap-2 text-xs bg-background/60 border border-border/60 rounded px-2 py-1.5"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border border-foreground/60 bg-accent text-accent-foreground shrink-0">
                    {tag}
                  </span>
                  <span className="font-bold truncate">{v.firm_name}</span>
                  <span className="text-muted-foreground truncate">— {v.role}</span>
                  <span className="text-muted-foreground shrink-0">· {d === 0 ? "today" : `${d}d ago`}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                      live
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground border"
                    }`}
                  >
                    {live ? "Live" : v.status === "live" ? "Expired" : "Archived"}
                  </span>
                  <Link
                    to="/admin/vacancies"
                    target="_blank"
                    className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
                    title="Open admin board"
                  >
                    <ExternalLink size={12} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
