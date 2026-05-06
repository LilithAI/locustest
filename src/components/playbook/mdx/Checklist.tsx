import { useState } from "react";
import { Check } from "lucide-react";

export function Checklist({ items = [], title }: { items?: string[]; title?: string }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="my-6">
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <ul className="space-y-2 list-none pl-0">
        {items.map((item, i) => {
          const isChecked = checked.has(i);
          return (
            <li key={i} className="list-none">
              <button
                onClick={() => toggle(i)}
                className="flex items-start gap-3 w-full text-left group"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    isChecked
                      ? "bg-accent border-accent"
                      : "border-border group-hover:border-accent/60"
                  }`}
                >
                  {isChecked && <Check size={12} className="text-accent-foreground" />}
                </span>
                <span
                  className={`text-sm leading-relaxed transition-colors ${
                    isChecked ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
