import { Check } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";

export function KeyPoints({ title = "Remember this", children }: { title?: string; children: ReactNode }) {
  // Extract <li> items from the markdown <ul> child
  const items: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.type === "ul" || child.type === "ol")) {
      Children.forEach((child.props as { children?: ReactNode }).children, (li) => {
        if (isValidElement(li) && li.type === "li") {
          items.push((li.props as { children?: ReactNode }).children);
        }
      });
    }
  });

  return (
    <div className="my-8 rounded-lg border-l-4 border-accent bg-accent/5 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent mb-4 font-mono">
        {title}
      </p>
      <ul className="keypoints-list space-y-3 list-none p-0 m-0">
        {items.length > 0
          ? items.map((content, i) => (
              <li key={i} className="flex gap-3 items-start text-base leading-relaxed text-foreground/90">
                <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>{content}</span>
              </li>
            ))
          : children}
      </ul>
    </div>
  );
}
