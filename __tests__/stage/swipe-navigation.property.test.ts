// Feature: lyco-stage, Property 3: Swipe-Navigationsrichtung
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { computeSwipeDirection } from "@/app/stage/[songId]/page";

/**
 * Property 3: Swipe-Navigationsrichtung
 *
 * Für jede vertikale Swipe-Geste mit einem Abstand über dem Schwellwert soll die
 * Richtung die Navigation bestimmen:
 * - deltaY > threshold → "next" (Swipe nach oben)
 * - deltaY < -threshold → "prev" (Swipe nach unten)
 * - |deltaY| <= threshold → null (kein Swipe)
 *
 * **Validates: Requirements 10.1, 10.2**
 */

const SWIPE_THRESHOLD = 30;
const PBT_CONFIG = { numRuns: 100 };

describe("Property 3 – Swipe-Navigationsrichtung", () => {
  it("deltaY > threshold → 'next'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: SWIPE_THRESHOLD + 1, max: 10000 }),
        (deltaY) => {
          expect(computeSwipeDirection(deltaY)).toBe("next");
        },
      ),
      PBT_CONFIG,
    );
  });

  it("deltaY < -threshold → 'prev'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: -(SWIPE_THRESHOLD + 1) }),
        (deltaY) => {
          expect(computeSwipeDirection(deltaY)).toBe("prev");
        },
      ),
      PBT_CONFIG,
    );
  });

  it("|deltaY| <= threshold → null (kein Swipe)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -SWIPE_THRESHOLD, max: SWIPE_THRESHOLD }),
        (deltaY) => {
          expect(computeSwipeDirection(deltaY)).toBeNull();
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Rückgabewert ist immer 'next', 'prev' oder null", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: 10000 }),
        (deltaY) => {
          const result = computeSwipeDirection(deltaY);
          expect(["next", "prev", null]).toContain(result);
        },
      ),
      PBT_CONFIG,
    );
  });
});
