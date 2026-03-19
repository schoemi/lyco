/**
 * Property 4: Referenz-Daten Serialisierung Round-Trip
 *
 * Für beliebige gültige ReferenzDaten-Objekte gilt:
 * `deserializeReferenzDaten(serializeReferenzDaten(data))` erzeugt ein äquivalentes Objekt.
 *
 * **Validates: Requirements 11.4**
 */
// Feature: vocal-trainer, Property 4: Referenz-Daten Serialisierung Round-Trip

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serializeReferenzDaten,
  deserializeReferenzDaten,
} from "@/lib/vocal-trainer/referenz-daten";
import type { ReferenzFrame, ReferenzDaten } from "@/types/vocal-trainer";

// Helper: finite double that maps -0 to 0 (JSON.stringify loses the sign of -0)
const finiteDouble = fc
  .double({ noNaN: true, noDefaultInfinity: true })
  .map((v) => (Object.is(v, -0) ? 0 : v));

// Generator: arbitrary ReferenzFrame with finite numbers
const arbReferenzFrame: fc.Arbitrary<ReferenzFrame> = fc.record({
  timestampMs: finiteDouble,
  f0Hz: finiteDouble,
  midiValue: finiteDouble,
  isVoiced: fc.boolean(),
  isOnset: fc.boolean(),
});

// Generator: arbitrary ReferenzDaten with finite numbers and valid frames
const arbReferenzDaten: fc.Arbitrary<ReferenzDaten> = fc.record({
  songId: fc.string({ minLength: 1 }),
  sampleRate: fc.double({ noNaN: true, noDefaultInfinity: true, min: 1 }).map((v) => (Object.is(v, -0) ? 0 : v)),
  windowSize: fc.integer({ min: 1 }),
  frames: fc.array(arbReferenzFrame, { minLength: 0, maxLength: 20 }),
});

describe("Property 4: Referenz-Daten Serialisierung Round-Trip", () => {
  it("deserializeReferenzDaten(serializeReferenzDaten(data)) produces an equivalent object", () => {
    fc.assert(
      fc.property(arbReferenzDaten, (data) => {
        const serialized = serializeReferenzDaten(data);
        const deserialized = deserializeReferenzDaten(serialized);

        expect(deserialized).toEqual(data);
      }),
      { numRuns: 100 },
    );
  });
});
