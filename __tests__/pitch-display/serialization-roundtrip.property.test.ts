/**
 * Property 2: Round-trip consistency
 *
 * Für alle gültigen PitchBalken-Arrays gilt:
 * `deserializePitchBalken(serializePitchBalken(balken))` erzeugt ein äquivalentes Array.
 *
 * **Validates: Requirement 8.4**
 */
// Feature: karaoke-pitch-display, Property 2: Round-trip consistency

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  serializePitchBalken,
  deserializePitchBalken,
  type PitchBalken,
} from "@/lib/pitch-display/pitch-balken";

// Generator: a single valid PitchBalken with consistent fields
const arbPitchBalken: fc.Arbitrary<PitchBalken> = fc
  .record({
    startMs: fc.integer({ min: 0, max: 600_000 }),
    midiValue: fc.double({ min: 21, max: 108, noNaN: true }),
    durationMs: fc.integer({ min: 0, max: 30_000 }),
  })
  .map(({ startMs, midiValue, durationMs }) => ({
    startMs,
    endMs: startMs + durationMs,
    midiValue,
    durationMs,
  }));

// Generator: array of valid PitchBalken, sorted by startMs
const arbPitchBalkenArray: fc.Arbitrary<PitchBalken[]> = fc
  .array(arbPitchBalken, { minLength: 0, maxLength: 100 })
  .map((balken) => balken.sort((a, b) => a.startMs - b.startMs));

describe("Property 2: Round-trip consistency", () => {
  it("deserializePitchBalken(serializePitchBalken(balken)) produces an equivalent array", () => {
    fc.assert(
      fc.property(arbPitchBalkenArray, (balken) => {
        const serialized = serializePitchBalken(balken);
        const deserialized = deserializePitchBalken(serialized);

        expect(deserialized).toHaveLength(balken.length);

        for (let i = 0; i < balken.length; i++) {
          expect(deserialized[i].startMs).toBe(balken[i].startMs);
          expect(deserialized[i].endMs).toBe(balken[i].endMs);
          expect(deserialized[i].midiValue).toBeCloseTo(
            balken[i].midiValue,
            10,
          );
          expect(deserialized[i].durationMs).toBe(balken[i].durationMs);
        }
      }),
      { numRuns: 200 },
    );
  });
});
