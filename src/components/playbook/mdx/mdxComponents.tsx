import type { ReactNode, HTMLAttributes } from "react";
import { Callout } from "./Callout";
import { Checklist } from "./Checklist";
import { EmailBlock } from "./EmailBlock";
import { KeyPoints } from "./KeyPoints";
import { PullQuote } from "./PullQuote";

/* Extract the plain-text content of an MDX heading so we can do
   text-based variant matching (e.g. "What works" → positive). */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

const POSITIVE_PATTERNS = [
  /what works/i,
  /\bdo this\b/i,
  /^do\b/i,
  /where to look/i,
  /the email structure/i,
];
const WARNING_PATTERNS = [
  /what kills/i,
  /\bdon'?t\b/i,
  /avoid/i,
  /never\b/i,
  /mistakes?\b/i,
];

function classifyH3(text: string): "" | "prose-h3-positive" | "prose-h3-warning" {
  if (WARNING_PATTERNS.some((p) => p.test(text))) return "prose-h3-warning";
  if (POSITIVE_PATTERNS.some((p) => p.test(text))) return "prose-h3-positive";
  return "";
}

const PROSE_EYEBROWS = [
  "Open",
  "Before you apply",
  "The approach",
  "Build the email",
  "Send & follow up",
  "After you hear back",
];

let h2Index = 0;
let lastSlug: string | null = null;

function H2({ children, id, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  // Reset eyebrow counter when the page (and therefore the article) changes.
  // We use the document path as a cheap heuristic.
  const slug = typeof window !== "undefined" ? window.location.pathname : "ssr";
  if (slug !== lastSlug) {
    h2Index = 0;
    lastSlug = slug;
  }
  const idx = h2Index++;
  // First H2 is the article title — no eyebrow.
  if (idx === 0) {
    return (
      <h2 id={id} {...rest}>
        {children}
      </h2>
    );
  }
  const eyebrow = PROSE_EYEBROWS[idx % PROSE_EYEBROWS.length];
  return (
    <>
      <span className="prose-eyebrow">§ {eyebrow}</span>
      <h2 id={id} {...rest}>
        {children}
      </h2>
    </>
  );
}

function H3({ children, className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  const text = extractText(children);
  const variant = classifyH3(text);
  const prefix =
    variant === "prose-h3-positive" ? "✓ " : variant === "prose-h3-warning" ? "✕ " : "";
  return (
    <h3 className={[className, variant].filter(Boolean).join(" ")} {...rest}>
      {prefix}
      {children}
    </h3>
  );
}

export const mdxComponents = {
  h2: H2,
  h3: H3,
  Callout,
  Checklist,
  EmailBlock,
  KeyPoints,
  PullQuote,
};
