import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function RitMessage({ role, content }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg border-2 border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">You</div>
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className={cn("max-w-[90%] rounded-lg border-2 border-l-4 border-border border-l-accent bg-background px-3 py-2 text-sm text-foreground")}>
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Rit</div>
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
