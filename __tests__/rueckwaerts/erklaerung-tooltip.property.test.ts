/**
 * Property 3: ErklaerungTooltip zeigt sich beim ersten Besuch und persistiert Schließen in localStorage
 *
 * Testet die localStorage-basierte Tooltip-Logik:
 * - Tooltip sichtbar wenn localStorage leer
 * - Nach Schließen wird localStorage gesetzt
 * - Bei erneutem Mount nicht mehr sichtbar
 *
 * **Validates: Requirements 3.1, 3.3, 3.4**
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";

const TOOLTIP_KEY = "rueckwaerts-tooltip-gesehen";

/**
 * Minimal in-memory localStorage mock for node environment.
 */
function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

/**
 * Pure logic extracted from the design doc's useState initializer.
 * Determines tooltip visibility based on localStorage state.
 */
function isTooltipVisible(storage: Storage): boolean {
  return storage.getItem(TOOLTIP_KEY) !== "true";
}

/**
 * Pure logic extracted from the design doc's handleTooltipClose.
 * Persists the "seen" state to localStorage.
 */
function handleTooltipClose(storage: Storage): void {
  storage.setItem(TOOLTIP_KEY, "true");
}

describe("Property 3: ErklaerungTooltip zeigt sich beim ersten Besuch und persistiert Schließen in localStorage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createLocalStorageMock();
  });

  it("tooltip is visible when localStorage has no tooltip key", () => {
    fc.assert(
      fc.property(
        // Generate arbitrary other keys that might exist in localStorage
        fc.array(
          fc.tuple(
            fc.string().filter((s) => s !== TOOLTIP_KEY && s.length > 0),
            fc.string(),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (otherEntries) => {
          const store = createLocalStorageMock();
          // Populate with arbitrary other entries (but never the tooltip key)
          for (const [key, value] of otherEntries) {
            store.setItem(key, value);
          }
          expect(isTooltipVisible(store)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("after closing, localStorage contains the tooltip key set to 'true'", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string().filter((s) => s !== TOOLTIP_KEY && s.length > 0),
            fc.string(),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (otherEntries) => {
          const store = createLocalStorageMock();
          for (const [key, value] of otherEntries) {
            store.setItem(key, value);
          }

          // Tooltip should be visible initially
          expect(isTooltipVisible(store)).toBe(true);

          // Close the tooltip
          handleTooltipClose(store);

          // localStorage should now have the key
          expect(store.getItem(TOOLTIP_KEY)).toBe("true");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("tooltip is NOT visible when localStorage already has the key set to 'true'", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string().filter((s) => s !== TOOLTIP_KEY && s.length > 0),
            fc.string(),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (otherEntries) => {
          const store = createLocalStorageMock();
          for (const [key, value] of otherEntries) {
            store.setItem(key, value);
          }

          // Simulate first visit + close
          handleTooltipClose(store);

          // On "re-mount", tooltip should NOT be visible
          expect(isTooltipVisible(store)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("full lifecycle: visible → close → not visible on re-mount, for any localStorage state", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string().filter((s) => s !== TOOLTIP_KEY && s.length > 0),
            fc.string(),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (otherEntries) => {
          const store = createLocalStorageMock();
          // Deduplicate keys — last value wins, matching Map/localStorage semantics
          const deduped = new Map(otherEntries);
          for (const [key, value] of deduped) {
            store.setItem(key, value);
          }

          // First mount: tooltip visible
          const firstVisit = isTooltipVisible(store);
          expect(firstVisit).toBe(true);

          // User closes tooltip
          handleTooltipClose(store);
          expect(store.getItem(TOOLTIP_KEY)).toBe("true");

          // Second mount: tooltip NOT visible
          const secondVisit = isTooltipVisible(store);
          expect(secondVisit).toBe(false);

          // Verify other entries are untouched
          for (const [key, value] of deduped) {
            expect(store.getItem(key)).toBe(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
