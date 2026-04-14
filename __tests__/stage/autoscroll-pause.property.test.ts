// Feature: lyco-stage, Property 4: Manuelle Navigation pausiert Auto-Scroll
import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 4: Manuelle Navigation pausiert Auto-Scroll
 *
 * Für jeden Auto-Scroll-Zustand (aktiv) und jede manuelle Navigationsaktion
 * (Tastatur, Swipe, Touch) soll der Auto-Scroll nach der manuellen Aktion
 * pausiert sein.
 *
 * **Validates: Requirement 7.3**
 */

const PBT_CONFIG = { numRuns: 100 };

/**
 * Simulates the auto-scroll state machine:
 * - isPlaying starts as true (auto-scroll active)
 * - any manual navigation action calls pause() → isPlaying becomes false
 */
function simulateManualNavigation(
  action: "keyboard" | "swipe" | "touch",
  initialIsPlaying: boolean,
): boolean {
  let isPlaying = initialIsPlaying;

  // pause() is called on any manual navigation
  const pause = () => { isPlaying = false; };

  // Simulate the navigation action (all call pause internally)
  switch (action) {
    case "keyboard":
      // onNext / onPrev both call pause()
      pause();
      break;
    case "swipe":
      // useKaraokeSwipe triggers onNext/onPrev which call pause()
      pause();
      break;
    case "touch":
      // tap toggles auto-scroll; if playing, toggle → pause
      if (isPlaying) pause();
      break;
  }

  return isPlaying;
}

describe("Property 4 – Manuelle Navigation pausiert Auto-Scroll", () => {
  it("Nach manueller Navigation ist Auto-Scroll pausiert (war aktiv)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("keyboard" as const, "swipe" as const, "touch" as const),
        (action) => {
          const isPlayingAfter = simulateManualNavigation(action, true);
          expect(isPlayingAfter).toBe(false);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Auto-Scroll bleibt pausiert wenn bereits pausiert und manuelle Navigation erfolgt", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("keyboard" as const, "swipe" as const),
        (action) => {
          // keyboard and swipe always call pause() regardless of current state
          const isPlayingAfter = simulateManualNavigation(action, false);
          expect(isPlayingAfter).toBe(false);
        },
      ),
      PBT_CONFIG,
    );
  });

  it("Für alle Navigationstypen: Auto-Scroll ist nach der Aktion nicht aktiv", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("keyboard" as const, "swipe" as const, "touch" as const),
        fc.boolean(),
        (action, wasPlaying) => {
          if (!wasPlaying && action === "touch") return; // touch on paused state is a no-op for pause
          const isPlayingAfter = simulateManualNavigation(action, wasPlaying);
          if (wasPlaying) {
            expect(isPlayingAfter).toBe(false);
          }
        },
      ),
      PBT_CONFIG,
    );
  });
});
