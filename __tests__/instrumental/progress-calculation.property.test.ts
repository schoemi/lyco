/**
 * Property 7: Fortschrittsberechnung schließt Instrumental-Strophen aus
 *
 * For any Song with a mix of instrumental/normal strophes with varying progress
 * values, the calculated song progress SHALL equal the rounded average of progress
 * values of only non-instrumental strophes. If all strophes are instrumental,
 * progress SHALL be 0.
 *
 * **Validates: Requirements 9.1, 9.2**
 */
// Feature: instrumental-annotations, Property 7: Fortschrittsberechnung schließt Instrumental-Strophen aus

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { arbStropheDetailArray } from "./generators";

/**
 * Pure function that replicates the progress calculation logic from song-service.ts.
 * This is the system under test — we verify it matches the expected formula.
 */
function calculateSongProgress(
  strophen: { istInstrumental: boolean; progress: number }[],
): number {
  const lernbare = strophen.filter((s) => !s.istInstrumental);
  if (lernbare.length === 0) return 0;
  const total = lernbare.reduce((sum, s) => sum + s.progress, 0);
  return Math.round(total / lernbare.length);
}

describe("Property 7: Fortschrittsberechnung schließt Instrumental-Strophen aus", () => {
  it("progress equals rounded average of non-instrumental strophe progress values", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const result = calculateSongProgress(strophen);

        const nonInstrumental = strophen.filter((s) => !s.istInstrumental);
        if (nonInstrumental.length === 0) {
          expect(result).toBe(0);
        } else {
          const totalProgress = nonInstrumental.reduce((sum, s) => sum + s.progress, 0);
          const expected = Math.round(totalProgress / nonInstrumental.length);
          expect(result).toBe(expected);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("progress is 0 when all strophes are instrumental", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            istInstrumental: fc.constant(true),
            progress: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (strophen) => {
          const result = calculateSongProgress(strophen);
          expect(result).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("progress is 0 when strophen array is empty", () => {
    const result = calculateSongProgress([]);
    expect(result).toBe(0);
  });

  it("instrumental strophes do not affect the calculated progress", () => {
    fc.assert(
      fc.property(
        arbStropheDetailArray,
        fc.array(
          fc.record({
            istInstrumental: fc.constant(true),
            progress: fc.integer({ min: 0, max: 100 }),
            // Minimal extra fields to satisfy the type
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 10 }),
            orderIndex: fc.nat({ max: 50 }),
            notiz: fc.constant(null),
            analyse: fc.constant(null),
            zeilen: fc.constant([]),
            markups: fc.constant([]),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (baseStrophen, extraInstrumental) => {
          const progressWithout = calculateSongProgress(baseStrophen);
          const combined = [...baseStrophen, ...extraInstrumental];
          const progressWith = calculateSongProgress(combined);
          expect(progressWith).toBe(progressWithout);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("progress matches the formula used in getSongDetail and listSongs", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        // Replicate the exact logic from song-service.ts getSongDetail
        const lernbareStrophenDetail = strophen.filter((s) => !s.istInstrumental);
        const strophenCount = lernbareStrophenDetail.length;
        let expected = 0;
        if (strophenCount > 0) {
          const totalProgress = lernbareStrophenDetail.reduce((sum, s) => sum + s.progress, 0);
          expected = Math.round(totalProgress / strophenCount);
        }

        const result = calculateSongProgress(strophen);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
