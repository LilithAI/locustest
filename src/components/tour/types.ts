export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  target: string; // CSS selector
  title: string;
  body: string;
  placement?: TourPlacement;
}
