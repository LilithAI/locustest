import type { ReactNode } from "react";

export function PullQuote({ children, attribution }: { children: ReactNode; attribution?: string }) {
  return (
    <blockquote className="my-8 border-l-4 border-accent pl-6 italic text-xl leading-relaxed text-foreground">
      <p className="not-italic font-serif">{children}</p>
      {attribution && (
        <footer className="mt-3 text-sm not-italic font-normal text-muted-foreground">
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}
