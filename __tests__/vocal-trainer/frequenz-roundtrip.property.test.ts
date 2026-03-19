/**
 * Property-Tests: Frequenz-Konvertierung Round-Trip
 *
 * Property 1: hzToMidi/midiToHz Round-Trip – Für beliebige Frequenzen im Bereich
 *   50–1000 Hz gilt: midiToHz(hzToMidi(hz)) ≈ hz (Toleranz < 0.01 Hz)
 * Property 2: centsDiff Symmetrie – centsDiff(a, b) === -centsDiff(b, a)
 *   für beliebige positive Frequenzen
 * Property 3: centsDiff Halbton – centsDiff(hz, hz * 2^(1/12)) ≈ -100
 *   (ein Halbton = 100 Cents)
 *
 * **Validates: Requirements 6.6**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  hzToMidi,
  midiToHz,
  centsDiff,
} from "@/lib/vocal-trainer/frequenz-utils";

// Generator: frequencies in the human vocal range 50–1000 Hz
const frequencyHz = fc.double({ min: 50, max: 1000, noNaN: true });

// Generator: positive frequencies for centsDiff (avoid near-zero for log stability)
const positiveHz = fc.double({ min: 1, max: 10000, noNaN: true });

describe("Property 1: hzToMidi/midiToHz Round-Trip", () => {
  it("midiToHz(hzToMidi(hz)) ≈ hz for frequencies in 50–1000 Hz", () => {
    fc.assert(
      fc.property(frequencyHz, (hz) => {
        const roundTripped = midiToHz(hzToMidi(hz));
        expect(roundTripped).toBeCloseTo(hz, 2); // tolerance < 0.01 Hz
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 2: centsDiff Symmetrie", () => {
  it("centsDiff(a, b) === -centsDiff(b, a) for arbitrary positive frequencies", () => {
    fc.assert(
      fc.property(positiveHz, positiveHz, (a, b) => {
        const ab = centsDiff(a, b);
        const ba = centsDiff(b, a);
        expect(ab).toBeCloseTo(-ba, 8);
      }),
      { numRuns: 200 },
    );
  });
});

describe("Property 3: centsDiff Halbton", () => {
  it("centsDiff(hz, hz * 2^(1/12)) ≈ -100 (one semitone = 100 cents)", () => {
    fc.assert(
      fc.property(frequencyHz, (hz) => {
        const semitoneUp = hz * Math.pow(2, 1 / 12);
        const diff = centsDiff(hz, semitoneUp);
        expect(diff).toBeCloseTo(-100, 5);
      }),
      { numRuns: 200 },
    );
  });
});
