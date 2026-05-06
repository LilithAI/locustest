import { Link } from "react-router-dom";

const ACTIONS: { label: string; to: string }[] = [
  { label: "Browse directory", to: "/directory" },
  { label: "Take a challenge", to: "/the-bar" },
  { label: "Open playbook", to: "/playbook" },
  { label: "Log application", to: "/applications" },
  { label: "View leaderboard", to: "/the-bar/leaderboard" },
  { label: "Edit profile", to: "/profile/edit" },
];

export default function QuickActionsFooter() {
  return (
    <div className="border-t border-border/60 pt-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </span>
        {ACTIONS.map((a, i) => (
          <span key={a.to} className="flex items-center gap-x-4">
            <Link
              to={a.to}
              className="font-mono text-xs text-muted-foreground hover:text-accent hover:underline underline-offset-4 transition-colors"
            >
              {a.label}
            </Link>
            {i < ACTIONS.length - 1 && (
              <span className="text-muted-foreground/40 text-xs">·</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
