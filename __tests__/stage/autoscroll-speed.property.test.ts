// Feature: lyco-stage, Property 19: Auto-Scroll-Geschwindigkeit
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeAutoScrollInterval } from "@/app/stage/[songId]/page";

/**
 * Property 19: Auto-Scroll-Geschwindigkeit
 *
 * Für jede konfigurierte Scroll-Geschwindigkeit (1–10 Sekunden) soll
 * computeAutoScrollInterval(speed) den Wert speed * 1000 (ms) zurückgeben.
 *
 * **Validates: Requirement 7.2**
 */

const PBT_CONFIG = { numRuns: 100 };

describe("Property 19 – Auto-Scroll-Geschwindigkeit", () => {
  it("computeAutoScrollInterval(speed) === speed * 1000 für alle gültigen Geschwindigkeiten", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (speed) => {
          expect(computeAutoScrollInterval(speed)).toBe(speed * 1000);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Intervall ist immer positiv für positive Geschwindigkeiten", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (speed) => {
          expect(computeAutoScrollInterval(speed)).toBeGreaterThan(0);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Intervall wächst monoton mit der Geschwindigkeit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }).chain((speed) =>
          fc.integer({ min: speed + 1, max: 10 }).map((faster) => ({ speed, faster })),
        ),
        ({ speed, faster }) => {
          expect(computeAutoScrollInterval(faster)).toBeGreaterThan(
            computeAutoScrollInterval(speed),
          );
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Intervall liegt immer zwischen 1000ms und 10000ms für gültige Eingaben", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (speed) => {
          const interval = computeAutoScrollInterval(speed);
          expect(interval).toBeGreaterThanOrEqual(1000);
          expect(interval).toBeLessThanOrEqual(10000);
        },
      ),
      PBT_CONFIG,
    );
  });
});
