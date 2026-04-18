/**
 * Unit-Tests für aggregiereFramesZuBalken
 *
 * Testet die Aggregation von ReferenzFrames zu PitchBalken:
 * - Leeres Array
 * - Nur stimmlose Frames
 * - Einzelner stimmaktiver Frame
 * - Mehrere zusammenhängende stimmaktive Segmente
 * - Lücken-Toleranz (kurze stimmlose Lücken ≤ 200ms werden überbrückt)
 * - Nachbar-Zusammenführung (zeitlich nah ≤ 300ms + tonal ähnlich ≤ 3 Halbtöne)
 *
 * Requirements: 1.1, 1.4, 1.5
 */

import { describe, it, expect } from "vitest";
import {
  aggregiereFramesZuBalken,
  type PitchBalken,
} from "@/lib/pitch-display/pitch-balken";
import type { ReferenzFrame } from "@/types/vocal-trainer";

/** Helper: erzeugt einen ReferenzFrame mit Standardwerten */
function makeFrame(
  overrides: Partial<ReferenzFrame> & { timestampMs: number },
): ReferenzFrame {
  return {
    f0Hz: 440,
    midiValue: 69,
    isVoiced: true,
    isOnset: false,
    ...overrides,
  };
}

describe("aggregiereFramesZuBalken", () => {
  it("returns empty array for empty frames input", () => {
    const result = aggregiereFramesZuBalken([]);
    expect(result).toEqual([]);
  });

  it("returns empty array when all frames are unvoiced", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, isVoiced: false }),
      makeFrame({ timestampMs: 10, isVoiced: false }),
      makeFrame({ timestampMs: 20, isVoiced: false }),
    ];
    expect(aggregiereFramesZuBalken(frames)).toEqual([]);
  });

  it("produces one bar from a single voiced frame", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 100, midiValue: 60 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<PitchBalken>({
      startMs: 100, endMs: 100, midiValue: 60, durationMs: 0,
    });
  });

  it("merges consecutive voiced frames into a single bar", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 62 }),
      makeFrame({ timestampMs: 20, midiValue: 64 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(20);
    expect(result[0].midiValue).toBeCloseTo(62, 5);
  });

  // --- Lücken-Toleranz ---

  it("bridges short unvoiced gaps (≤ 200ms) within a segment", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 62 }),
      // 150ms unvoiced gap (under 200ms tolerance)
      makeFrame({ timestampMs: 20, isVoiced: false }),
      makeFrame({ timestampMs: 100, isVoiced: false }),
      makeFrame({ timestampMs: 170, isVoiced: false }),
      // Continues voiced
      makeFrame({ timestampMs: 180, midiValue: 63 }),
      makeFrame({ timestampMs: 190, midiValue: 64 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(190);
  });

  it("splits segments at unvoiced gaps longer than 200ms", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 62 }),
      // 300ms unvoiced gap (above 200ms tolerance)
      makeFrame({ timestampMs: 20, isVoiced: false }),
      makeFrame({ timestampMs: 170, isVoiced: false }),
      makeFrame({ timestampMs: 320, isVoiced: false }),
      // New segment, far apart + different pitch to avoid merge
      makeFrame({ timestampMs: 700, midiValue: 72 }),
      makeFrame({ timestampMs: 710, midiValue: 74 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(2);
    expect(result[0].endMs).toBe(10);
    expect(result[1].startMs).toBe(700);
  });

  // --- Nachbar-Zusammenführung ---

  it("merges neighboring bars that are close in time (≤ 300ms) and pitch (≤ 3 semitones)", () => {
    const frames: ReferenzFrame[] = [
      // Segment 1
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 61 }),
      // Gap > 200ms → separate raw bars
      makeFrame({ timestampMs: 20, isVoiced: false }),
      makeFrame({ timestampMs: 170, isVoiced: false }),
      makeFrame({ timestampMs: 320, isVoiced: false }),
      // Segment 2: starts at 330ms (320ms after segment 1 end at 10ms)
      // But ≤ 300ms gap from raw bar end AND ≤ 3 semitones → should merge
      makeFrame({ timestampMs: 280, midiValue: 62 }),
      makeFrame({ timestampMs: 290, midiValue: 63 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(290);
  });

  it("does not merge neighboring bars with large pitch difference (> 3 semitones)", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 60 }),
      // Gap > 200ms
      makeFrame({ timestampMs: 20, isVoiced: false }),
      makeFrame({ timestampMs: 170, isVoiced: false }),
      makeFrame({ timestampMs: 320, isVoiced: false }),
      // Close in time but far in pitch (> 3 semitones)
      makeFrame({ timestampMs: 280, midiValue: 72 }),
      makeFrame({ timestampMs: 290, midiValue: 72 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(2);
  });

  it("does not merge bars with large time gap (> 300ms)", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      makeFrame({ timestampMs: 10, midiValue: 60 }),
      // Very large gap
      makeFrame({ timestampMs: 20, isVoiced: false }),
      makeFrame({ timestampMs: 500, isVoiced: false }),
      makeFrame({ timestampMs: 800, isVoiced: false }),
      // Same pitch but > 300ms gap
      makeFrame({ timestampMs: 900, midiValue: 60 }),
      makeFrame({ timestampMs: 910, midiValue: 60 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(2);
  });

  // --- Edge cases ---

  it("ignores leading and trailing unvoiced frames", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, isVoiced: false }),
      makeFrame({ timestampMs: 10, isVoiced: false }),
      makeFrame({ timestampMs: 20, midiValue: 64 }),
      makeFrame({ timestampMs: 30, midiValue: 66 }),
      makeFrame({ timestampMs: 40, isVoiced: false }),
      makeFrame({ timestampMs: 50, isVoiced: false }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    expect(result).toHaveLength(1);
    expect(result[0].startMs).toBe(20);
    expect(result[0].endMs).toBe(30);
    expect(result[0].midiValue).toBeCloseTo(65, 5);
  });

  it("returns bars sorted by startMs", () => {
    const frames: ReferenzFrame[] = [
      makeFrame({ timestampMs: 0, midiValue: 60 }),
      // Large gap + large pitch difference → truly separate
      makeFrame({ timestampMs: 500, isVoiced: false }),
      makeFrame({ timestampMs: 1000, isVoiced: false }),
      makeFrame({ timestampMs: 1500, midiValue: 72 }),
      makeFrame({ timestampMs: 2500, isVoiced: false }),
      makeFrame({ timestampMs: 3500, isVoiced: false }),
      makeFrame({ timestampMs: 4000, midiValue: 80 }),
    ];
    const result = aggregiereFramesZuBalken(frames);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].startMs).toBeGreaterThan(result[i - 1].startMs);
    }
  });
});
