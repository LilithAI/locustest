import {
  DESIGNATION_LABELS,
  RANK_THRESHOLDS,
} from "./constants";
import type { BarDesignation } from "./types";

export function formatDesignation(d: BarDesignation): string {
  return DESIGNATION_LABELS[d];
}

export interface NextRankInfo {
  nextRank: BarDesignation | null;
  pointsNeeded: number;
  accuracyBlocker: boolean;
  accuracyNeeded: number;
}

export function pointsToNextRank(
  currentPoints: number,
  currentAccuracy: number,
  currentDesignation: BarDesignation,
): NextRankInfo {
  const idx = RANK_THRESHOLDS.findIndex((t) => t.designation === currentDesignation);
  const next = idx >= 0 && idx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[idx + 1] : null;
  if (!next) {
    return { nextRank: null, pointsNeeded: 0, accuracyBlocker: false, accuracyNeeded: 0 };
  }
  const pointsNeeded = Math.max(0, next.minPoints - currentPoints);
  const accuracyBlocker = currentAccuracy < next.minAccuracy;
  return {
    nextRank: next.designation,
    pointsNeeded,
    accuracyBlocker,
    accuracyNeeded: next.minAccuracy,
  };
}

export function getRelativeDateLabel(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
