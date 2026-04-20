"use client";

import { useMemo } from "react";

/**
 * Represents the current position within a musical measure.
 */
export interface BeatPosition {
  /** 1-based measure number: floor(beatIndex / taktZaehler) + 1 */
  taktNummer: number;
  /** 1-based beat within the measure: (beatIndex % taktZaehler) + 1 */
  schlagImTakt: number;
  /** 0-based index of the last beat ≤ currentTimeMs */
  beatIndex: number;
}

const DEFAULT_TAKT_ZAEHLER = 4;

/**
 * Pure computation of beat position from beat timestamps and current playback time.
 * Extracted for testability without React dependency.
 */
export function berechneBeatPosition(
  beatPositionenMs: number[],
  currentTimeMs: number,
  taktZaehler: number = DEFAULT_TAKT_ZAEHLER,
): BeatPosition | null {
  // Guard: fall back to default for invalid taktZaehler (0, negative)
  const safeTaktZaehler =
    taktZaehler > 0 ? taktZaehler : DEFAULT_TAKT_ZAEHLER;

  if (beatPositionenMs.length === 0) {
    return null;
  }

  // Find the index of the last beat that has been passed
  let currentBeatIndex = -1;
  for (let i = beatPositionenMs.length - 1; i >= 0; i--) {
    if (beatPositionenMs[i] <= currentTimeMs) {
      currentBeatIndex = i;
      break;
    }
  }

  if (currentBeatIndex < 0) {
    return null;
  }

  const taktNummer = Math.floor(currentBeatIndex / safeTaktZaehler) + 1;
  const schlagImTakt = (currentBeatIndex % safeTaktZaehler) + 1;

  return {
    taktNummer,
    schlagImTakt,
    beatIndex: currentBeatIndex,
  };
}

/**
 * React hook that computes the current beat position from beat timestamps
 * and the current playback time.
 *
 * @param beatPositionenMs - Sorted array of beat timestamps in milliseconds
 * @param currentTimeMs - Current playback position in milliseconds
 * @param taktZaehler - Beats per measure (default: 4 for 4/4 time)
 * @returns BeatPosition or null when no active beat position exists
 */
export function useBeatPosition(
  beatPositionenMs: number[],
  currentTimeMs: number,
  taktZaehler: number = DEFAULT_TAKT_ZAEHLER,
): BeatPosition | null {
  return useMemo(
    () => berechneBeatPosition(beatPositionenMs, currentTimeMs, taktZaehler),
    [beatPositionenMs, currentTimeMs, taktZaehler],
  );
}
