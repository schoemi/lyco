/**
 * Property 5: Pitch-Daten Serialisierung Round-Trip
 *
 * Für beliebige gültige PitchFrame[]-Arrays gilt:
 * `deserializePitchDaten(serializePitchDaten(frames))` erzeugt ein äquivalentes Array.
 *
 * **Validates: Requirements 12.3**
 */
// Feature: vocal-trainer, Property 5: Pitch-Daten Serialisierung Round-Trip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serializePitchDaten,
  deserializePitchDaten,
} from "@/lib/vocal-trainer/pitch-daten";
import type { PitchFrame } from "@/types/vocal-trainer";

// Helper: finite double that maps -0 to 0 (JSON.stringify loses the sign of -0)
const finiteDouble = fc
  .double({ noNaN: true, noDefaultInfinity: true })
  .map((v) => (Object.is(v, -0) ? 0 : v));

// Generator: arbitrary PitchFrame with finite numbers
const arbPitchFrame: fc.Arbitrary<PitchFrame> = fc.record({
  timestampMs: finiteDouble,
  f0Hz: finiteDouble,
  midiValue: finiteDouble,
  isVoiced: fc.boolean(),
  confidence: finiteDouble,
});

describe("Property 5: Pitch-Daten Serialisierung Round-Trip", () => {
  it("deserializePitchDaten(serializePitchDaten(frames)) produces an equivalent array", () => {
    fc.assert(
      fc.property(fc.array(arbPitchFrame, { minLength: 0, maxLength: 20 }), (frames) => {
        const serialized = serializePitchDaten(frames);
        const deserialized = deserializePitchDaten(serialized);

        expect(deserialized).toEqual(frames);
      }),
      { numRuns: 100 },
    );
  });
});
