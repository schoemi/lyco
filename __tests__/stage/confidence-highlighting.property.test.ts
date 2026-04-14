// Feature: lyco-stage, Property 1: Confidence-Highlighting-Farbzuordnung
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getConfidenceColor,
  CONFIDENCE_COLORS,
} from "@/lib/stage/use-confidence-highlighting";

/**
 * Property 1: Confidence-Highlighting-Farbzuordnung
 *
 * Für jede Strophe mit einem beliebigen Confidence-Score (0–100 oder undefiniert)
 * und beliebigen konfigurierbaren Schwellwerten (low, high) soll `getConfidenceColor`
 * folgende Farbe zurückgeben:
 * - Score < low → #F5A623 (Amber)
 * - low ≤ Score ≤ high → #AAAAAA (Gedimmt)
 * - Score > high → #FFFFFF (Weiß)
 * - Kein Score (undefined) → #FFFFFF (Weiß)
 * - Highlighting deaktiviert → #FFFFFF (Weiß) unabhängig vom Score
 *
 * **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
 */

const PBT_CONFIG = { numRuns: 100 };

describe("Property 1 – Confidence-Highlighting-Farbzuordnung", () => {
  it("Highlighting deaktiviert → immer #FFFFFF, unabhängig vom Score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (score, low, high) => {
          const result = getConfidenceColor(score, { low, high }, false);
          expect(result).toBe(CONFIDENCE_COLORS.normal);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Kein Score (undefined) → #FFFFFF", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (low, high, enabled) => {
          const result = getConfidenceColor(undefined, { low, high }, enabled);
          expect(result).toBe(CONFIDENCE_COLORS.normal);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Score > high → #FFFFFF (Weiß/normal)", () => {
    fc.assert(
      fc.property(
        // high must be < 100 so there's room for score > high
        fc.integer({ min: 0, max: 99 }).chain((high) =>
          fc.integer({ min: 0, max: high }).chain((low) =>
            fc.integer({ min: high + 1, max: 100 }).map((score) => ({ low, high, score })),
          ),
        ),
        ({ low, high, score }) => {
          const result = getConfidenceColor(score, { low, high }, true);
          expect(result).toBe(CONFIDENCE_COLORS.normal);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("low ≤ Score ≤ high → #AAAAAA (Gedimmt)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }).chain((low) =>
          fc.integer({ min: low, max: 100 }).chain((high) =>
            fc.integer({ min: low, max: high }).map((score) => ({ low, high, score })),
          ),
        ),
        ({ low, high, score }) => {
          const result = getConfidenceColor(score, { low, high }, true);
          expect(result).toBe(CONFIDENCE_COLORS.dimmed);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Score < low → #F5A623 (Amber/Orange)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }).chain((low) =>
          fc.integer({ min: low, max: 100 }).chain((high) =>
            fc.integer({ min: 0, max: low - 1 }).map((score) => ({ low, high, score })),
          ),
        ),
        ({ low, high, score }) => {
          const result = getConfidenceColor(score, { low, high }, true);
          expect(result).toBe(CONFIDENCE_COLORS.amber);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Rückgabewert ist immer eine der drei gültigen Farben", () => {
    const validColors = Object.values(CONFIDENCE_COLORS);
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (score, low, high, enabled) => {
          const result = getConfidenceColor(score, { low, high }, enabled);
          expect(validColors).toContain(result);
        },
      ),
      PBT_CONFIG,
    );
  });
});
