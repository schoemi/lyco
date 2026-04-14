"use client";

import { useState } from "react";
import type { StageSettings } from "@/types/stage";

/** Colors used for confidence highlighting */
export const CONFIDENCE_COLORS = {
  normal: "#FFFFFF",
  dimmed: "#AAAAAA",
  amber: "#F5A623",
} as const;

/**
 * Pure function: calculates the display color for a strophe based on its
 * confidence score and the current threshold settings.
 *
 * - Highlighting disabled → #FFFFFF
 * - No score (undefined) → #FFFFFF
 * - score > high → #FFFFFF (normal)
 * - low ≤ score ≤ high → #AAAAAA (dimmed)
 * - score < low → #F5A623 (amber)
 */
export function getConfidenceColor(
  score: number | undefined,
  thresholds: { low: number; high: number },
  enabled: boolean,
): string {
  if (!enabled) return CONFIDENCE_COLORS.normal;
  if (score === undefined) return CONFIDENCE_COLORS.normal;
  if (score > thresholds.high) return CONFIDENCE_COLORS.normal;
  if (score >= thresholds.low) return CONFIDENCE_COLORS.dimmed;
  return CONFIDENCE_COLORS.amber;
}

export interface UseConfidenceHighlightingReturn {
  getLineColor: (stropheId: string) => string;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  thresholds: { low: number; medium: number };
  setThresholds: (thresholds: { low: number; medium: number }) => void;
}

/**
 * Hook for confidence-based line color highlighting.
 *
 * @param progress - Map of stropheId → confidence score (0–100)
 * @param initialSettings - Initial StageSettings (reads highlightingEnabled and thresholds)
 */
export function useConfidenceHighlighting(
  progress: Map<string, number>,
  initialSettings: Pick<
    StageSettings,
    "highlightingEnabled" | "highlightThresholdLow" | "highlightThresholdHigh"
  >,
): UseConfidenceHighlightingReturn {
  const [isEnabled, setEnabled] = useState(initialSettings.highlightingEnabled);
  const [thresholds, setThresholds] = useState({
    low: initialSettings.highlightThresholdLow,
    medium: initialSettings.highlightThresholdHigh,
  });

  function getLineColor(stropheId: string): string {
    const score = progress.get(stropheId);
    return getConfidenceColor(score, { low: thresholds.low, high: thresholds.medium }, isEnabled);
  }

  return { getLineColor, isEnabled, setEnabled, thresholds, setThresholds };
}
