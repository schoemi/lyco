// Feature: gamification-progress, Property 3: Fortschrittsberechnung als arithmetisches Mittel
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneSongFortschritt } from "@/lib/gamification/song-progress";
import { berechneDurchschnitt } from "@/lib/gamification/durchschnitt";

/**
 * Property 3: Fortschrittsberechnung als arithmetisches Mittel mit ganzzahligem Ergebnis in [0, 100]
 *
 * Für jede nicht-leere Liste von Fortschrittswerten (jeweils ganze Zahlen in [0, 100]) gilt:
 * Das Ergebnis ist eine ganze Zahl im Bereich [0, 100] und entspricht dem gerundeten
 * arithmetischen Mittel der Eingabewerte. Für eine leere Liste wird 0 zurückgegeben.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3**
 */

const PBT_CONFIG = { numRuns: 100 };

/** Generator: non-empty array of integers in [0, 100] */
const arbFortschrittArray = () =>
  fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 50 });

/** Both functions under test share identical semantics, so we parameterise. */
const functions = [
  { name: "berechneSongFortschritt", fn: berechneSongFortschritt },
  { name: "berechneDurchschnitt", fn: berechneDurchschnitt },
] as const;

for (const { name, fn } of functions) {
  describe(`Property 3 – ${name}`, () => {
    it("empty array → returns 0", () => {
      fc.assert(
        fc.property(fc.constant([]), (arr: number[]) => {
          expect(fn(arr)).toBe(0);
        }),
        PBT_CONFIG
      );
    });

    it("non-empty array of integers in [0, 100] → result is an integer", () => {
      fc.assert(
        fc.property(arbFortschrittArray(), (arr) => {
          const result = fn(arr);
          expect(Number.isInteger(result)).toBe(true);
        }),
        PBT_CONFIG
      );
    });

    it("non-empty array of integers in [0, 100] → result is in [0, 100]", () => {
      fc.assert(
        fc.property(arbFortschrittArray(), (arr) => {
          const result = fn(arr);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }),
        PBT_CONFIG
      );
    });

    it("non-empty array of integers in [0, 100] → result equals Math.round(mean)", () => {
      fc.assert(
        fc.property(arbFortschrittArray(), (arr) => {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          const expected = Math.max(0, Math.min(100, Math.round(mean)));
          expect(fn(arr)).toBe(expected);
        }),
        PBT_CONFIG
      );
    });

    it("array of all same values → result equals that value", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (value, length) => {
            const arr = Array.from({ length }, () => value);
            expect(fn(arr)).toBe(value);
          }
        ),
        PBT_CONFIG
      );
    });

    it("single element array → result equals that element", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (value) => {
          expect(fn([value])).toBe(value);
        }),
        PBT_CONFIG
      );
    });
  });
}
