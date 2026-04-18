/**
 * Property 1: Aggregation count invariant
 *
 * Für alle gültigen ReferenzDaten gilt: die Anzahl der erzeugten PitchBalken
 * ist kleiner oder gleich der Anzahl zusammenhängender stimmaktiver Segmente
 * in den Eingabe-Frames.
 *
 * **Validates: Requirement 1.6**
 */
// Feature: karaoke-pitch-display, Property 1: Aggregation count invariant

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { aggregiereFramesZuBalken } from "@/lib/pitch-display/pitch-balken";
import type { ReferenzFrame } from "@/types/vocal-trainer";

// Generator: a single ReferenzFrame with arbitrary but valid values
const arbReferenzFrame = (index: number): fc.Arbitrary<ReferenzFrame> =>
  fc
    .record({
      isVoiced: fc.boolean(),
      f0Hz: fc.double({ min: 50, max: 1500, noNaN: true }),
      midiValue: fc.double({ min: 21, max: 108, noNaN: true }),
      isOnset: fc.boolean(),
    })
    .map((partial) => ({
      ...partial,
      timestampMs: index * 10, // 10ms frame spacing (typical for pitch analysis)
    }));

// Generator: array of ReferenzFrames with sequential timestamps
const arbReferenzFrames: fc.Arbitrary<ReferenzFrame[]> = fc
  .integer({ min: 0, max: 200 })
  .chain((length) =>
    length === 0
      ? fc.constant([])
      : fc.tuple(...Array.from({ length }, (_, i) => arbReferenzFrame(i))).map(
          (frames) => frames,
        ),
  );

/**
 * Counts the number of contiguous voiced segments in a frame array.
 * A contiguous voiced segment is a maximal run of consecutive frames
 * where `isVoiced === true`.
 */
function countContiguousVoicedSegments(frames: ReferenzFrame[]): number {
  let count = 0;
  let inSegment = false;

  for (const frame of frames) {
    if (frame.isVoiced) {
      if (!inSegment) {
        count++;
        inSegment = true;
      }
    } else {
      inSegment = false;
    }
  }

  return count;
}

describe("Property 1: Aggregation count invariant", () => {
  it("number of PitchBalken ≤ number of contiguous voiced segments", () => {
    fc.assert(
      fc.property(arbReferenzFrames, (frames) => {
        const balken = aggregiereFramesZuBalken(frames);
        const voicedSegments = countContiguousVoicedSegments(frames);

        expect(balken.length).toBeLessThanOrEqual(voicedSegments);
      }),
      { numRuns: 200 },
    );
  });
});
