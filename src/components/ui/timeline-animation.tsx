/**
 * TimelineContent — lightweight CSS-only reveal-on-scroll.
 *
 * Was previously powered by framer-motion's <motion.div whileInView/>, which
 * pulled the entire framer-motion package (~60 KB) into the home-page critical
 * bundle. This rewrite keeps the same exported API (TimelineContent /
 * textVariants / revealVariants) so existing call-sites work unchanged, but
 * implements the fade-up-and-deblur effect with IntersectionObserver +
 * Tailwind transitions. Zero JS animation runtime.
 */
import {
  type ReactNode,
  type ElementType,
  type CSSProperties,
  type HTMLAttributes,
  createElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// Kept as no-op exports so existing imports keep working.
// The shape mirrors framer-motion's Variants for type compatibility but the
// values are unused at runtime now.
export type Variants = Record<string, unknown>;
export const revealVariants: Variants = {};
export const textVariants: Variants = {};

type TimelineContentProps = {
  children: ReactNode;
  as?: ElementType;
  index?: number;
  /** Accepted for API compatibility; ignored. */
  variants?: Variants;
  className?: string;
  /** Accepted for API compatibility; the observer always unobserves on first reveal. */
  once?: boolean;
  /** 0–1 visibility threshold. */
  amount?: number;
  /** Variant strength — text reveals are slightly subtler. */
  strength?: "default" | "text";
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function TimelineContent({
  children,
  as,
  index = 0,
  variants: _variants,
  className,
  once: _once = true,
  amount = 0.2,
  strength,
  ...rest
}: TimelineContentProps) {
  const Comp = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(false);

  // Pick variant strength from the variants object the caller passed, so the
  // common `variants={textVariants}` call still gets the lighter blur/translate.
  const isText = strength === "text" || _variants === textVariants;

  useEffect(() => {
    setReduce(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduce) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: Math.min(Math.max(amount, 0), 1) }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [amount, reduce]);

  const stagger = Math.max(0, index) * (isText ? 0.06 : 0.1);
  const duration = isText ? 0.5 : 0.55;
  const translate = isText ? "18px" : "30px";
  const blurAmount = isText ? "8px" : "10px";

  const style: CSSProperties = {
    transitionProperty: "opacity, transform, filter",
    transitionDuration: `${duration}s`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: `${stagger}s`,
    opacity: visible ? 1 : 0,
    transform: visible ? "translate3d(0,0,0)" : `translate3d(0, ${translate}, 0)`,
    filter: visible ? "blur(0px)" : `blur(${blurAmount})`,
    willChange: visible ? undefined : "opacity, transform, filter",
  };

  return createElement(
    Comp,
    {
      ref,
      className: cn(className),
      style,
      ...rest,
    },
    children
  );
}
